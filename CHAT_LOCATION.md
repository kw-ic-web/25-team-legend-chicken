# 채팅 코드 위치 정리

## 📍 채팅 관련 코드가 있는 곳

### 1. **핵심 채팅 훅 (가장 중요!)**
**위치**: `frontend/src/hooks/useChatSocket.ts` (159줄)

**역할**: 
- Socket.io 채팅 연결 및 관리
- 메시지 전송/수신 로직
- 기존 메시지 로드 (REST API)
- 자동 스크롤 처리

**주요 내용**:
```typescript
// Socket.io 연결 및 룸 입장
socket.emit("live:join", { lecture_id, class_id, live_id, role, user_id });

// 메시지 전송
socket.emit("chat:send", { message: text.trim() });

// 메시지 수신
socket.on("chat:message", handleChatMessage);

// 기존 메시지 로드 (REST API)
const response = await getChatMessages({ lecture_id, class_id, live_id, limit: 50 });
```

---

### 2. **채팅 UI 컴포넌트**
**위치**: `frontend/src/components/live/common/ChatPanel.tsx` (128줄)

**역할**: 
- 채팅 메시지 표시 UI
- 메시지 입력 필드
- 전송 버튼
- 메시지 스타일링 (교수자/학생/본인 구분)

**주요 내용**:
```typescript
// 메시지 렌더링
{messages.map((msg) => {
  const isProfessor = msg.sender.role === "professor";
  const isOwnMessage = msg.sender.id === currentUserId;
  // ... 스타일링 및 표시
})}

// 입력 필드 및 전송 버튼
<input 
  value={currentMessage}
  onChange={(e) => onMessageChange(e.target.value)}
  onKeyDown={(e) => { if (e.key === "Enter") onSend(); }}
/>
```

---

### 3. **교수자 페이지에서 사용**
**위치**: `frontend/src/pages/professor/RealtimeDashboard.tsx`

**채팅 사용 부분** (기존 코드, 리팩토링 전):
```typescript
// 라인 855-947: Socket.io 채팅 연결 (기존 코드)
useEffect(() => {
  // Socket.io 연결
  // 메시지 로드
  // 이벤트 리스너
}, [dependencies]);

// 라인 766-835: 메시지 전송 함수
const handleSendMessage = useCallback(async () => {
  chatSocketRef.current.emit("chat:send", { message: messageText });
  // ...
}, [dependencies]);
```

**리팩토링 후 (권장)**:
```typescript
import { useChatSocket } from "../../hooks/useChatSocket";
import { ChatPanel } from "../../components/live/common/ChatPanel";

const {
  messages: chatMessages,
  sendMessage,
  isSending: isSendingMessage,
  containerRef: chatContainerRef,
} = useChatSocket({
  lectureId: resolvedLectureId,
  classId: resolvedClassId,
  liveId: resolvedLiveId,
  role: "professor",
  userId: user?.id,
});

// UI에서 사용
<ChatPanel
  messages={chatMessages}
  currentMessage={chatMessage}
  onMessageChange={setChatMessage}
  onSend={() => sendMessage(chatMessage)}
  isSending={isSendingMessage}
  currentUserId={user?.id}
  containerRef={chatContainerRef}
/>
```

---

### 4. **학생 페이지에서 사용**
**위치**: `frontend/src/pages/student/LiveWatching.tsx`

**채팅 사용 부분** (기존 코드, 리팩토링 전):
```typescript
// 라인 892-1077: Socket.io 채팅 연결 (기존 코드)
useEffect(() => {
  // Socket.io 연결
  // 메시지 로드
  // 이벤트 리스너
}, [lectureInfo, user?.id]);

// 라인 691-755: 메시지 전송 함수
const handleSendChatMessage = useCallback(async () => {
  chatSocketRef.current.emit("chat:send", { message: messageText });
  // ...
}, [dependencies]);
```

**리팩토링 후 (권장)**:
```typescript
import { useChatSocket } from "../../hooks/useChatSocket";
import { ChatPanel } from "../../components/live/common/ChatPanel";

const {
  messages: chatMessages,
  sendMessage,
  isSending: isSendingMessage,
  containerRef: chatContainerRef,
} = useChatSocket({
  lectureId: lectureInfo?.lectureId,
  classId: lectureInfo?.classId,
  liveId: lectureInfo?.liveId,
  role: "student",
  userId: user?.id,
  enabled: !!lectureInfo?.isLiveActive,
});

// UI에서 사용
<ChatPanel
  messages={chatMessages}
  currentMessage={chatMessage}
  onMessageChange={setChatMessage}
  onSend={() => sendMessage(chatMessage)}
  isSending={isSendingMessage}
  currentUserId={user?.id}
  containerRef={chatContainerRef}
/>
```

---

### 5. **백엔드 Socket.io 채팅 서버**
**위치**: `backend/socket/index.js` (라인 97-169)

**역할**: 실시간 채팅 메시지 처리 및 브로드캐스트

```javascript
// 메시지 수신 및 브로드캐스트
socket.on("chat:send", async ({ message }) => {
  // 1. 사용자 정보 조회
  const user = await User.findById(user_id);
  
  // 2. DB에 저장 (비동기)
  ChatMessage.create({
    lecture_id,
    class_id,
    live_id,
    text: messageText,
    sender: { id, name, role },
    timestamp: new Date(),
  });
  
  // 3. 실시간 브로드캐스트 (즉시 전송)
  io.to(liveRoom).emit("chat:message", payload);
  io.to(baseRoom).emit("chat:message", payload);
});
```

---

### 6. **백엔드 REST API (채팅 메시지 조회)**
**위치**: `backend/routes/chat.js`

**역할**: 
- 채팅 메시지 조회 (GET)
- REST API를 통한 메시지 전송 (POST) - Socket.io 대체용

**주요 엔드포인트**:
```javascript
// GET /api/chat - 메시지 조회
router.get("/", authenticateToken, async (req, res) => {
  // lecture_id, class_id, live_id로 필터링
  // limit, offset으로 페이징
  const messages = await ChatMessage.find({ ... }).sort({ timestamp: -1 });
});

// POST /api/chat - 메시지 전송 (REST API, Socket.io 대체용)
router.post("/", authenticateToken, rateLimitOnePerSecond, async (req, res) => {
  // DB에 저장
  const saved = await ChatMessage.create({ ... });
  
  // Socket.io로 브로드캐스트 (선택적)
  if (io) {
    io.to(liveRoom).emit("chat:message", messagePayload);
  }
});
```

---

### 7. **API 클라이언트**
**위치**: `frontend/src/api/chat.ts`

**역할**: REST API 호출 함수

```typescript
// 메시지 조회
export async function getChatMessages(params: {
  lecture_id: string;
  class_id: number;
  live_id?: number;
  limit?: number;
}): Promise<{ messages: ChatMessage[] }>;

// 메시지 전송 (REST API, Socket.io 대체용)
export async function sendChatMessage(params: {
  lecture_id: string;
  class_id: number;
  live_id?: number | null;
  text: string;
}): Promise<ChatMessage>;
```

---

### 8. **데이터 모델**
**위치**: `backend/models/ChatMessage.js`

**역할**: 채팅 메시지 데이터베이스 스키마

```javascript
const ChatMessageSchema = new Schema({
  lecture_id: String,
  class_id: Number,
  live_id: Number | null,
  text: String,
  sender: {
    id: String,
    name: String,
    role: String,
  },
  timestamp: Date,
  // ...
});
```

---

## 🔄 채팅 흐름도

```
┌─────────────────────────────────────────────────────────┐
│              useChatSocket.ts (핵심 훅)                   │
│  - Socket.io 연결                                         │
│  - 메시지 전송/수신                                       │
│  - 기존 메시지 로드                                       │
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
│ - ChatPanel   │      │ - ChatPanel   │
│   컴포넌트    │      │   컴포넌트    │
└───────────────┘      └───────────────┘
        │                       │
        └───────────┬───────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
        ▼                       ▼
┌───────────────┐      ┌───────────────┐
│ backend/      │      │ backend/      │
│ socket/       │      │ routes/       │
│ index.js      │      │ chat.js       │
│               │      │               │
│ - 실시간      │      │ - REST API    │
│   브로드캐스트│      │ - 메시지 조회 │
└───────────────┘      └───────────────┘
        │                       │
        └───────────┬───────────┘
                    │
                    ▼
        ┌───────────────────────┐
        │  models/              │
        │  ChatMessage.js      │
        │  (DB 스키마)         │
        └───────────────────────┘
```

---

## 📝 채팅 전송 흐름

### 1. **Socket.io를 통한 실시간 전송 (주요 방법)**

```
사용자 입력
    ↓
ChatPanel 컴포넌트
    ↓
useChatSocket.sendMessage()
    ↓
socket.emit("chat:send", { message })
    ↓
backend/socket/index.js
    ↓
1. DB에 저장 (비동기)
2. io.to(liveRoom).emit("chat:message", payload) - 즉시 브로드캐스트
    ↓
모든 클라이언트의 socket.on("chat:message") 수신
    ↓
useChatSocket의 handleChatMessage
    ↓
messages 상태 업데이트
    ↓
ChatPanel UI 업데이트
```

### 2. **REST API를 통한 전송 (대체 방법)**

```
사용자 입력
    ↓
sendChatMessage() API 호출
    ↓
POST /api/chat
    ↓
backend/routes/chat.js
    ↓
1. DB에 저장
2. Socket.io로 브로드캐스트 (선택적)
    ↓
모든 클라이언트에 실시간 전송
```

---

## 🎯 요약

**채팅 핵심 코드는 `frontend/src/hooks/useChatSocket.ts`에 있습니다!**

- 이 파일이 Socket.io 연결 및 메시지 전송/수신을 관리
- `ChatPanel` 컴포넌트가 UI를 담당
- 백엔드는 `backend/socket/index.js`에서 실시간 브로드캐스트 처리

### 리팩토링 상태

- ✅ **완료**: `useChatSocket` 훅 생성
- ✅ **완료**: `ChatPanel` 컴포넌트 생성
- ⚠️ **미적용**: `RealtimeDashboard.tsx`, `LiveWatching.tsx`에서 아직 기존 코드 사용 중
  - 리팩토링 가이드에 따라 새 훅과 컴포넌트로 교체 가능

---

## 🔍 주요 파일 위치 요약

| 기능 | 파일 경로 | 라인 번호 |
|------|----------|-----------|
| 채팅 훅 | `frontend/src/hooks/useChatSocket.ts` | 전체 |
| 채팅 UI | `frontend/src/components/live/common/ChatPanel.tsx` | 전체 |
| Socket.io 서버 | `backend/socket/index.js` | 97-169 |
| REST API | `backend/routes/chat.js` | 전체 |
| API 클라이언트 | `frontend/src/api/chat.ts` | 전체 |
| 데이터 모델 | `backend/models/ChatMessage.js` | 전체 |
| 교수자 사용 | `frontend/src/pages/professor/RealtimeDashboard.tsx` | 855-947 (기존) |
| 학생 사용 | `frontend/src/pages/student/LiveWatching.tsx` | 892-1077 (기존) |

