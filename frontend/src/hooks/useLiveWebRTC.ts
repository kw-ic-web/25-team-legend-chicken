import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { getBaseUrl } from "../api/auth/client";

type UserRole = "professor" | "student";

export type RemoteParticipant = {
  socketId: string;
  stream: MediaStream;
  role?: UserRole;
  userId?: string;
};

export type WebRTCStatus = "idle" | "connecting" | "connected" | "error";

type UseLiveWebRTCOptions = {
  lectureId?: string;
  classId?: number;
  liveId?: number | null;
  role: UserRole;
  userId?: string;
  localStreams?: Array<MediaStream | null | undefined>;
  enabled?: boolean;
  autoInitiate?: boolean;
};

type LiveUserPayload = {
  socket_id: string;
  lecture_id?: string;
  class_id?: number;
  live_id?: number;
  role?: UserRole;
  user_id?: string;
};

type WebRTCSignalPayload = {
  from: string;
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
  meta?: Record<string, unknown>;
};

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
];

const toNumberOrNull = (value?: number | string | null): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export function useLiveWebRTC({
  lectureId,
  classId,
  liveId,
  role,
  userId,
  localStreams = [],
  enabled = true,
  autoInitiate,
}: UseLiveWebRTCOptions) {
  const [status, setStatus] = useState<WebRTCStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [socketId, setSocketId] = useState<string | null>(null);
  const [remoteParticipants, setRemoteParticipants] = useState<
    RemoteParticipant[]
  >([]);

  const socketRef = useRef<Socket | null>(null);
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const remoteStreamRef = useRef<Map<string, MediaStream[]>>(new Map()); // 여러 스트림 저장
  const metadataRef = useRef<Map<string, { role?: UserRole; userId?: string }>>(
    new Map()
  );
  const makingOfferRef = useRef<Map<string, boolean>>(new Map());
  const localStreamsRef = useRef<MediaStream[]>(
    localStreams.filter((stream): stream is MediaStream => !!stream)
  );

  const shouldInitiate = autoInitiate ?? role === "professor";

  const activeLocalStreams = useMemo(
    () => localStreams.filter((stream): stream is MediaStream => !!stream),
    [localStreams]
  );

  const normalizedClassId = toNumberOrNull(classId);
  const normalizedLiveId = toNumberOrNull(liveId ?? null);
  const canConnect =
    enabled &&
    Boolean(lectureId) &&
    normalizedClassId !== null &&
    typeof role === "string";

  const updateRemoteParticipants = useCallback(() => {
    const participants: RemoteParticipant[] = [];
    Array.from(remoteStreamRef.current.entries()).forEach(([id, streams]) => {
      const meta = metadataRef.current.get(id);
      console.log("[WebRTC] updateRemoteParticipants: socketId:", id, "metadata:", meta, "streams count:", streams.length);
      // 각 스트림을 별도의 participant로 추가
      streams.forEach((stream) => {
        participants.push({
          socketId: id,
          stream,
          role: meta?.role,
          userId: meta?.userId,
        });
      });
    });
    console.log("[WebRTC] updateRemoteParticipants: 총 participants 수:", participants.length);
    setRemoteParticipants(participants);
  }, []);

  const detachPeer = useCallback(
    (remoteSocketId: string) => {
      const peer = peersRef.current.get(remoteSocketId);
      if (peer) {
        try {
          peer.ontrack = null;
          peer.onicecandidate = null;
          peer.onconnectionstatechange = null;
          peer.close();
        } catch (closeError) {
          console.warn("[WebRTC] peer close error", closeError);
        }
        peersRef.current.delete(remoteSocketId);
      }
      // 모든 스트림 정리
      const streams = remoteStreamRef.current.get(remoteSocketId) || [];
      streams.forEach(stream => {
        stream.getTracks().forEach(track => track.stop());
      });
      remoteStreamRef.current.delete(remoteSocketId);
      metadataRef.current.delete(remoteSocketId);
      makingOfferRef.current.delete(remoteSocketId);
      updateRemoteParticipants();
    },
    [updateRemoteParticipants]
  );

  const syncLocalTracks = useCallback((peer: RTCPeerConnection) => {
    const streams = localStreamsRef.current;
    const desiredTracks = streams.flatMap((stream) => stream.getTracks());
    const senders = peer.getSenders();

    // Remove senders that are no longer present
    senders.forEach((sender) => {
      if (!sender.track) return;
      const stillExists = desiredTracks.some(
        (track) => track.id === sender.track?.id
      );
      if (!stillExists) {
        peer.removeTrack(sender);
      }
    });

    // Add new tracks
    desiredTracks.forEach((track) => {
      const alreadyAdded = senders.some(
        (sender) => sender.track?.id === track.id
      );
      if (alreadyAdded) return;
      const ownerStream = streams.find((stream) =>
        stream.getTracks().some((streamTrack) => streamTrack.id === track.id)
      );
      if (ownerStream) {
        peer.addTrack(track, ownerStream);
      }
    });
  }, []);

  const sendOffer = useCallback(
    async (remoteSocketId: string) => {
      if (!shouldInitiate) return;
      const socket = socketRef.current;
      const peer = peersRef.current.get(remoteSocketId);
      if (!socket || !peer) return;
      if (makingOfferRef.current.get(remoteSocketId)) return;

      // Signaling state 확인: offer는 "stable" 상태에서만 생성 가능
      const currentState = peer.signalingState;
      if (currentState === "closed") {
        console.warn("[WebRTC] sendOffer: peer is closed");
        return;
      }
      
      // 이미 offer를 보낸 상태이거나, answer를 기다리는 상태면 무시
      if (currentState === "have-local-offer" || currentState === "have-remote-offer") {
        console.warn(`[WebRTC] sendOffer: already in ${currentState} state, ignoring`);
        return;
      }

      makingOfferRef.current.set(remoteSocketId, true);
      try {
        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);
        socket.emit("webrtc:offer", {
          to: remoteSocketId,
          sdp: offer,
          meta: {
            lecture_id: lectureId,
            class_id: normalizedClassId,
            live_id: normalizedLiveId,
            role,
          },
        });
      } catch (offerError) {
        console.error("[WebRTC] offer error", offerError);
        // InvalidStateError는 이미 처리된 경우이므로 무시
        if (
          offerError instanceof Error &&
          offerError.name === "InvalidStateError"
        ) {
          console.warn("[WebRTC] sendOffer: InvalidStateError (likely already set)");
          return;
        }
        setError(
          offerError instanceof Error
            ? offerError.message
            : "오퍼 생성 중 오류가 발생했어요."
        );
        setStatus("error");
      } finally {
        makingOfferRef.current.set(remoteSocketId, false);
      }
    },
    [lectureId, normalizedClassId, normalizedLiveId, role, shouldInitiate]
  );

  const ensurePeerConnection = useCallback(
    (remoteSocketId: string) => {
      let peer = peersRef.current.get(remoteSocketId);
      if (peer) return peer;

      peer = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      peersRef.current.set(remoteSocketId, peer);
      syncLocalTracks(peer);

      peer.ontrack = (event) => {
        console.log("[WebRTC] ontrack event received from", remoteSocketId, event);
        const [stream] = event.streams;
        if (!stream) {
          console.warn("[WebRTC] ontrack: no stream in event");
          return;
        }
        console.log("[WebRTC] ontrack: stream found, tracks:", stream.getTracks().map(t => ({ kind: t.kind, enabled: t.enabled, readyState: t.readyState, label: t.label })));
        console.log("[WebRTC] ontrack: current metadata for", remoteSocketId, ":", metadataRef.current.get(remoteSocketId));
        
        // 여러 스트림 저장 (카메라와 화면 공유를 모두 저장)
        const existingStreams = remoteStreamRef.current.get(remoteSocketId) || [];
        // 중복 스트림 체크 (stream ID로)
        const streamId = stream.id;
        if (!existingStreams.some(s => s.id === streamId)) {
          console.log("[WebRTC] ontrack: 새 스트림 추가:", streamId, "기존 스트림 수:", existingStreams.length);
          existingStreams.push(stream);
          remoteStreamRef.current.set(remoteSocketId, existingStreams);
          updateRemoteParticipants();
          console.log("[WebRTC] ontrack: 스트림 추가 후 metadata:", metadataRef.current.get(remoteSocketId));
        } else {
          console.log("[WebRTC] ontrack: 중복 스트림 무시:", streamId);
        }
      };

      peer.onicecandidate = (event) => {
        if (event.candidate && socketRef.current) {
          socketRef.current.emit("webrtc:ice-candidate", {
            to: remoteSocketId,
            candidate: event.candidate,
            meta: {
              lecture_id: lectureId,
              class_id: normalizedClassId,
              live_id: normalizedLiveId,
              role,
            },
          });
        }
      };

      peer.onconnectionstatechange = () => {
        if (peer?.connectionState === "failed") {
          detachPeer(remoteSocketId);
        }
      };

      peer.onnegotiationneeded = () => {
        void sendOffer(remoteSocketId);
      };

      return peer;
    },
    [
      lectureId,
      role,
      normalizedClassId,
      normalizedLiveId,
      detachPeer,
      sendOffer,
      syncLocalTracks,
      updateRemoteParticipants,
    ]
  );

  const handleRemoteJoin = useCallback(
    (payload: LiveUserPayload) => {
      if (!socketRef.current) return;
      if (payload.socket_id === socketRef.current.id) return;
      if (!payload.socket_id) return;

      console.log("[WebRTC] handleRemoteJoin: user joined", payload);
      metadataRef.current.set(payload.socket_id, {
        role: payload.role,
        userId: payload.user_id,
      });
      console.log("[WebRTC] handleRemoteJoin: metadata set", { socketId: payload.socket_id, role: payload.role, userId: payload.user_id });
      updateRemoteParticipants();

      ensurePeerConnection(payload.socket_id);
      if (shouldInitiate) {
        void sendOffer(payload.socket_id);
      }
    },
    [ensurePeerConnection, sendOffer, shouldInitiate, updateRemoteParticipants]
  );

  const handleOffer = useCallback(
    async ({ from, sdp }: WebRTCSignalPayload) => {
      if (!from || !sdp) {
        console.warn("[WebRTC] handleOffer: missing from or sdp", { from, hasSdp: !!sdp });
        return;
      }
      
      console.log("[WebRTC] handleOffer: received offer from", from);
      const peer = ensurePeerConnection(from);
      
      try {
        // Signaling state 확인: offer는 "stable" 또는 "have-local-offer" 상태에서 설정 가능
        const currentState = peer.signalingState;
        console.log("[WebRTC] handleOffer: current signaling state", currentState);
        
        if (currentState === "closed") {
          console.warn("[WebRTC] handleOffer: peer is closed");
          return;
        }
        
        // 이미 remote description이 설정된 경우 확인
        if (currentState === "have-remote-offer") {
          console.warn("[WebRTC] handleOffer: already have remote offer, ignoring");
          return;
        }
        
        // stable 상태에서 remoteDescription이 있으면 이미 처리된 것
        if (currentState === "stable" && peer.remoteDescription) {
          console.warn("[WebRTC] handleOffer: already stable with remote description, ignoring");
          return;
        }
        
        // stable 상태지만 remoteDescription이 없으면 새로 설정
        console.log("[WebRTC] handleOffer: setting remote description");
        await peer.setRemoteDescription(new RTCSessionDescription(sdp));
        console.log("[WebRTC] handleOffer: remote description set, creating answer");
        
        const answer = await peer.createAnswer();
        console.log("[WebRTC] handleOffer: answer created, setting local description");
        await peer.setLocalDescription(answer);
        
        console.log("[WebRTC] handleOffer: sending answer to", from);
        socketRef.current?.emit("webrtc:answer", {
          to: from,
          sdp: answer,
          meta: {
            lecture_id: lectureId,
            class_id: normalizedClassId,
            live_id: normalizedLiveId,
            role,
          },
        });
        console.log("[WebRTC] handleOffer: answer sent, setting status to connected");
        setStatus("connected");
      } catch (offerError) {
        console.error("[WebRTC] handle offer error", offerError);
        // InvalidStateError는 이미 처리된 경우이므로 무시
        if (
          offerError instanceof Error &&
          offerError.name === "InvalidStateError"
        ) {
          console.warn("[WebRTC] handleOffer: InvalidStateError (likely already set)");
          return;
        }
        setError(
          offerError instanceof Error
            ? offerError.message
            : "원격 오퍼 처리 중 문제가 발생했어요."
        );
        setStatus("error");
      }
    },
    [ensurePeerConnection, lectureId, normalizedClassId, normalizedLiveId, role]
  );

  const handleAnswer = useCallback(
    async ({ from, sdp }: WebRTCSignalPayload) => {
      if (!from || !sdp) return;
      const peer = peersRef.current.get(from);
      if (!peer) {
        console.warn("[WebRTC] handleAnswer: peer not found for", from);
        return;
      }
      
      try {
        // Signaling state 확인: answer는 "have-local-offer" 상태에서만 설정 가능
        const currentState = peer.signalingState;
        if (currentState === "closed") {
          console.warn("[WebRTC] handleAnswer: peer is closed");
          return;
        }
        
        if (currentState !== "have-local-offer") {
          console.warn(
            `[WebRTC] handleAnswer: wrong signaling state ${currentState}, expected have-local-offer`
          );
          // 이미 answer가 설정되었거나, offer가 없는 상태
          // 이 경우 무시하거나 재연결 시도
          if (currentState === "stable") {
            // 이미 완료된 상태이므로 무시
            return;
          }
          // 다른 상태면 잠시 대기 후 재시도 (race condition 대응)
          await new Promise((resolve) => setTimeout(resolve, 100));
          if (peer.signalingState === "have-local-offer") {
            await peer.setRemoteDescription(new RTCSessionDescription(sdp));
            setStatus("connected");
          } else {
            console.warn("[WebRTC] handleAnswer: state still not ready after wait");
          }
          return;
        }

        await peer.setRemoteDescription(new RTCSessionDescription(sdp));
        setStatus("connected");
      } catch (answerError) {
        console.error("[WebRTC] handle answer error", answerError);
        // InvalidStateError는 이미 처리된 경우이므로 무시
        if (
          answerError instanceof Error &&
          answerError.name === "InvalidStateError"
        ) {
          console.warn("[WebRTC] handleAnswer: InvalidStateError (likely already set)");
          return;
        }
        setError(
          answerError instanceof Error
            ? answerError.message
            : "원격 응답 처리 중 문제가 발생했어요."
        );
        setStatus("error");
      }
    },
    []
  );

  const handleIceCandidate = useCallback(
    async ({ from, candidate }: WebRTCSignalPayload) => {
      if (!from || !candidate) {
        console.warn("[WebRTC] handleIceCandidate: missing from or candidate", { from, hasCandidate: !!candidate });
        return;
      }
      const peer = ensurePeerConnection(from);
      try {
        // ICE candidate 추가 전에 connection state 확인
        if (peer.connectionState === "closed" || peer.connectionState === "failed") {
          console.warn("[WebRTC] handleIceCandidate: peer connection is", peer.connectionState);
          return;
        }
        
        // remoteDescription이 설정되지 않았으면 큐에 저장
        if (!peer.remoteDescription) {
          console.log("[WebRTC] handleIceCandidate: remoteDescription not set yet, queuing candidate");
          // remoteDescription이 설정될 때까지 대기
          const checkInterval = setInterval(() => {
            if (peer.remoteDescription) {
              clearInterval(checkInterval);
              peer.addIceCandidate(new RTCIceCandidate(candidate)).catch(console.error);
            }
          }, 100);
          setTimeout(() => clearInterval(checkInterval), 5000); // 5초 후 타임아웃
          return;
        }
        
        await peer.addIceCandidate(new RTCIceCandidate(candidate));
        console.log("[WebRTC] handleIceCandidate: ICE candidate added successfully");
      } catch (iceError) {
        console.error("[WebRTC] handle ICE error", iceError);
        // 이미 추가된 candidate는 무시
        if (
          iceError instanceof Error &&
          (iceError.message.includes("already exists") || 
           iceError.message.includes("InvalidStateError"))
        ) {
          console.warn("[WebRTC] handleIceCandidate: candidate already added, ignoring");
          return;
        }
      }
    },
    [ensurePeerConnection]
  );

  useEffect(() => {
    localStreamsRef.current = activeLocalStreams;
    peersRef.current.forEach((peer) => {
      syncLocalTracks(peer);
    });
    if (shouldInitiate) {
      peersRef.current.forEach((_peer, remoteId) => {
        void sendOffer(remoteId);
      });
    }
  }, [activeLocalStreams, sendOffer, shouldInitiate, syncLocalTracks]);

  useEffect(() => {
    if (!canConnect) {
      setStatus("idle");
      setSocketId(null);
      setRemoteParticipants([]);
      return;
    }

    setStatus("connecting");
    setError(null);
    const baseUrl = getBaseUrl();
    const token = localStorage.getItem("lecq.token");

    const socket = io(baseUrl, {
      transports: ["websocket", "polling"],
      withCredentials: true,
      auth: token ? { token } : undefined,
    });
    socketRef.current = socket;

    const handleConnect = () => {
      setSocketId(socket.id ?? null);
      setStatus("connected");
      socket.emit("live:join", {
        lecture_id: lectureId,
        class_id: normalizedClassId,
        live_id: normalizedLiveId,
        role,
        user_id: userId ?? undefined,
      });
    };

    const handleConnectError = (err: Error) => {
      console.error("[WebRTC] socket connect error", err);
      setError(err.message);
      setStatus("error");
    };

    socket.on("connect", handleConnect);
    socket.on("connect_error", handleConnectError);
    socket.on("live:user-joined", handleRemoteJoin);
    const handleUserLeft = ({ socket_id }: LiveUserPayload) => {
      if (socket_id) {
        detachPeer(socket_id);
      }
    };
    socket.on("live:user-left", handleUserLeft);
    socket.on("webrtc:offer", (payload) => {
      console.log("[WebRTC] Received webrtc:offer event:", payload);
      handleOffer(payload);
    });
    socket.on("webrtc:answer", handleAnswer);
    socket.on("webrtc:ice-candidate", (payload) => {
      console.log("[WebRTC] Received webrtc:ice-candidate event:", payload);
      handleIceCandidate(payload);
    });
    const peersSnapshot = peersRef.current;

    return () => {
      socket.off("connect", handleConnect);
      socket.off("connect_error", handleConnectError);
      socket.off("live:user-joined", handleRemoteJoin);
      socket.off("live:user-left", handleUserLeft);
      socket.off("webrtc:offer", handleOffer);
      socket.off("webrtc:answer", handleAnswer);
      socket.off("webrtc:ice-candidate", handleIceCandidate);
      socketRef.current = null;
      setSocketId(null);
      socket.disconnect();
      peersSnapshot.forEach((_, remoteId) => detachPeer(remoteId));
      peersSnapshot.clear();
    };
  }, [
    canConnect,
    lectureId,
    normalizedClassId,
    normalizedLiveId,
    role,
    userId,
    handleRemoteJoin,
    handleOffer,
    handleAnswer,
    handleIceCandidate,
    detachPeer,
  ]);

  return {
    socketId,
    status,
    error,
    remoteParticipants,
    isConnected: status === "connected" && !!socketId,
  };
}
