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
    console.log("[WebRTC] updateRemoteParticipants called", {
      streamCount: remoteStreamRef.current.size,
      metadataCount: metadataRef.current.size,
    });
    
    const participants: RemoteParticipant[] = [];
    
    // 각 socketId별로 stream을 분석하여 화면 공유와 카메라를 구분
    remoteStreamRef.current.forEach((stream, socketId) => {
      const meta = metadataRef.current.get(socketId);
      if (!meta) {
        console.warn("[WebRTC] updateRemoteParticipants: no metadata for", socketId);
        return;
      }
      
      console.log("[WebRTC] updateRemoteParticipants: processing stream", {
        socketId,
        role: meta.role,
        userId: meta.userId,
        videoTracks: stream.getVideoTracks().length,
        audioTracks: stream.getAudioTracks().length,
      });
      
      const videoTracks = stream.getVideoTracks();
      if (videoTracks.length === 0) {
        // 비디오 track이 없으면 오디오만 있는 경우
        participants.push({
          socketId,
          stream,
          role: meta.role,
          userId: meta.userId,
        });
        return;
      }
      
      // 각 video track을 분석하여 화면 공유와 카메라를 구분
      const screenTracks: MediaStreamTrack[] = [];
      const cameraTracks: MediaStreamTrack[] = [];
      
      console.log("[WebRTC] Total video tracks to analyze:", videoTracks.length);
      
      // track을 분석하기 전에 모든 track의 정보를 먼저 수집
      const trackInfo = videoTracks.map((track, index) => {
        try {
          const settings = track.getSettings();
          return {
            track,
            index,
            width: settings.width,
            height: settings.height,
            frameRate: settings.frameRate,
            deviceId: settings.deviceId,
            facingMode: settings.facingMode,
            displaySurface: settings.displaySurface,
          };
        } catch {
          return {
            track,
            index,
            width: undefined,
            height: undefined,
            frameRate: undefined,
            deviceId: undefined,
            facingMode: undefined,
            displaySurface: undefined,
          };
        }
      });
      
      console.log("[WebRTC] Track info collected:", trackInfo.map(t => ({
        index: t.index,
        width: t.width,
        height: t.height,
        displaySurface: t.displaySurface,
      })));
      
      videoTracks.forEach((track, trackIndex) => {
        let isScreenShare = false;
        
        console.log("[WebRTC] Analyzing track:", {
          id: track.id,
          label: track.label,
          kind: track.kind,
          enabled: track.enabled,
          readyState: track.readyState,
        });
        
        // 방법 1: getSettings().displaySurface 확인 (가장 확실)
        try {
          const settings = track.getSettings();
          console.log("[WebRTC] Track settings:", {
            displaySurface: settings.displaySurface,
            width: settings.width,
            height: settings.height,
            frameRate: settings.frameRate,
            deviceId: settings.deviceId,
            facingMode: settings.facingMode,
          });
          
          if (settings.displaySurface) {
            isScreenShare = ["screen", "window", "browser"].includes(settings.displaySurface);
            console.log("[WebRTC] Track displaySurface detected:", settings.displaySurface, "isScreenShare:", isScreenShare);
          }
        } catch (e) {
          console.warn("[WebRTC] getSettings() error:", e);
        }
        
        // 방법 2: getCapabilities() 확인
        if (!isScreenShare) {
          try {
            const capabilities = track.getCapabilities();
            console.log("[WebRTC] Track capabilities:", {
              displaySurface: capabilities.displaySurface,
              width: capabilities.width,
              height: capabilities.height,
            });
            
            if (capabilities.displaySurface) {
              isScreenShare = ["screen", "window", "browser"].includes(capabilities.displaySurface);
              console.log("[WebRTC] Track capabilities.displaySurface detected:", capabilities.displaySurface, "isScreenShare:", isScreenShare);
            }
          } catch (e) {
            console.warn("[WebRTC] getCapabilities() error:", e);
          }
        }
        
        // 방법 3: getConstraints() 확인 - 화면 공유는 deviceId가 false이거나 없음
        if (!isScreenShare) {
          try {
            const constraints = track.getConstraints();
            console.log("[WebRTC] Track constraints:", {
              deviceId: constraints.deviceId,
              width: constraints.width,
              height: constraints.height,
            });
            
            // 화면 공유는 deviceId가 false이거나 없고, facingMode도 없음
            if (constraints.deviceId === false || 
                (typeof constraints.deviceId === "object" && constraints.deviceId.exact === false) ||
                (!constraints.deviceId && !constraints.facingMode)) {
              // 추가 확인: 화면 공유는 보통 큰 해상도를 가짐
              const settings = track.getSettings();
              if (settings.width && settings.width >= 1280) {
                isScreenShare = true;
                console.log("[WebRTC] Track detected as screen share by constraints and resolution");
              }
            }
          } catch (e) {
            console.warn("[WebRTC] getConstraints() error:", e);
          }
        }
        
        // 방법 4: label 확인 (fallback) - UUID만 있는 경우는 제외
        if (!isScreenShare) {
          const label = track.label.toLowerCase();
          // UUID 패턴이 아니고 화면 공유 관련 키워드가 있으면
          const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(track.label);
          if (!isUUID && (label.includes("screen") || 
                         label.includes("display") || 
                         label.includes("monitor") || 
                         label.includes("window") ||
                         label.includes("desktop"))) {
            isScreenShare = true;
            console.log("[WebRTC] Track detected as screen share by label:", track.label);
          }
        }
        
        // 방법 5: 해상도 기반 추론 (화면 공유는 보통 큰 해상도)
        if (!isScreenShare && videoTracks.length > 1) {
          try {
            const settings = track.getSettings();
            console.log("[WebRTC] Track settings for resolution check:", {
              width: settings.width,
              height: settings.height,
              frameRate: settings.frameRate,
            });
            
            // 해상도 정보가 있으면 비교
            if (settings.width && settings.height) {
              // 다른 track과 비교하여 더 큰 해상도면 화면 공유로 간주
              const otherTracks = videoTracks.filter(t => t.id !== track.id);
              let isLargest = true;
              
              for (const otherTrack of otherTracks) {
                try {
                  const otherSettings = otherTrack.getSettings();
                  if (otherSettings.width && otherSettings.height) {
                    const thisArea = settings.width * settings.height;
                    const otherArea = otherSettings.width * otherSettings.height;
                    if (otherArea > thisArea) {
                      isLargest = false;
                      break;
                    }
                  }
                } catch {
                  // 무시
                }
              }
              
              if (isLargest) {
                isScreenShare = true;
                console.log("[WebRTC] Track detected as screen share by resolution (largest):", settings.width, "x", settings.height);
              }
            } else {
              // 해상도 정보가 없으면, track의 순서나 다른 방법으로 추론
              // 일반적으로 화면 공유는 나중에 추가되므로, 마지막 track을 화면 공유로 간주
              if (trackIndex === videoTracks.length - 1 && videoTracks.length > 1) {
                // 마지막 track이고 해상도 정보가 없으면, track의 contentHint 확인
                try {
                  const contentHint = (track as any).contentHint;
                  console.log("[WebRTC] Track contentHint:", contentHint);
                  if (contentHint === "detail" || contentHint === "motion") {
                    isScreenShare = true;
                    console.log("[WebRTC] Track detected as screen share by contentHint:", contentHint);
                  } else {
                    // contentHint가 없고 마지막 track이면 화면 공유로 간주
                    // (일반적으로 카메라를 먼저 켜고 화면 공유를 나중에 켜므로)
                    isScreenShare = true;
                    console.log("[WebRTC] Track detected as screen share by order (last track, no resolution info)");
                  }
                } catch {
                  // contentHint가 없으면, 마지막 track을 화면 공유로 간주
                  isScreenShare = true;
                  console.log("[WebRTC] Track detected as screen share by order (last track, no contentHint)");
                }
              }
            }
          } catch (e) {
            console.warn("[WebRTC] Resolution check error:", e);
          }
        } else if (!isScreenShare && videoTracks.length === 1) {
          // track이 하나만 있으면, 해상도가 크면 화면 공유일 가능성
          try {
            const settings = track.getSettings();
            if (settings.width && settings.height) {
              const area = settings.width * settings.height;
              // 1920x1080 이상이면 화면 공유일 가능성이 높음
              if (area >= 1920 * 1080) {
                isScreenShare = true;
                console.log("[WebRTC] Single track detected as screen share by high resolution:", settings.width, "x", settings.height);
              }
            }
          } catch (e) {
            // 무시
          }
        }
        
        console.log("[WebRTC] Final decision for track:", track.id, "isScreenShare:", isScreenShare);
        
        if (isScreenShare) {
          screenTracks.push(track);
        } else {
          cameraTracks.push(track);
        }
      });
      
      // 화면 공유 track이 있으면 별도 stream으로 추가
      if (screenTracks.length > 0) {
        const screenStream = new MediaStream([...screenTracks, ...stream.getAudioTracks()]);
        participants.push({
          socketId: `${socketId}-screen`,
          stream: screenStream,
          role: meta.role,
          userId: meta.userId,
        });
        console.log("[WebRTC] updateRemoteParticipants: added screen stream", {
          socketId: `${socketId}-screen`,
          role: meta.role,
        });
      }
      
      // 카메라 track이 있으면 별도 stream으로 추가
      if (cameraTracks.length > 0) {
        const cameraStream = new MediaStream([...cameraTracks, ...stream.getAudioTracks()]);
        participants.push({
          socketId: `${socketId}-camera`,
          stream: cameraStream,
          role: meta.role,
          userId: meta.userId,
        });
        console.log("[WebRTC] updateRemoteParticipants: added camera stream", {
          socketId: `${socketId}-camera`,
          role: meta.role,
        });
      }
      
      // 비디오 track이 없으면 오디오만 있는 경우
      if (screenTracks.length === 0 && cameraTracks.length === 0) {
        participants.push({
          socketId,
          stream,
          role: meta.role,
          userId: meta.userId,
        });
      }
    });
    
    console.log("[WebRTC] updateRemoteParticipants: final participants", {
      count: participants.length,
      participants: participants.map(p => ({
        socketId: p.socketId,
        role: p.role,
        userId: p.userId,
        hasStream: !!p.stream,
        videoTracks: p.stream?.getVideoTracks().length || 0,
      })),
    });
    
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
      const stream = remoteStreamRef.current.get(remoteSocketId);
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
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
    async (remoteSocketId: string) => {
      if (!shouldInitiate) return;
      const socket = socketRef.current;
      const peer = peersRef.current.get(remoteSocketId);
      if (!socket || !peer) return;
      if (makingOfferRef.current.get(remoteSocketId)) return;

      const currentState = peer.signalingState;
      if (currentState === "closed") {
        console.warn("[WebRTC] sendOffer: peer is closed");
        return;
      }
      
      if (currentState === "have-local-offer" || currentState === "have-remote-offer") {
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
    [lectureId, normalizedClassId, normalizedLiveId, role, userId, shouldInitiate]
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
          console.warn("[WebRTC] ontrack: no stream in event, using track only");
          // stream이 없으면 track만 처리
          const track = event.track;
          if (track) {
            // 기존 stream에 track 추가
            const existingStream = remoteStreamRef.current.get(remoteSocketId);
            if (existingStream) {
              existingStream.addTrack(track);
              console.log("[WebRTC] ontrack: added track to existing stream", remoteSocketId);
              updateRemoteParticipants();
            } else {
              // 새 stream 생성
              const newStream = new MediaStream([track]);
              remoteStreamRef.current.set(remoteSocketId, newStream);
              console.log("[WebRTC] ontrack: created new stream from track", remoteSocketId);
              updateRemoteParticipants();
            }
          }
          return;
        }
        
        console.log("[WebRTC] ontrack: stream found", {
          remoteSocketId,
          streamId: stream.id,
          videoTracks: stream.getVideoTracks().length,
          audioTracks: stream.getAudioTracks().length,
        });
        
        // stream이 있으면 기존 stream과 병합 또는 교체
        const existingStream = remoteStreamRef.current.get(remoteSocketId);
        if (existingStream && existingStream.id !== stream.id) {
          console.log("[WebRTC] ontrack: merging tracks into existing stream", remoteSocketId);
          // 다른 stream이면 track들을 기존 stream에 추가
          stream.getTracks().forEach((track) => {
            if (!existingStream.getTracks().some((t) => t.id === track.id)) {
              existingStream.addTrack(track);
            }
          });
        } else {
          console.log("[WebRTC] ontrack: setting new stream", remoteSocketId);
          // 같은 stream이거나 없으면 교체
          remoteStreamRef.current.set(remoteSocketId, stream);
        }
        
        // track이 종료되면 제거
        event.track.onended = () => {
          console.log("[WebRTC] track ended", remoteSocketId, event.track.id);
          const currentStream = remoteStreamRef.current.get(remoteSocketId);
          if (currentStream) {
            currentStream.removeTrack(event.track);
            // 모든 track이 종료되면 stream 제거
            if (currentStream.getTracks().length === 0) {
              remoteStreamRef.current.delete(remoteSocketId);
            }
            updateRemoteParticipants();
          }
        };
        
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

      console.log("[WebRTC] handleRemoteJoin", payload);
      
      metadataRef.current.set(payload.socket_id, {
        role: payload.role,
        userId: payload.user_id,
      });
      updateRemoteParticipants();

      ensurePeerConnection(payload.socket_id);
      if (shouldInitiate) {
        console.log("[WebRTC] handleRemoteJoin: sending offer to", payload.socket_id);
        void sendOffer(payload.socket_id);
      } else {
        console.log("[WebRTC] handleRemoteJoin: waiting for offer (student mode)");
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
        console.log("[WebRTC] handleOffer: current signaling state", currentState);
        
        if (currentState === "closed") {
          console.warn("[WebRTC] handleOffer: peer is closed");
          return;
        }
        if (currentState === "have-remote-offer") {
          console.warn("[WebRTC] handleOffer: already have remote offer");
          return;
        }
        if (currentState === "stable" && peer.remoteDescription) {
          console.warn("[WebRTC] handleOffer: already stable with remote description");
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
    [ensurePeerConnection, lectureId, normalizedClassId, normalizedLiveId, role, updateRemoteParticipants]
  );

  const handleAnswer = useCallback(
    async ({ from, sdp }: WebRTCSignalPayload) => {
      if (!from || !sdp) return;
      const peer = peersRef.current.get(from);
      if (!peer) return;
      
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
    []
  );

  const handleIceCandidate = useCallback(
    async ({ from, candidate }: WebRTCSignalPayload) => {
      if (!from || !candidate) return;
      const peer = ensurePeerConnection(from);
      try {
        if (peer.connectionState === "closed" || peer.connectionState === "failed") {
          return;
        }
        
        if (!peer.remoteDescription) {
          const checkInterval = setInterval(() => {
            if (peer.remoteDescription) {
              clearInterval(checkInterval);
              peer.addIceCandidate(new RTCIceCandidate(candidate)).catch(console.error);
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
    if (shouldInitiate) {
      peersRef.current.forEach((_peer, remoteId) => {
        void sendOffer(remoteId);
      });
    }
  }, [activeLocalStreams, sendOffer, shouldInitiate, syncLocalTracks]);

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
      peersRef.current.forEach((peer, remoteId) => {
        detachPeer(remoteId);
      });
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
      remoteStreamRef.current.forEach((stream) => {
        stream.getTracks().forEach((track) => track.stop());
      });
      remoteStreamRef.current.clear();
      
      // 모든 peer 연결 종료
      peersRef.current.forEach((peer, remoteId) => {
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
