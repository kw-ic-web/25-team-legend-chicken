# 라이브 관련 프론트엔드 API 가이드

## 📡 REST API

### 1. 라이브 시작 (교수만)
**POST** `/api/professor/lectures/{lectureId}/classes/{classId}/live/start`

**Headers:**
```
Authorization: Bearer {token}
```

**Response (200):**
```json
{
  "message": "라이브가 시작되었습니다.",
  "lecture_id": "LEC-32AEBA14",
  "class_id": 1,
  "live_id": 1,
  "started_at": "2025-11-17T06:04:27.947Z",
  "live_path": "/professor/lectureLEC-32AEBA14/class1/live1"
}
```

**에러:**
- `403`: 교수만 가능
- `404`: 강좌/클래스를 찾을 수 없음
- `409`: 이미 진행 중인 라이브가 있음

---

### 2. 라이브 종료 (교수만)
**POST** `/api/professor/lectures/{lectureId}/classes/{classId}/live/end`

**Headers:**
```
Authorization: Bearer {token}
```

**Response (200):**
```json
{
  "message": "라이브가 종료되었습니다.",
  "lecture_id": "LEC-32AEBA14",
  "class_id": 1,
  "live_id": 1,
  "started_at": "2025-11-17T06:04:27.947Z",
  "ended_at": "2025-11-17T08:00:00.000Z"
}
```

**에러:**
- `403`: 교수만 가능
- `404`: 강좌/클래스를 찾을 수 없음
- `409`: 진행 중인 라이브가 없음

---

### 3. 현재 라이브 상태 조회 (교수/학생)
**GET** `/api/professor/lectures/{lectureId}/classes/{classId}/live/current`

**Headers:**
```
Authorization: Bearer {token}
```

**Response (200) - 라이브 진행 중:**
```json
{
  "active": true,
  "lecture_id": "LEC-32AEBA14",
  "class_id": 1,
  "live_id": 1,
  "started_at": "2025-11-17T06:04:27.947Z",
  "live_path": "/professor/lectureLEC-32AEBA14/class1/live1"
}
```

**Response (200) - 라이브 없음:**
```json
{
  "active": false
}
```

---

### 4. 강좌 전체 라이브 상태 조회 (교수/학생)
**GET** `/api/professor/lectures/{lectureId}/live-status`

**Headers:**
```
Authorization: Bearer {token}
```

**Response (200):**
```json
{
  "lecture_id": "LEC-32AEBA14",
  "lecture_name": "웹서비스설계및실습",
  "classes": [
    {
      "class_id": 1,
      "class_title": "Orientation, 웹기초",
      "isLiveActive": true,
      "currentLiveId": 1,
      "lives": [
        {
          "liveId": 1,
          "status": "open",
          "startedAt": "2025-11-17T06:04:27.947Z",
          "endedAt": null
        }
      ]
    },
    {
      "class_id": 2,
      "class_title": "동적웹과 개발 환경",
      "isLiveActive": false,
      "currentLiveId": null,
      "lives": []
    }
  ]
}
```

---

## 🔌 Socket.IO 이벤트

### 연결 설정
```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:8080', {
  auth: {
    token: 'your-jwt-token' // 필요시
  }
});
```

---

### 1. 라이브 룸 입장
**Emit:** `live:join`

```javascript
socket.emit('live:join', {
  lecture_id: 'LEC-32AEBA14',
  class_id: 1,
  live_id: 1,        // 라이브 없으면 null
  role: 'student',   // 'professor' or 'student'
  user_id: 'user_id_string'
});
```

**Listen:** `live:user-joined`
```javascript
socket.on('live:user-joined', (data) => {
  console.log('사용자 입장:', data);
  // {
  //   socket_id: "socket_id",
  //   lecture_id: "LEC-32AEBA14",
  //   class_id: 1,
  //   live_id: 1,
  //   role: "student",
  //   user_id: "user_id"
  // }
});
```

---

### 2. 라이브 시작 알림 (서버 → 클라이언트)
**Listen:** `live:started`

```javascript
socket.on('live:started', (data) => {
  console.log('라이브 시작됨:', data);
  // {
  //   lecture_id: "LEC-32AEBA14",
  //   class_id: 1,
  //   live_id: 1,
  //   started_at: "2025-11-17T06:04:27.947Z",
  //   live_path: "/professor/lectureLEC-32AEBA14/class1/live1",
  //   professor: {
  //     id: "professor_id",
  //     name: "교수 이름"
  //   }
  // }
  
  // UI 업데이트: 라이브 시작 알림 표시
  // 라이브 페이지로 리다이렉트 또는 상태 업데이트
});
```

---

### 3. 라이브 종료 알림 (서버 → 클라이언트)
**Listen:** `live:ended`

```javascript
socket.on('live:ended', (data) => {
  console.log('라이브 종료됨:', data);
  // {
  //   lecture_id: "LEC-32AEBA14",
  //   class_id: 1,
  //   live_id: 1,
  //   started_at: "2025-11-17T06:04:27.947Z",
  //   ended_at: "2025-11-17T08:00:00.000Z",
  //   professor: {
  //     id: "professor_id",
  //     name: "교수 이름"
  //   }
  // }
  
  // UI 업데이트: 라이브 종료 알림 표시
  // WebRTC 연결 종료
});
```

---

### 4. 사용자 퇴장 알림
**Listen:** `live:user-left`

```javascript
socket.on('live:user-left', (data) => {
  console.log('사용자 퇴장:', data);
  // {
  //   socket_id: "socket_id",
  //   lecture_id: "LEC-32AEBA14",
  //   class_id: 1,
  //   live_id: 1,
  //   role: "student",
  //   user_id: "user_id"
  // }
  
  // WebRTC 연결 종료 처리
  // 참여자 목록에서 제거
});
```

---

## 🎥 WebRTC 시그널링 이벤트

### 1. WebRTC Offer 전송
**Emit:** `webrtc:offer`

```javascript
socket.emit('webrtc:offer', {
  to: 'remote_socket_id',  // 상대방 socket.id
  sdp: offerSDP,           // RTCPeerConnection.createOffer() 결과
  meta: {                   // 선택적 메타데이터
    type: 'video',
    streamId: 'stream_id'
  }
});
```

**Listen:** `webrtc:offer`

```javascript
socket.on('webrtc:offer', ({ from, sdp, meta }) => {
  console.log('Offer 수신:', from, sdp);
  
  // RTCPeerConnection에 offer 설정
  await peerConnection.setRemoteDescription(new RTCSessionDescription(sdp));
  
  // Answer 생성 및 전송
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);
  
  socket.emit('webrtc:answer', {
    to: from,
    sdp: answer
  });
});
```

---

### 2. WebRTC Answer 전송
**Emit:** `webrtc:answer`

```javascript
socket.emit('webrtc:answer', {
  to: 'remote_socket_id',
  sdp: answerSDP,           // RTCPeerConnection.createAnswer() 결과
  meta: {}
});
```

**Listen:** `webrtc:answer`

```javascript
socket.on('webrtc:answer', ({ from, sdp, meta }) => {
  console.log('Answer 수신:', from, sdp);
  
  // RTCPeerConnection에 answer 설정
  await peerConnection.setRemoteDescription(new RTCSessionDescription(sdp));
});
```

---

### 3. ICE Candidate 전송
**Emit:** `webrtc:ice-candidate`

```javascript
// RTCPeerConnection에서 ICE candidate 이벤트 발생 시
peerConnection.onicecandidate = (event) => {
  if (event.candidate) {
    socket.emit('webrtc:ice-candidate', {
      to: 'remote_socket_id',
      candidate: event.candidate,
      meta: {}
    });
  }
};
```

**Listen:** `webrtc:ice-candidate`

```javascript
socket.on('webrtc:ice-candidate', ({ from, candidate, meta }) => {
  console.log('ICE Candidate 수신:', from, candidate);
  
  // RTCPeerConnection에 ICE candidate 추가
  await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
});
```

---

## 📝 사용 예시 (전체 플로우)

### 교수: 라이브 시작
```javascript
// 1. REST API로 라이브 시작
const response = await fetch(
  `/api/professor/lectures/${lectureId}/classes/${classId}/live/start`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }
);
const { live_id } = await response.json();

// 2. Socket.IO로 라이브 룸 입장
socket.emit('live:join', {
  lecture_id: lectureId,
  class_id: classId,
  live_id: live_id,
  role: 'professor',
  user_id: userId
});

// 3. WebRTC 스트림 시작
// getUserMedia() → RTCPeerConnection 생성 → 시그널링
```

### 학생: 라이브 참여
```javascript
// 1. 현재 라이브 상태 확인
const response = await fetch(
  `/api/professor/lectures/${lectureId}/classes/${classId}/live/current`,
  {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }
);
const { active, live_id } = await response.json();

if (active) {
  // 2. Socket.IO로 라이브 룸 입장
  socket.emit('live:join', {
    lecture_id: lectureId,
    class_id: classId,
    live_id: live_id,
    role: 'student',
    user_id: userId
  });
  
  // 3. WebRTC 연결 대기 및 수신
  // RTCPeerConnection 생성 → offer/answer/ICE candidate 교환
}
```

---

## 🔔 실시간 이벤트 리스너 등록 예시

```javascript
// 라이브 시작/종료 알림
socket.on('live:started', handleLiveStarted);
socket.on('live:ended', handleLiveEnded);

// 사용자 입장/퇴장
socket.on('live:user-joined', handleUserJoined);
socket.on('live:user-left', handleUserLeft);

// WebRTC 시그널링
socket.on('webrtc:offer', handleWebRTCOffer);
socket.on('webrtc:answer', handleWebRTCAnswer);
socket.on('webrtc:ice-candidate', handleWebRTCIceCandidate);
```

---

## ⚠️ 주의사항

1. **Socket.IO 연결**: 라이브 시작 전에 Socket.IO 연결이 되어 있어야 합니다.
2. **토큰 인증**: REST API와 Socket.IO 모두 JWT 토큰 인증이 필요합니다.
3. **룸 관리**: `live:join`으로 룸에 입장해야 실시간 이벤트를 받을 수 있습니다.
4. **WebRTC 연결**: Socket.IO는 시그널링만 담당하며, 실제 미디어 스트림은 P2P로 전송됩니다.
5. **에러 처리**: 네트워크 오류, 권한 오류 등에 대한 적절한 에러 처리가 필요합니다.

