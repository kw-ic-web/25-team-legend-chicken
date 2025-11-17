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
    socket.on("live:join", ({ lecture_id, class_id, live_id, role, user_id }) => {
      if (!lecture_id || !class_id) return;

      const baseRoom = `lec:${lecture_id}:cls:${class_id}`;
      const liveRoom =
        live_id === null || typeof live_id === "undefined"
          ? `${baseRoom}:live:none`
          : `${baseRoom}:live:${live_id}`;

      socket.join(baseRoom);
      socket.join(liveRoom);

      socket.data = { lecture_id, class_id, live_id, role, user_id };

      console.log(
        "[live:join]",
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

