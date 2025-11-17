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
  const remoteStreamRef = useRef<Map<string, MediaStream>>(new Map());
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
    const participants = Array.from(remoteStreamRef.current.entries()).map(
      ([id, stream]) => {
        const meta = metadataRef.current.get(id);
        return {
          socketId: id,
          stream,
          role: meta?.role,
          userId: meta?.userId,
        };
      }
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
          peer.close();
        } catch (closeError) {
          console.warn("[WebRTC] peer close error", closeError);
        }
        peersRef.current.delete(remoteSocketId);
      }
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

      makingOfferRef.current.set(remoteSocketId, true);
      try {
        if (peer.signalingState === "closed") return;
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
        const [stream] = event.streams;
        if (!stream) return;
        remoteStreamRef.current.set(remoteSocketId, stream);
        updateRemoteParticipants();
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

      metadataRef.current.set(payload.socket_id, {
        role: payload.role,
        userId: payload.user_id,
      });
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
      if (!from || !sdp) return;
      const peer = ensurePeerConnection(from);
      try {
        await peer.setRemoteDescription(new RTCSessionDescription(sdp));
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);
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
        setStatus("connected");
      } catch (offerError) {
        console.error("[WebRTC] handle offer error", offerError);
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
      if (!peer) return;
      try {
        await peer.setRemoteDescription(new RTCSessionDescription(sdp));
        setStatus("connected");
      } catch (answerError) {
        console.error("[WebRTC] handle answer error", answerError);
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
      if (!from || !candidate) return;
      const peer = ensurePeerConnection(from);
      try {
        await peer.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (iceError) {
        console.error("[WebRTC] handle ICE error", iceError);
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
    socket.on("webrtc:offer", handleOffer);
    socket.on("webrtc:answer", handleAnswer);
    socket.on("webrtc:ice-candidate", handleIceCandidate);
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
