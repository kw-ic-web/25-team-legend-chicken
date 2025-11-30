import { useCallback, useEffect, useRef, useState } from "react";

interface UseScreenShareOptions {
  videoRef?: React.RefObject<HTMLVideoElement>;
  onError?: (error: string) => void;
  onStop?: () => void;
}

export function useScreenShare({
  videoRef,
  onError,
  onStop,
}: UseScreenShareOptions = {}) {
  const [isSharing, setIsSharing] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const isStartingRef = useRef(false);

  // 화면 공유 중지
  const stopScreenShare = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
        track.onended = null;
      });
      streamRef.current = null;
    }
    if (videoRef?.current) {
      videoRef.current.srcObject = null;
    }
    setIsSharing(false);
    onStop?.();
  }, [videoRef, onStop]);

  // 화면 공유 시작
  const startScreenShare = useCallback(async () => {
    if (isSharing || streamRef.current || isStartingRef.current) {
      return;
    }

    isStartingRef.current = true;
    setTimeout(() => {
      isStartingRef.current = false;
    }, 5000);

    try {
      const mediaDevices = navigator.mediaDevices as MediaDevices & {
        getDisplayMedia?: (constraints?: MediaStreamConstraints) => Promise<MediaStream>;
      };
      const getDisplay = mediaDevices.getDisplayMedia
        ? mediaDevices.getDisplayMedia.bind(mediaDevices)
        : (navigator as unknown as { getDisplayMedia: () => Promise<MediaStream> })
            .getDisplayMedia;

      const displayConstraints: MediaStreamConstraints & {
        preferCurrentTab?: boolean;
      } = {
        video: {
          frameRate: 30,
          displaySurface: "monitor",
        },
        audio: true,
        preferCurrentTab: false,
      };

      const displayStream = await getDisplay(displayConstraints);
      streamRef.current = displayStream;
      setIsSharing(true);

      if (videoRef?.current) {
        videoRef.current.srcObject = displayStream as unknown as MediaStream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(console.error);
        };
        if (videoRef.current.readyState >= 2) {
          videoRef.current.play().catch(console.error);
        }
      }

      // 트랙 종료 이벤트 처리
      const tracks = [
        ...displayStream.getVideoTracks(),
        ...displayStream.getAudioTracks(),
      ];
      tracks.forEach((track) => {
        track.addEventListener("ended", () => {
          stopScreenShare();
        });
      });
    } catch (e: unknown) {
      console.error("화면 공유 실패:", e);
      setIsSharing(false);
      const err = e as { name?: string };
      const message =
        err?.name === "NotAllowedError"
          ? "화면 공유가 취소되었어요. 다시 시도해 주세요."
          : "화면 공유를 시작할 수 없어요.";
      onError?.(message);
    } finally {
      setTimeout(() => {
        isStartingRef.current = false;
      }, 1000);
    }
  }, [isSharing, videoRef, stopScreenShare, onError]);

  // 탭 숨김 시 정리
  useEffect(() => {
    const onVisibility = () => {
      if (isStartingRef.current) return;
      if (document.hidden && isSharing) {
        stopScreenShare();
      }
    };

    const onBeforeUnload = () => {
      stopScreenShare();
    };

    const onPageHide = () => {
      stopScreenShare();
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("beforeunload", onBeforeUnload);
    window.addEventListener("pagehide", onPageHide);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [isSharing, stopScreenShare]);

  return {
    isSharing,
    stream: streamRef.current,
    startScreenShare,
    stopScreenShare,
  };
}

