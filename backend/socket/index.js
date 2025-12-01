// backend/socket/index.js
const { Server } = require("socket.io");

function attachSocket(server, corsOrigin = "*") {
  const io = new Server(server, {
    cors: {
      origin: corsOrigin,
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log("[socket] connected:", socket.id);

      // 공통: 라이브 룸 입장 처리 함수 추가
    function joinLiveRoom({ lecture_id, class_id, live_id, user_id }, forcedRole) {
      if (!lecture_id) return;

      // class_id가 0이면 강좌 전체의 baseRoom에 join (모든 클래스의 라이브 이벤트 수신)
      if (class_id === 0 || class_id === null || class_id === undefined) {
        const lectureRoom = `lec:${lecture_id}`;
        socket.join(lectureRoom);
        socket.data = { lecture_id, class_id: null, live_id: null, role: forcedRole, user_id };
        console.log("[live:join] lecture-wide", forcedRole, socket.id, "->", lectureRoom);
        return;
      }

      const baseRoom = `lec:${lecture_id}:cls:${class_id}`;
      const liveRoom =
        live_id === null || typeof live_id === "undefined"
          ? `${baseRoom}:live:none`
          : `${baseRoom}:live:${live_id}`;

      socket.join(baseRoom);
      socket.join(liveRoom);

      const role = forcedRole; // role은 서버에서 강제
      socket.data = { lecture_id, class_id, live_id, role, user_id };

      console.log(
        "[live:join]",
        role,
        socket.id,
        "->",
        baseRoom,
        ",",
        liveRoom
      );

      io.to(liveRoom).emit("live:user-joined", {
        socket_id: socket.id,
        lecture_id,
        class_id,
        live_id,
        role,
        user_id,
      });
    }

    // ─────────────────────────────────────────────
    // 공통: 라이브 페이지 입장 (질문/채팅/WebRTC 모두 같은 룸 사용)
    // ─────────────────────────────────────────────
    // front 예시:
    // socket.emit("live:join", {
    //   lecture_id: "LEC-XXXX",
    //   class_id: 1,
    //   live_id: 1,         // 라이브 없으면 null
    //   role: "student",    // or "professor"
    //   user_id: "..."      // 사용자 _id
    // });
    // ✅ 공통 입장 (role 자동 감지)
    socket.on("live:join", (payload) => {
      const role = payload.role || "student"; // 기본값은 student
      if (role === "professor" || role === "student") {
        joinLiveRoom(payload, role);
      } else {
        console.warn("[socket] Invalid role in live:join:", role);
      }
    });

    // ✅ 학생 입장
    // socket.emit("live:join-student", { lecture_id, class_id, live_id, user_id });
    socket.on("live:join-student", (payload) => {
      joinLiveRoom(payload, "student");
    });

    // ✅ 교수 입장
    // socket.emit("live:join-professor", { lecture_id, class_id, live_id, user_id });
    socket.on("live:join-professor", (payload) => {
      joinLiveRoom(payload, "professor");
    });

        // ─────────────────────────────────────────────
// ─────────────────────────────────────────────
// ✅ 실시간 채팅 (Socket.io + DB 저장)
// ─────────────────────────────────────────────
socket.on("chat:send", async ({ message }) => {
  if (!message || String(message).trim().length === 0) return;

  const { lecture_id, class_id, live_id, user_id, role } = socket.data || {};
  if (!lecture_id || !class_id || !user_id) {
    console.warn("[chat:send] Missing socket.data:", { lecture_id, class_id, user_id });
    return;
  }

  const baseRoom = `lec:${lecture_id}:cls:${class_id}`;
  const liveRoom =
    live_id === null || typeof live_id === "undefined"
      ? `${baseRoom}:live:none`
      : `${baseRoom}:live:${live_id}`;

  const messageText = String(message).trim();
  
  // 사용자 정보 가져오기
  const User = require("../models/User");
  let userName = "사용자";
  let userRole = role || "student";
  
  try {
    const user = await User.findById(user_id);
    if (user) {
      userName = user.name || "사용자";
      userRole = user.user_type || role || "student";
    }
  } catch (err) {
    console.warn("[chat:send] 사용자 정보 조회 실패:", err);
  }
  
  // DB에 저장 (비동기, 에러가 나도 실시간 전송은 계속)
  const ChatMessage = require("../models/ChatMessage");
  ChatMessage.create({
    lecture_id,
    class_id: Number(class_id),
    live_id: live_id === null ? null : Number(live_id),
    text: messageText,
    sender: {
      id: String(user_id),
      name: userName,
      role: userRole,
    },
    timestamp: new Date(),
  }).catch((err) => {
    console.error("[chat:send] DB 저장 실패:", err);
  });

  // 실시간 브로드캐스트 (DB 저장과 독립적으로 즉시 전송)
  const payload = {
    _id: `temp_${Date.now()}_${socket.id}`, // 임시 ID (DB 저장 후 실제 ID로 업데이트 가능)
    lecture_id,
    class_id: Number(class_id),
    live_id: live_id === null ? null : Number(live_id),
    text: messageText,
    sender: {
      id: String(user_id),
      name: userName,
      role: userRole,
    },
    timestamp: new Date().toISOString(),
    created_at: new Date().toISOString(),
  };

  // liveRoom과 baseRoom 모두에 브로드캐스트
  const liveRoomSockets = io.sockets.adapter.rooms.get(liveRoom);
  const baseRoomSockets = io.sockets.adapter.rooms.get(baseRoom);
  console.log("[chat:send] 룸 정보:", {
    liveRoom,
    baseRoom,
    liveRoomSocketsCount: liveRoomSockets ? liveRoomSockets.size : 0,
    baseRoomSocketsCount: baseRoomSockets ? baseRoomSockets.size : 0,
  });
  
  io.to(liveRoom).emit("chat:message", payload);
  if (liveRoom !== baseRoom) {
    io.to(baseRoom).emit("chat:message", payload);
  }
  
  console.log("[chat:send]", user_id, ":", messageText, "->", liveRoom, "브로드캐스트 완료");
});

    // ─────────────────────────────────────────────
    // WebRTC 시그널링 이벤트들
    // (offer / answer / ICE candidate 교환)
    // ─────────────────────────────────────────────
    // front 사용 패턴:
    // socket.emit("webrtc:offer", { to: remoteSocketId, sdp });
    // socket.emit("webrtc:answer", { to: remoteSocketId, sdp });
    // socket.emit("webrtc:ice-candidate", { to: remoteSocketId, candidate });
    //
    // 받는 쪽:
    // socket.on("webrtc:offer", ({ from, sdp }) => { ... });
    // socket.on("webrtc:answer", ({ from, sdp }) => { ... });
    // socket.on("webrtc:ice-candidate", ({ from, candidate }) => { ... });

    socket.on("webrtc:offer", ({ to, sdp, meta }) => {
      if (!to || !sdp) return;
      io.to(to).emit("webrtc:offer", {
        from: socket.id,
        sdp,
        meta: meta || {},
      });
    });

    socket.on("webrtc:answer", ({ to, sdp, meta }) => {
      if (!to || !sdp) return;
      io.to(to).emit("webrtc:answer", {
        from: socket.id,
        sdp,
        meta: meta || {},
      });
    });

    socket.on("webrtc:ice-candidate", ({ to, candidate, meta }) => {
      if (!to || !candidate) return;
      io.to(to).emit("webrtc:ice-candidate", {
        from: socket.id,
        candidate,
        meta: meta || {},
      });
    });

    // ─────────────────────────────────────────────
    // PDF 공유 이벤트
    // ─────────────────────────────────────────────
    socket.on("pdf:share", ({ pdf_url, pdf_name }) => {
      const { lecture_id, class_id, live_id, role } = socket.data || {};
      if (!lecture_id || !class_id || role !== "professor") return;

      const baseRoom = `lec:${lecture_id}:cls:${class_id}`;
      const liveRoom =
        live_id === null || typeof live_id === "undefined"
          ? `${baseRoom}:live:none`
          : `${baseRoom}:live:${live_id}`;

      io.to(liveRoom).emit("pdf:shared", {
        pdf_url,
        pdf_name,
        lecture_id,
        class_id,
        live_id,
      });
    });

    socket.on("pdf:stop-share", () => {
      const { lecture_id, class_id, live_id, role } = socket.data || {};
      if (!lecture_id || !class_id || role !== "professor") return;

      const baseRoom = `lec:${lecture_id}:cls:${class_id}`;
      const liveRoom =
        live_id === null || typeof live_id === "undefined"
          ? `${baseRoom}:live:none`
          : `${baseRoom}:live:${live_id}`;

      io.to(liveRoom).emit("pdf:stopped", {
        lecture_id,
        class_id,
        live_id,
      });
    });

    // ─────────────────────────────────────────────
    // 화이트보드 필기 이벤트
    // ─────────────────────────────────────────────
    socket.on("whiteboard:draw", (data) => {
      const { lecture_id, class_id, live_id, role } = socket.data || {};
      if (!lecture_id || !class_id || role !== "professor") return;

      const baseRoom = `lec:${lecture_id}:cls:${class_id}`;
      const liveRoom =
        live_id === null || typeof live_id === "undefined"
          ? `${baseRoom}:live:none`
          : `${baseRoom}:live:${live_id}`;

      io.to(liveRoom).emit("whiteboard:draw", {
        ...data,
        lecture_id,
        class_id,
        live_id,
      });
    });

    socket.on("whiteboard:page-change", (data) => {
      const { lecture_id, class_id, live_id, role } = socket.data || {};
      if (!lecture_id || !class_id || role !== "professor") return;

      const baseRoom = `lec:${lecture_id}:cls:${class_id}`;
      const liveRoom =
        live_id === null || typeof live_id === "undefined"
          ? `${baseRoom}:live:none`
          : `${baseRoom}:live:${live_id}`;

      io.to(liveRoom).emit("whiteboard:page-change", {
        ...data,
        lecture_id,
        class_id,
        live_id,
      });
    });

    // ─────────────────────────────────────────────
    // 연결 종료 알림
    // ─────────────────────────────────────────────
    socket.on("disconnect", () => {
      const { lecture_id, class_id, live_id, role, user_id } = socket.data || {};
      if (lecture_id && class_id) {
        const baseRoom = `lec:${lecture_id}:cls:${class_id}`;
        const liveRoom =
          live_id === null || typeof live_id === "undefined"
            ? `${baseRoom}:live:none`
            : `${baseRoom}:live:${live_id}`;

        io.to(liveRoom).emit("live:user-left", {
          socket_id: socket.id,
          lecture_id,
          class_id,
          live_id,
          role,
          user_id,
        });
      }
      console.log("[socket] disconnected:", socket.id);
    });
  });

  return io;
}



module.exports = { attachSocket };

