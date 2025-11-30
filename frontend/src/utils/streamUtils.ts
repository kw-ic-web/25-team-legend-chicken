/**
 * 스트림 유틸리티 함수
 * 화면 공유와 카메라 스트림을 구분하는 로직
 */

export function isScreenShareTrack(track: MediaStreamTrack): boolean {
  try {
    const settings = track.getSettings();
    const label = track.label || "";
    const displaySurface = settings.displaySurface;
    const width = settings.width;
    const height = settings.height;

    return (
      label.toLowerCase().includes("screen") ||
      label.toLowerCase().includes("화면") ||
      displaySurface === "monitor" ||
      displaySurface === "window" ||
      displaySurface === "browser" ||
      (width && height && width > 1280 && height > 720)
    );
  } catch {
    const label = track.label || "";
    return (
      label.toLowerCase().includes("screen") ||
      label.toLowerCase().includes("화면")
    );
  }
}

export function getScreenShareStream(
  streams: MediaStream[]
): MediaStream | null {
  for (const stream of streams) {
    const videoTracks = stream.getVideoTracks();
    if (videoTracks.some(isScreenShareTrack)) {
      return stream;
    }
  }
  return null;
}

export function getCameraStream(
  streams: MediaStream[],
  excludeStreamIds: Set<string> = new Set()
): MediaStream | null {
  for (const stream of streams) {
    if (excludeStreamIds.has(stream.id)) {
      continue;
    }
    const videoTracks = stream.getVideoTracks();
    if (videoTracks.length > 0 && !videoTracks.some(isScreenShareTrack)) {
      return stream;
    }
  }
  return null;
}

