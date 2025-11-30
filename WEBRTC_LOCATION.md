# WebRTC 코드 위치 정리

## 📍 WebRTC 관련 코드가 있는 곳

### 1. **핵심 WebRTC 훅 (가장 중요!)**
**위치**: `frontend/src/hooks/useLiveWebRTC.ts` (769줄)

**역할**: 
- RTCPeerConnection 생성 및 관리
- Socket.io를 통한 WebRTC 시그널링 (offer/answer/ICE candidate)
- 원격 스트림 수신 및 관리
- P2P 연결 설정

**주요 내용**:
```typescript
// RTCPeerConnection 생성
peer = new RTCPeerConnection({ iceServers: ICE_SERVERS });

// Offer/Answer/ICE candidate 처리
socket.on("webrtc:offer", handleOffer);
socket.on("webrtc:answer", handleAnswer);
socket.on("webrtc:ice-candidate", handleIceCandidate);

// 원격 스트림 수신
peer.ontrack = (event) => { ... };
```

---

### 2. **교수자 페이지에서 사용**
**위치**: `frontend/src/pages/professor/RealtimeDashboard.tsx`

**WebRTC 사용 부분**:
```typescript
// 라인 156-167: useLiveWebRTC 훅 사용
const {
  remoteParticipants,  // 학생들의 스트림
  status: webrtcStatus,
  error: webrtcError,
} = useLiveWebRTC({
  lectureId: resolvedLectureId,
  classId: resolvedClassId,
  liveId: resolvedLiveId ?? null,
  role: "professor",
  userId: user?.id,
  localStreams: [cameraStream, screenStream], // 교수자의 카메라 + 화면 공유
});

// remoteParticipants를 ParticipantStrip에 전달하여 학생 카메라 표시
<ParticipantStrip
  remoteParticipants={remoteParticipants}
  ...
/>
```

**로컬 스트림 관리** (WebRTC와는 별개):
- 카메라 스트림: `startCamera()` 함수 (라인 172-210)
- 화면 공유 스트림: `startScreenShare()` 함수 (라인 525-611)
- 이 스트림들이 `localStreams`로 `useLiveWebRTC`에 전달됨

---

### 3. **학생 페이지에서 사용**
**위치**: `frontend/src/pages/student/LiveWatching.tsx`

**WebRTC 사용 부분**:
```typescript
// 라인 148-165: useLiveWebRTC 훅 사용
const {
  remoteParticipants,  // 교수자의 스트림들
  status: webrtcStatus,
  error: webrtcError,
} = useLiveWebRTC({
  lectureId: lectureInfo?.lectureId,
  classId: lectureInfo?.classId,
  liveId: lectureInfo?.liveId ?? null,
  role: "student",
  userId: user?.id,
  localStreams: studentLocalStream ? [studentLocalStream] : [],
  enabled: !!lectureInfo?.isLiveActive,
  autoInitiate: false, // 학생은 offer를 보내지 않음
});

// 라인 168-409: 원격 스트림을 video 요소에 연결
useEffect(() => {
  // remoteParticipants에서 교수자의 화면 공유 스트림 찾기
  // remoteParticipants에서 교수자의 카메라 스트림 찾기
  // 각각 videoRef와 professorVideoRef에 연결
}, [remoteParticipants]);
```

---

### 4. **백엔드 WebRTC 시그널링 서버**
**위치**: `backend/socket/index.js` (라인 185-210)

**역할**: WebRTC 시그널링 메시지 중계

```javascript
// Offer 전송
socket.on("webrtc:offer", ({ to, sdp, meta }) => {
  io.to(to).emit("webrtc:offer", {
    from: socket.id,
    sdp,
    meta: meta || {},
  });
});

// Answer 전송
socket.on("webrtc:answer", ({ to, sdp, meta }) => {
  io.to(to).emit("webrtc:answer", {
    from: socket.id,
    sdp,
    meta: meta || {},
  });
});

// ICE Candidate 전송
socket.on("webrtc:ice-candidate", ({ to, candidate, meta }) => {
  io.to(to).emit("webrtc:ice-candidate", {
    from: socket.id,
    candidate,
    meta: meta || {},
  });
});
```

---

### 5. **참여자 표시 컴포넌트**
**위치**: 
- `frontend/src/components/live/professor/ParticipantStrip.tsx`
- `frontend/src/components/live/student/StudentParticipantStrip.tsx`

**역할**: WebRTC로 받은 `remoteParticipants`를 화면에 표시

---

## 🔄 WebRTC 흐름도

```
┌─────────────────────────────────────────────────────────┐
│              useLiveWebRTC.ts (핵심 훅)                   │
│  - RTCPeerConnection 생성                                 │
│  - Socket.io 시그널링                                     │
│  - 원격 스트림 수신                                        │
└─────────────────────────────────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
        ▼                       ▼
┌───────────────┐      ┌───────────────┐
│ Realtime      │      │ LiveWatching  │
│ Dashboard     │      │ (학생)        │
│ (교수자)      │      │               │
│               │      │               │
│ - 카메라      │      │ - 교수자      │
│ - 화면 공유   │      │   스트림 수신 │
│ - 학생 스트림 │      │ - 자신의      │
│   수신        │      │   카메라      │
└───────────────┘      └───────────────┘
        │                       │
        └───────────┬───────────┘
                    │
                    ▼
        ┌───────────────────────┐
        │  backend/socket/      │
        │  index.js             │
        │  (시그널링 중계)      │
        └───────────────────────┘
```

---

## 📝 중요 사항

### WebRTC vs 로컬 미디어 스트림

1. **로컬 미디어 스트림** (카메라/화면 공유):
   - `getUserMedia()` / `getDisplayMedia()`로 얻은 스트림
   - **위치**: `RealtimeDashboard.tsx`의 `startCamera()`, `startScreenShare()`
   - 또는 리팩토링 후: `useMediaStream`, `useScreenShare` 훅

2. **WebRTC P2P 연결**:
   - **위치**: `useLiveWebRTC.ts` (핵심!)
   - 로컬 스트림을 `localStreams`로 전달
   - 원격 스트림을 `remoteParticipants`로 받음

### 리팩토링 후 변경사항

- ✅ **변경 없음**: `useLiveWebRTC.ts` - WebRTC 핵심 로직은 그대로
- ✅ **변경 없음**: `RealtimeDashboard.tsx`, `LiveWatching.tsx`에서 `useLiveWebRTC` 사용하는 부분
- 🔄 **변경됨**: 로컬 미디어 스트림 관리 부분만 `useMediaStream`, `useScreenShare`로 분리 가능 (아직 적용 안 함)

---

## 🎯 요약

**WebRTC 핵심 코드는 `frontend/src/hooks/useLiveWebRTC.ts`에 있습니다!**

- 이 파일이 RTCPeerConnection을 생성하고 관리
- 이 파일이 Socket.io를 통해 시그널링 처리
- 이 파일이 원격 스트림을 수신

다른 파일들은 이 훅을 **사용**하는 곳입니다.

