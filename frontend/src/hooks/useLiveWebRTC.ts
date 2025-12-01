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
      console.log(
        "[WebRTC] updateRemoteParticipants: socketId:",
        id,
        "metadata:",
        meta,
        "streams count:",
        streams.length
      );
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
    console.log(
      "[WebRTC] updateRemoteParticipants: 총 participants 수:",
      participants.length
    );
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
          peer.onnegotiationneeded = null;
          peer.close();
        } catch (closeError) {
          console.warn("[WebRTC] peer close error", closeError);
        }
        peersRef.current.delete(remoteSocketId);
      }
      // 모든 스트림 정리
      const streams = remoteStreamRef.current.get(remoteSocketId) || [];
      streams.forEach((stream) => {
        stream.getTracks().forEach((track) => track.stop());
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
      if (alreadyAdded) {
        // 트랙이 이미 추가되어 있으면 enabled 상태만 업데이트
        const sender = senders.find((s) => s.track?.id === track.id);
        if (sender && sender.track && sender.track.enabled !== track.enabled) {
          sender.track.enabled = track.enabled;
        }
        return;
      }
      const ownerStream = streams.find((stream) =>
        stream.getTracks().some((streamTrack) => streamTrack.id === track.id)
      );
      if (ownerStream) {
        peer.addTrack(track, ownerStream);
      }
    });
  }, []);

  const sendOffer = useCallback(
    async (remoteSocketId: string, force: boolean = false) => {
      // force가 true이면 shouldInitiate와 관계없이 offer 전송 (재협상용)
      if (!shouldInitiate && !force) return;
      const socket = socketRef.current;
      const peer = peersRef.current.get(remoteSocketId);
      if (!socket || !peer) return;
      if (makingOfferRef.current.get(remoteSocketId)) return;

      const currentState = peer.signalingState;
      if (currentState === "closed") {
        console.warn("[WebRTC] sendOffer: peer is closed");
        return;
      }

      if (
        currentState === "have-local-offer" ||
        currentState === "have-remote-offer"
      ) {
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
            user_id: userId,
          },
        });
        console.log("[WebRTC] offer sent to", remoteSocketId, "force:", force);
      } catch (offerError) {
        console.error("[WebRTC] offer error", offerError);
        if (
          offerError instanceof Error &&
          offerError.name === "InvalidStateError"
        ) {
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
    [
      lectureId,
      normalizedClassId,
      normalizedLiveId,
      role,
      userId,
      shouldInitiate,
    ]
  );

  const ensurePeerConnection = useCallback(
    (remoteSocketId: string) => {
      let peer = peersRef.current.get(remoteSocketId);
      if (peer) return peer;

      peer = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      peersRef.current.set(remoteSocketId, peer);
      syncLocalTracks(peer);

      peer.ontrack = (event) => {
        console.log("[WebRTC] ontrack event received", {
          remoteSocketId,
          streams: event.streams.length,
          track: event.track,
          trackKind: event.track.kind,
          trackLabel: event.track.label,
        });

        const [stream] = event.streams;
        if (!stream) {
          console.warn(
            "[WebRTC] ontrack: no stream in event, using track only"
          );
          // stream이 없으면 track만 처리
          const track = event.track;
          if (track) {
            // 트랙 종료 시 스트림 정리
            const cleanupRemoteStreams = () => {
              const existing =
                remoteStreamRef.current.get(remoteSocketId) || [];
              const aliveStreams = existing.filter((s) =>
                s.getTracks().some((t) => t.readyState === "live" && t.enabled)
              );
              if (aliveStreams.length === 0) {
                remoteStreamRef.current.delete(remoteSocketId);
                metadataRef.current.delete(remoteSocketId);
                makingOfferRef.current.delete(remoteSocketId);
              } else {
                remoteStreamRef.current.set(remoteSocketId, aliveStreams);
              }
              updateRemoteParticipants();
            };
            track.addEventListener("ended", cleanupRemoteStreams);

            // 기존 stream에 track 추가
            const existingStreams =
              remoteStreamRef.current.get(remoteSocketId) || [];
            const primaryStream = existingStreams[0];
            if (primaryStream) {
              primaryStream.addTrack(track);
              console.log(
                "[WebRTC] ontrack: added track to existing stream",
                remoteSocketId
              );
              updateRemoteParticipants();
            } else {
              // 새 stream 생성
              const newStream = new MediaStream([track]);
              remoteStreamRef.current.set(remoteSocketId, [newStream]);
              console.log(
                "[WebRTC] ontrack: created new stream from track",
                remoteSocketId
              );
              updateRemoteParticipants();
            }
          }
          return;
        }
        console.log(
          "[WebRTC] ontrack: stream found, tracks:",
          stream.getTracks().map((t) => ({
            kind: t.kind,
            enabled: t.enabled,
            readyState: t.readyState,
            label: t.label,
          }))
        );
        console.log(
          "[WebRTC] ontrack: current metadata for",
          remoteSocketId,
          ":",
          metadataRef.current.get(remoteSocketId)
        );

        // 트랙 종료 시 스트림 정리
        const cleanupRemoteStreams = () => {
          const existing = remoteStreamRef.current.get(remoteSocketId) || [];
          const aliveStreams = existing.filter((s) =>
            s.getTracks().some((t) => t.readyState === "live" && t.enabled)
          );
          if (aliveStreams.length === 0) {
            remoteStreamRef.current.delete(remoteSocketId);
            metadataRef.current.delete(remoteSocketId);
            makingOfferRef.current.delete(remoteSocketId);
          } else {
            remoteStreamRef.current.set(remoteSocketId, aliveStreams);
          }
          updateRemoteParticipants();
        };
        stream.getTracks().forEach((t) => {
          t.addEventListener("ended", cleanupRemoteStreams);
        });

        // 여러 스트림 저장 (카메라와 화면 공유를 모두 저장)
        const existingStreams =
          remoteStreamRef.current.get(remoteSocketId) || [];
        // 중복 스트림 체크 (stream ID로)
        const streamId = stream.id;
        if (!existingStreams.some((s) => s.id === streamId)) {
          console.log(
            "[WebRTC] ontrack: 새 스트림 추가:",
            streamId,
            "기존 스트림 수:",
            existingStreams.length
          );
          existingStreams.push(stream);
          remoteStreamRef.current.set(remoteSocketId, existingStreams);
          updateRemoteParticipants();
          console.log(
            "[WebRTC] ontrack: 스트림 추가 후 metadata:",
            metadataRef.current.get(remoteSocketId)
          );
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
        console.log("[WebRTC] connection state changed", {
          remoteSocketId,
          state: peer?.connectionState,
        });
        if (peer?.connectionState === "failed") {
          detachPeer(remoteSocketId);
        }
      };

      peer.oniceconnectionstatechange = () => {
        console.log("[WebRTC] ICE connection state changed", {
          remoteSocketId,
          state: peer?.iceConnectionState,
        });
      };

      peer.onnegotiationneeded = () => {
        console.log(
          "[WebRTC] negotiation needed for",
          remoteSocketId,
          "shouldInitiate:",
          shouldInitiate
        );
        // 재협상이 필요하면 항상 offer 전송 (학생도 재협상 가능)
        // 단, 이미 연결이 설정된 경우에만 (stable 상태)
        const currentState = peer.signalingState;
        if (currentState === "stable" || shouldInitiate) {
          void sendOffer(remoteSocketId, !shouldInitiate);
        } else {
          console.log(
            "[WebRTC] negotiation needed but signaling state is",
            currentState
          );
        }
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

      console.log("[WebRTC] handleRemoteJoin", payload);

      metadataRef.current.set(payload.socket_id, {
        role: payload.role,
        userId: payload.user_id,
      });
      updateRemoteParticipants();

      ensurePeerConnection(payload.socket_id);
      if (shouldInitiate) {
        console.log(
          "[WebRTC] handleRemoteJoin: sending offer to",
          payload.socket_id
        );
        void sendOffer(payload.socket_id);
      } else {
        console.log(
          "[WebRTC] handleRemoteJoin: waiting for offer (student mode)"
        );
      }
    },
    [ensurePeerConnection, sendOffer, shouldInitiate, updateRemoteParticipants]
  );

  const handleOffer = useCallback(
    async ({ from, sdp, meta }: WebRTCSignalPayload) => {
      if (!from || !sdp) {
        console.warn("[WebRTC] handleOffer: missing from or sdp");
        return;
      }

      console.log("[WebRTC] handleOffer: received offer from", from, meta);

      const peer = ensurePeerConnection(from);

      // meta에서 role과 user_id 추출하여 metadata 저장
      if (meta) {
        const roleFromMeta = meta.role as UserRole | undefined;
        const userIdFromMeta = meta.user_id as string | undefined;
        if (roleFromMeta || userIdFromMeta) {
          metadataRef.current.set(from, {
            role: roleFromMeta,
            userId: userIdFromMeta,
          });
          console.log("[WebRTC] handleOffer: metadata set", {
            socketId: from,
            role: roleFromMeta,
            userId: userIdFromMeta,
          });
        }
      }

      try {
        const currentState = peer.signalingState;
        console.log(
          "[WebRTC] handleOffer: current signaling state",
          currentState
        );

        if (currentState === "closed") {
          console.warn("[WebRTC] handleOffer: peer is closed");
          return;
        }
        if (currentState === "have-remote-offer") {
          console.warn("[WebRTC] handleOffer: already have remote offer");
          return;
        }
        if (currentState === "stable" && peer.remoteDescription) {
          console.warn(
            "[WebRTC] handleOffer: already stable with remote description"
          );
          return;
        }

        console.log("[WebRTC] handleOffer: setting remote description");
        await peer.setRemoteDescription(new RTCSessionDescription(sdp));
        console.log("[WebRTC] handleOffer: creating answer");
        const answer = await peer.createAnswer();
        console.log("[WebRTC] handleOffer: setting local description");
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
        console.log("[WebRTC] handleOffer: answer sent");
        setStatus("connected");
        updateRemoteParticipants();
      } catch (offerError) {
        console.error("[WebRTC] handle offer error", offerError);
        if (
          offerError instanceof Error &&
          offerError.name === "InvalidStateError"
        ) {
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
    [
      ensurePeerConnection,
      lectureId,
      normalizedClassId,
      normalizedLiveId,
      role,
      updateRemoteParticipants,
    ]
  );

  const handleAnswer = useCallback(
    async ({ from, sdp, meta }: WebRTCSignalPayload) => {
      if (!from || !sdp) return;
      const peer = peersRef.current.get(from);
      if (!peer) return;

      // meta에서 role과 user_id 추출하여 metadata 저장
      if (meta) {
        const roleFromMeta = meta.role as UserRole | undefined;
        const userIdFromMeta = meta.user_id as string | undefined;
        if (roleFromMeta || userIdFromMeta) {
          metadataRef.current.set(from, {
            role: roleFromMeta,
            userId: userIdFromMeta,
          });
          console.log("[WebRTC] handleAnswer: metadata set", {
            socketId: from,
            role: roleFromMeta,
            userId: userIdFromMeta,
          });
          updateRemoteParticipants();
        }
      }

      try {
        const currentState = peer.signalingState;
        if (currentState === "closed") return;

        if (currentState !== "have-local-offer") {
          if (currentState === "stable") return;
          await new Promise((resolve) => setTimeout(resolve, 100));
          if (peer.signalingState === "have-local-offer") {
            await peer.setRemoteDescription(new RTCSessionDescription(sdp));
            setStatus("connected");
          }
          return;
        }

        await peer.setRemoteDescription(new RTCSessionDescription(sdp));
        setStatus("connected");
        updateRemoteParticipants();
      } catch (answerError) {
        console.error("[WebRTC] handle answer error", answerError);
        if (
          answerError instanceof Error &&
          answerError.name === "InvalidStateError"
        ) {
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
    [updateRemoteParticipants]
  );

  const handleIceCandidate = useCallback(
    async ({ from, candidate }: WebRTCSignalPayload) => {
      if (!from || !candidate) return;
      const peer = ensurePeerConnection(from);
      try {
        if (
          peer.connectionState === "closed" ||
          peer.connectionState === "failed"
        ) {
          return;
        }

        if (!peer.remoteDescription) {
          const checkInterval = setInterval(() => {
            if (peer.remoteDescription) {
              clearInterval(checkInterval);
              peer
                .addIceCandidate(new RTCIceCandidate(candidate))
                .catch(console.error);
            }
          }, 100);
          setTimeout(() => clearInterval(checkInterval), 5000);
          return;
        }

        await peer.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (iceError) {
        if (
          iceError instanceof Error &&
          (iceError.message.includes("already exists") ||
            iceError.message.includes("InvalidStateError"))
        ) {
          return;
        }
        console.error("[WebRTC] handle ICE error", iceError);
      }
    },
    [ensurePeerConnection]
  );

  // 로컬 스트림 변경 시 동기화
  useEffect(() => {
    localStreamsRef.current = activeLocalStreams;
    peersRef.current.forEach((peer) => {
      syncLocalTracks(peer);
    });
    // 로컬 트랙 구성이 바뀌면 항상 재협상 트리거
    peersRef.current.forEach((_peer, remoteId) => {
      void sendOffer(remoteId, true);
    });
  }, [activeLocalStreams, sendOffer, syncLocalTracks]);

  // Socket.IO 연결 및 WebRTC 시그널링
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
      console.log("[WebRTC] Socket connected", socket.id);
      setSocketId(socket.id ?? null);
      setStatus("connected");
      console.log("[WebRTC] Emitting live:join", {
        lecture_id: lectureId,
        class_id: normalizedClassId,
        live_id: normalizedLiveId,
        role,
        user_id: userId,
      });
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
    socket.on("webrtc:offer", handleOffer);
    socket.on("webrtc:answer", handleAnswer);
    socket.on("webrtc:ice-candidate", handleIceCandidate);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("connect_error", handleConnectError);
      socket.off("live:user-joined", handleRemoteJoin);
      socket.off("live:user-left", handleUserLeft);
      socket.off("webrtc:offer", handleOffer);
      socket.off("webrtc:answer", handleAnswer);
      socket.off("webrtc:ice-candidate", handleIceCandidate);

      // 모든 peer 연결 종료 및 스트림 정리
      peersRef.current.forEach((_peer, remoteId) => {
        detachPeer(remoteId);
      });
      // eslint-disable-next-line react-hooks/exhaustive-deps
      peersRef.current.clear();

      socketRef.current = null;
      setSocketId(null);
      socket.disconnect();
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

  // 컴포넌트 언마운트 시 모든 스트림 정리
  useEffect(() => {
    return () => {
      // 모든 원격 스트림 정리
      remoteStreamRef.current.forEach((streams) => {
        streams.forEach((stream) =>
          stream.getTracks().forEach((track) => track.stop())
        );
      });
      remoteStreamRef.current.clear();

      // 모든 peer 연결 종료
      peersRef.current.forEach((_peer, remoteId) => {
        detachPeer(remoteId);
      });
      peersRef.current.clear();
    };
  }, [detachPeer]);

  return {
    socketId,
    status,
    error,
    remoteParticipants,
    isConnected: status === "connected" && !!socketId,
  };
}
