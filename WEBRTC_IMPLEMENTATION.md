# WebRTC 구현 현황 정리

## 📁 파일 구조

### Frontend (React/TypeScript)

#### 1. **핵심 WebRTC Hook**
- **위치**: `frontend/src/hooks/useLiveWebRTC.ts`
- **역할**: WebRTC 연결 관리 커스텀 훅
- **주요 기능**:
  - RTCPeerConnection 생성 및 관리
  - Socket.io를 통한 시그널링 (offer/answer/ICE candidate)
  - 로컬/원격 스트림 관리
  - 다중 참여자 지원 (여러 스트림 저장)
  - 자동 재연결 및 에러 처리
- **반환값**:
  - `socketId`: 현재 Socket.io 연결 ID
  - `status`: 연결 상태 ("idle" | "connecting" | "connected" | "error")
  - `error`: 에러 메시지
  - `remoteParticipants`: 원격 참여자 목록
  - `isConnected`: 연결 여부

#### 2. **교수자 실시간 대시보드**
- **위치**: `frontend/src/pages/professor/RealtimeDashboard.tsx`
- **역할**: 교수자 라이브 방송 메인 페이지
- **WebRTC 사용**:
  - `useLiveWebRTC` 훅 사용
  - 카메라 스트림 (`getUserMedia`)
  - 화면 공유 스트림 (`getDisplayMedia`)
  - 로컬 스트림을 `localStreams` prop으로 전달
  - `remoteParticipants`로 학생 카메라 수신
- **주요 기능**:
  - 웹캠 시작/중지
  - 화면 공유 시작/중지
  - 마이크 제어
  - 학생 참여자 목록 표시

#### 3. **학생 라이브 시청 페이지**
- **위치**: `frontend/src/pages/student/LiveWatching.tsx`
- **역할**: 학생이 라이브 방송을 시청하는 페이지
- **WebRTC 사용**:
  - `useLiveWebRTC` 훅 사용
  - 학생 카메라 스트림 (`getUserMedia`)
  - 교수자 카메라/화면 공유 수신
  - `autoInitiate: false` (학생은 offer를 보내지 않음)
- **주요 기능**:
  - 교수자 화면 공유 수신 및 표시
  - 교수자 카메라 수신 및 표시
  - 학생 카메라/마이크 제어
  - PDF 공유 수신

#### 4. **참여자 스트립 컴포넌트 (교수자)**
- **위치**: `frontend/src/components/live/professor/ParticipantStrip.tsx`
- **역할**: 교수자 화면에서 참여자 목록 표시
- **WebRTC 관련**:
  - `RemoteParticipant[]` 타입 사용
  - 학생 카메라 스트림을 video 요소에 연결
  - 화면 공유와 카메라 스트림 구분
  - 카메라가 꺼진 학생도 이름 표시

#### 5. **참여자 스트립 컴포넌트 (학생)**
- **위치**: `frontend/src/components/live/student/StudentParticipantStrip.tsx`
- **역할**: 학생 화면에서 참여자 목록 표시
- **WebRTC 관련**:
  - 교수자 카메라 스트림 표시
  - 다른 학생 카메라 스트림 표시
  - 자신의 카메라 스트림 표시

#### 6. **방송 설정 모달**
- **위치**: `frontend/src/components/modal/startBroadcast/BroadcastSettingsModal.tsx`
- **역할**: 라이브 방송 시작 전 설정
- **WebRTC 관련**:
  - 웹캠 미리보기 (`getUserMedia`)
  - 오디오 레벨 모니터링

### Backend (Node.js/Socket.io)

#### 1. **Socket.io 서버**
- **위치**: `backend/socket/index.js`
- **역할**: WebRTC 시그널링 서버
- **주요 이벤트**:
  - `webrtc:offer`: Offer SDP 전송
  - `webrtc:answer`: Answer SDP 전송
  - `webrtc:ice-candidate`: ICE candidate 전송
  - `live:join`: 라이브 룸 입장
  - `live:user-joined`: 사용자 입장 알림
  - `live:user-left`: 사용자 퇴장 알림

#### 2. **API 문서**
- **위치**: `backend/docs/FRONTEND_API_LIVE.md`
- **내용**: WebRTC 시그널링 이벤트 사용법 및 예시

## 🔧 주요 구현 세부사항

### 1. ICE 서버 설정
```typescript
const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
];
```
- **위치**: `frontend/src/hooks/useLiveWebRTC.ts:43-47`
- Google STUN 서버 사용 (TURN 서버 없음)

### 2. Peer Connection 생성
```typescript
peer = new RTCPeerConnection({ iceServers: ICE_SERVERS });
```
- **위치**: `frontend/src/hooks/useLiveWebRTC.ts:264`
- 각 원격 참여자마다 별도의 RTCPeerConnection 생성

### 3. 시그널링 플로우
1. **교수자 (Offerer)**:
   - `live:join` 이벤트로 룸 입장
   - 학생 입장 시 `live:user-joined` 수신
   - `sendOffer()` 호출하여 Offer 생성 및 전송
   - Answer 수신 후 연결 완료

2. **학생 (Answerer)**:
   - `live:join` 이벤트로 룸 입장
   - Offer 수신 시 `handleOffer()` 호출
   - Answer 생성 및 전송
   - 연결 완료

### 4. 스트림 관리
- **로컬 스트림**: `localStreamsRef`에 저장
- **원격 스트림**: `remoteStreamRef`에 Map 형태로 저장 (socketId → MediaStream[])
- **다중 스트림 지원**: 한 참여자가 카메라와 화면 공유를 동시에 전송 가능

### 5. 트랙 동기화
- `syncLocalTracks()`: 로컬 스트림 변경 시 모든 peer에 트랙 추가/제거
- 트랙 enabled 상태 동기화

### 6. 재협상 (Renegotiation)
- `onnegotiationneeded` 이벤트 처리
- 교수자는 자동으로 offer 전송
- 학생도 재협상 시 offer 전송 가능 (`force: true`)

### 7. 연결 상태 관리
- `connectionState`: "connected" | "disconnected" | "failed" 등
- `iceConnectionState`: ICE 연결 상태
- 실패 시 자동으로 peer 정리

## 📡 Socket.io 이벤트 흐름

### 교수자 → 학생
1. 교수자: `live:join` → 서버
2. 서버: `live:user-joined` → 학생들에게 브로드캐스트
3. 교수자: `webrtc:offer` → 서버 → 학생
4. 학생: `webrtc:answer` → 서버 → 교수자
5. 양방향: `webrtc:ice-candidate` 교환
6. 연결 완료: `ontrack` 이벤트로 스트림 수신

### 학생 → 교수자
1. 학생: `live:join` → 서버
2. 서버: `live:user-joined` → 교수자에게 브로드캐스트
3. 교수자: `webrtc:offer` → 서버 → 학생
4. 학생: `webrtc:answer` → 서버 → 교수자
5. 양방향: `webrtc:ice-candidate` 교환
6. 연결 완료: `ontrack` 이벤트로 스트림 수신

## 🎯 주요 기능

### ✅ 구현된 기능
1. **P2P 연결**: 교수자 ↔ 학생 간 직접 연결
2. **다중 참여자**: 여러 학생 동시 연결 지원
3. **카메라/마이크**: 양방향 오디오/비디오 통신
4. **화면 공유**: 교수자 화면 공유 지원
5. **자동 재연결**: Socket.io 재연결 시 자동 복구
6. **스트림 구분**: 카메라와 화면 공유 스트림 구분
7. **에러 처리**: 연결 실패 시 적절한 에러 메시지

### ⚠️ 제한사항
1. **TURN 서버 없음**: STUN만 사용 (NAT 우회 제한적)
2. **다른 컴퓨터 접속 시 문제**: 네트워크 환경에 따라 연결 실패 가능
3. **재연결 로직**: 완전히 구현되었지만 네트워크 불안정 시 문제 가능

## 🔍 코드 위치 요약

| 기능 | 파일 경로 | 라인 번호 |
|------|----------|-----------|
| WebRTC Hook | `frontend/src/hooks/useLiveWebRTC.ts` | 전체 |
| ICE 서버 설정 | `frontend/src/hooks/useLiveWebRTC.ts` | 43-47 |
| Peer Connection 생성 | `frontend/src/hooks/useLiveWebRTC.ts` | 259-405 |
| Offer 전송 | `frontend/src/hooks/useLiveWebRTC.ts` | 193-257 |
| Answer 처리 | `frontend/src/hooks/useLiveWebRTC.ts` | 437-532 |
| ICE Candidate 처리 | `frontend/src/hooks/useLiveWebRTC.ts` | 594-632 |
| Socket.io 시그널링 | `backend/socket/index.js` | 185-210 |
| 교수자 WebRTC 사용 | `frontend/src/pages/professor/RealtimeDashboard.tsx` | 151-167, 172-286 |
| 학생 WebRTC 사용 | `frontend/src/pages/student/LiveWatching.tsx` | 145-165, 789-870 |
| 참여자 표시 (교수) | `frontend/src/components/live/professor/ParticipantStrip.tsx` | 전체 |
| 참여자 표시 (학생) | `frontend/src/components/live/student/StudentParticipantStrip.tsx` | 전체 |

## 📝 타입 정의

### RemoteParticipant
```typescript
export type RemoteParticipant = {
  socketId: string;
  stream: MediaStream;
  role?: UserRole;
  userId?: string;
};
```

### WebRTCStatus
```typescript
export type WebRTCStatus = "idle" | "connecting" | "connected" | "error";
```

### UseLiveWebRTCOptions
```typescript
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
```

## 🚀 사용 예시

### 교수자
```typescript
const { remoteParticipants } = useLiveWebRTC({
  lectureId: "LEC-XXX",
  classId: 1,
  liveId: 1,
  role: "professor",
  userId: user?.id,
  localStreams: [cameraStream, screenStream],
});
```

### 학생
```typescript
const { remoteParticipants } = useLiveWebRTC({
  lectureId: "LEC-XXX",
  classId: 1,
  liveId: 1,
  role: "student",
  userId: user?.id,
  localStreams: studentLocalStream ? [studentLocalStream] : [],
  autoInitiate: false,
});
```

