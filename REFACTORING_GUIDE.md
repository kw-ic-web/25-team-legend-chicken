# 코드 리팩토링 가이드

## 생성된 파일

### 커스텀 훅
1. **`frontend/src/hooks/useChatSocket.ts`**
   - Socket.io 채팅 연결 및 메시지 관리
   - 메시지 전송/수신 로직 캡슐화
   - 자동 스크롤 처리

2. **`frontend/src/hooks/useMediaStream.ts`**
   - 카메라/마이크 스트림 관리
   - 카메라/마이크 토글 기능
   - 오디오 레벨 모니터링

3. **`frontend/src/hooks/useScreenShare.ts`**
   - 화면 공유 스트림 관리
   - 자동 정리 (탭 숨김, 페이지 이탈 시)

### 컴포넌트
4. **`frontend/src/components/live/common/ChatPanel.tsx`**
   - 재사용 가능한 채팅 패널 컴포넌트
   - 메시지 렌더링 및 입력 UI

### 유틸리티
5. **`frontend/src/utils/streamUtils.ts`**
   - 스트림 구분 로직 (화면 공유 vs 카메라)
   - 재사용 가능한 유틸리티 함수

## 리팩토링 적용 방법

### RealtimeDashboard.tsx

#### Before (기존 코드)
```typescript
// 200+ 줄의 미디어 스트림 관리 코드
const startCamera = useCallback(async () => { ... });
const stopCamera = useCallback(() => { ... });
const toggleMic = useCallback(() => { ... });
// ... 많은 중복 코드

// 100+ 줄의 Socket.io 채팅 코드
useEffect(() => {
  // Socket.io 연결
  // 메시지 로드
  // 이벤트 리스너
}, [dependencies]);
```

#### After (리팩토링 후)
```typescript
import { useChatSocket } from "../../hooks/useChatSocket";
import { useMediaStream } from "../../hooks/useMediaStream";
import { useScreenShare } from "../../hooks/useScreenShare";
import { ChatPanel } from "../../components/live/common/ChatPanel";

const RealtimeDashboard: React.FC = () => {
  // 미디어 스트림 관리
  const {
    stream: cameraStream,
    isCameraOn,
    isMicOn,
    startCamera,
    stopCamera,
    toggleMic,
    toggleCamera,
  } = useMediaStream({
    videoRef,
    onError: showError,
  });

  // 화면 공유 관리
  const {
    isSharing,
    stream: screenStream,
    startScreenShare,
    stopScreenShare,
  } = useScreenShare({
    videoRef: shareVideoRef,
    onError: showError,
  });

  // 채팅 관리
  const {
    messages: chatMessages,
    sendMessage,
    isSending: isSendingMessage,
    socket: chatSocket,
    containerRef: chatContainerRef,
  } = useChatSocket({
    lectureId: resolvedLectureId,
    classId: resolvedClassId,
    liveId: resolvedLiveId,
    role: "professor",
    userId: user?.id,
  });

  // ... 나머지 로직

  return (
    // ...
    <ChatPanel
      messages={chatMessages}
      currentMessage={chatMessage}
      onMessageChange={setChatMessage}
      onSend={() => sendMessage(chatMessage)}
      isSending={isSendingMessage}
      currentUserId={user?.id}
      containerRef={chatContainerRef}
    />
  );
};
```

### LiveWatching.tsx

#### Before (기존 코드)
```typescript
// 400+ 줄의 스트림 구분 및 연결 로직
useEffect(() => {
  // 화면 공유 스트림 찾기
  // 카메라 스트림 찾기
  // 복잡한 로직...
}, [remoteParticipants]);
```

#### After (리팩토링 후)
```typescript
import { getScreenShareStream, getCameraStream } from "../../utils/streamUtils";
import { useChatSocket } from "../../hooks/useChatSocket";
import { ChatPanel } from "../../components/live/common/ChatPanel";

const LiveWatching: React.FC = () => {
  // 채팅 관리
  const {
    messages: chatMessages,
    sendMessage,
    isSending: isSendingMessage,
    socket: chatSocket,
    containerRef: chatContainerRef,
  } = useChatSocket({
    lectureId: lectureInfo?.lectureId,
    classId: lectureInfo?.classId,
    liveId: lectureInfo?.liveId,
    role: "student",
    userId: user?.id,
    enabled: !!lectureInfo?.isLiveActive,
  });

  // 스트림 구분 (간단해짐)
  useEffect(() => {
    const streams = remoteParticipants.map((p) => p.stream);
    const screenShareStream = getScreenShareStream(streams);
    const cameraStream = getCameraStream(streams, new Set([screenShareStream?.id].filter(Boolean)));

    if (screenShareStream && videoRef.current) {
      videoRef.current.srcObject = screenShareStream;
    }
    if (cameraStream && professorVideoRef.current) {
      professorVideoRef.current.srcObject = cameraStream;
    }
  }, [remoteParticipants]);

  return (
    // ...
    <ChatPanel
      messages={chatMessages}
      currentMessage={chatMessage}
      onMessageChange={setChatMessage}
      onSend={() => sendMessage(chatMessage)}
      isSending={isSendingMessage}
      currentUserId={user?.id}
      containerRef={chatContainerRef}
    />
  );
};
```

## 주요 개선사항

### 1. 코드 길이 감소
- **RealtimeDashboard.tsx**: ~1520줄 → ~800줄 (예상)
- **LiveWatching.tsx**: ~1335줄 → ~700줄 (예상)

### 2. 재사용성 향상
- 커스텀 훅을 다른 컴포넌트에서도 사용 가능
- ChatPanel 컴포넌트 재사용 가능

### 3. 유지보수성 향상
- 로직이 명확하게 분리됨
- 테스트하기 쉬워짐
- 버그 수정이 용이함

### 4. 가독성 향상
- 각 훅이 단일 책임을 가짐
- 컴포넌트 코드가 간결해짐

## 다음 단계

1. **RealtimeDashboard.tsx 리팩토링 적용**
   - 기존 코드를 새로운 훅으로 교체
   - ChatPanel 컴포넌트 사용

2. **LiveWatching.tsx 리팩토링 적용**
   - 스트림 구분 로직을 streamUtils 사용
   - ChatPanel 컴포넌트 사용

3. **추가 개선사항**
   - useQuestions 훅 생성 (질문 관리)
   - QuestionsPanel 컴포넌트 생성
   - PDF 관리 로직 분리

## 주의사항

- 기존 기능이 정상 작동하는지 테스트 필요
- WebRTC 연결 로직은 그대로 유지
- Socket.io 이벤트 리스너는 기존과 동일하게 작동

