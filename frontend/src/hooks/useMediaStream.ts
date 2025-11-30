import { useCallback, useEffect, useRef, useState } from "react";

interface UseMediaStreamOptions {
  videoRef?: React.RefObject<HTMLVideoElement>;
  onError?: (error: string) => void;
}

export function useMediaStream({ videoRef, onError }: UseMediaStreamOptions = {}) {
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isMicOn, setIsMicOn] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // 오디오 레벨 모니터링 시작
  const startAudioLevelMonitoring = useCallback((stream: MediaStream) => {
    try {
      const audioContext = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);

      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      microphone.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateAudioLevel = () => {
        if (analyserRef.current) {
          analyserRef.current.getByteFrequencyData(dataArray);
          animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
        }
      };

      updateAudioLevel();
    } catch (error) {
      console.error("오디오 레벨 모니터링 시작 실패:", error);
    }
  }, []);

  // 오디오 레벨 모니터링 중지
  const stopAudioLevelMonitoring = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    analyserRef.current = null;
  }, []);

  // 카메라 시작
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      streamRef.current = stream;
      setIsCameraOn(true);
      setIsMicOn(stream.getAudioTracks().length > 0);

      if (videoRef && videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          if (videoRef.current) {
            videoRef.current.play().catch(console.error);
          }
        };
      }

      if (stream.getAudioTracks().length > 0) {
        startAudioLevelMonitoring(stream);
      }
    } catch (error: unknown) {
      console.error("웹캠 접근 실패:", error);
      const err = error as { name?: string };
      const message =
        err?.name === "NotAllowedError"
          ? "카메라/마이크 권한이 차단되어 있어요. 브라우저 권한을 허용해 주세요."
          : err?.name === "NotFoundError"
            ? "카메라 또는 마이크를 찾을 수 없어요."
            : "웹캠을 시작할 수 없어요. 장치와 권한을 확인해 주세요.";
      onError?.(message);
    }
  }, [videoRef, startAudioLevelMonitoring, onError]);

  // 카메라 중지
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
        if (videoRef && videoRef.current) {
          videoRef.current.srcObject = null;
        }
    setIsCameraOn(false);
    setIsMicOn(false);
    stopAudioLevelMonitoring();
  }, [videoRef, stopAudioLevelMonitoring]);

  // 마이크 토글
  const toggleMic = useCallback(() => {
    if (streamRef.current) {
      const audioTracks = streamRef.current.getAudioTracks();
      if (audioTracks.length > 0) {
        const newState = !audioTracks[0].enabled;
        audioTracks.forEach((track) => {
          track.enabled = newState;
        });
        setIsMicOn(newState);
      } else {
        navigator.mediaDevices
          .getUserMedia({ audio: true })
          .then((audioStream) => {
            if (streamRef.current) {
              audioStream.getAudioTracks().forEach((newTrack) => {
                streamRef.current!.addTrack(newTrack);
              });
              setIsMicOn(true);
            } else {
              streamRef.current = audioStream;
              setIsMicOn(true);
            }
          })
          .catch((error) => {
            console.error("마이크 접근 실패:", error);
            onError?.("마이크를 시작할 수 없어요.");
          });
      }
    } else {
      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then((audioStream) => {
          streamRef.current = audioStream;
          setIsMicOn(true);
          if (audioStream.getAudioTracks().length > 0) {
            startAudioLevelMonitoring(audioStream);
          }
        })
        .catch((error) => {
          console.error("마이크 접근 실패:", error);
          onError?.("마이크를 시작할 수 없어요.");
        });
    }
  }, [startAudioLevelMonitoring, onError]);

  // 카메라 토글
  const toggleCamera = useCallback(() => {
    if (streamRef.current) {
      const videoTracks = streamRef.current.getVideoTracks();
      if (videoTracks.length > 0) {
        const newState = !videoTracks[0].enabled;
        videoTracks.forEach((track) => {
          track.enabled = newState;
        });
        setIsCameraOn(newState);

        if (videoRef && videoRef.current) {
          if (newState) {
            videoRef.current.srcObject = null;
            requestAnimationFrame(() => {
              if (videoRef && videoRef.current && streamRef.current) {
                videoRef.current.srcObject = streamRef.current;
                videoRef.current.onloadedmetadata = () => {
                  if (videoRef.current) {
                    videoRef.current.play().catch(console.error);
                  }
                };
                if (videoRef.current.readyState >= 2) {
                  videoRef.current.play().catch(console.error);
                }
              }
            });
          } else {
            videoRef.current.srcObject = null;
          }
        }
      } else {
        navigator.mediaDevices
          .getUserMedia({ video: true })
          .then((videoStream) => {
            if (streamRef.current) {
              videoStream.getVideoTracks().forEach((newTrack) => {
                streamRef.current!.addTrack(newTrack);
              });
              if (videoRef && videoRef.current) {
                videoRef.current.srcObject = streamRef.current;
                videoRef.current.play().catch(console.error);
              }
              setIsCameraOn(true);
            } else {
              streamRef.current = videoStream;
              if (videoRef && videoRef.current) {
                videoRef.current.srcObject = videoStream;
                videoRef.current.play().catch(console.error);
              }
              setIsCameraOn(true);
            }
          })
          .catch((error) => {
            console.error("카메라 접근 실패:", error);
            onError?.("카메라를 시작할 수 없어요.");
          });
      }
    } else {
      navigator.mediaDevices
        .getUserMedia({ video: true })
        .then((videoStream) => {
          streamRef.current = videoStream;
          if (videoRef && videoRef.current) {
            videoRef.current.srcObject = videoStream;
            videoRef.current.onloadedmetadata = () => {
              if (videoRef.current) {
                videoRef.current.play().catch(console.error);
              }
            };
          }
          setIsCameraOn(true);
        })
        .catch((error) => {
          console.error("카메라 접근 실패:", error);
          onError?.("카메라를 시작할 수 없어요.");
        });
    }
  }, [videoRef, onError]);

  // 정리
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return {
    stream: streamRef.current,
    isCameraOn,
    isMicOn,
    startCamera,
    stopCamera,
    toggleMic,
    toggleCamera,
  };
}

