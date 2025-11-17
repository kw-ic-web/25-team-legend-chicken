const { Server } = require("socket.io");
const Lecture = require("../models/lectures");

function attachSocket(server, corsOrigin = "*") {
  const io = new Server(server, {
    cors: {
      origin: corsOrigin,
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    socket.on("live:join", async (payload, cb) => {
      try {
        const { lecture_id, class_id } = payload || {};
        if (!lecture_id || !class_id) {
          return cb && cb({ ok: false, error: "invalid join payload" });
        }

        const lec = await Lecture.findOne({ lecture_id });
        if (!lec) return cb && cb({ ok: false, error: "lecture not found" });

        const cls = lec.classes.find((c) => Number(c.id) === Number(class_id));
        if (!cls) return cb && cb({ ok: false, error: "class not found" });

        const room = `lec:${lecture_id}:cls:${class_id}`;
        socket.join(room);
        cb && cb({ ok: true, room });
      } catch (e) {
        cb && cb({ ok: false, error: e.message });
      }
    });

    socket.on("chat:send", async (msg, cb) => {
      try {
        const { lecture_id, class_id, text, sender } = msg || {};
        if (!lecture_id || !class_id || !text) {
          return cb && cb({ ok: false, error: "invalid message payload" });
        }
        const room = `lec:${lecture_id}:cls:${class_id}`;
        const payload = {
          lecture_id,
          class_id: Number(class_id),
          text,
          sender: sender || { id: "unknown", name: "익명", role: "guest" },
          timestamp: new Date().toISOString(),
        };
        io.to(room).emit("chat:message", payload);
        cb && cb({ ok: true });
      } catch (e) {
        cb && cb({ ok: false, error: e.message });
      }
    });

    socket.on("question:create", async (q, cb) => {
      try {
        const { lecture_id, class_id } = q || {};
        if (!lecture_id || !class_id) {
          return cb && cb({ ok: false, error: "invalid question payload" });
        }
        const room = `lec:${lecture_id}:cls:${class_id}`;
        io.to(room).emit("question:new", q);
        cb && cb({ ok: true });
      } catch (e) {
        cb && cb({ ok: false, error: e.message });
      }
    });

    // WebRTC Signaling 이벤트
    socket.on("webrtc:offer", async (data, cb) => {
      try {
        const { lecture_id, class_id, offer, from } = data || {};
        if (!lecture_id || !class_id || !offer) {
          return cb && cb({ ok: false, error: "invalid offer payload" });
        }

        const room = `lec:${lecture_id}:cls:${class_id}`;
        // offer를 같은 방의 다른 사용자들에게 전달
        socket.to(room).emit("webrtc:offer", {
          offer,
          from: from || socket.id,
        });
        cb && cb({ ok: true });
      } catch (e) {
        cb && cb({ ok: false, error: e.message });
      }
    });

    socket.on("webrtc:answer", async (data, cb) => {
      try {
        const { lecture_id, class_id, answer, to } = data || {};
        if (!lecture_id || !class_id || !answer) {
          return cb && cb({ ok: false, error: "invalid answer payload" });
        }

        const room = `lec:${lecture_id}:cls:${class_id}`;
        // answer를 특정 사용자에게 전달
        if (to) {
          io.to(to).emit("webrtc:answer", { answer, from: socket.id });
        } else {
          socket.to(room).emit("webrtc:answer", { answer, from: socket.id });
        }
        cb && cb({ ok: true });
      } catch (e) {
        cb && cb({ ok: false, error: e.message });
      }
    });

    socket.on("webrtc:ice-candidate", async (data, cb) => {
      try {
        const { lecture_id, class_id, candidate, to } = data || {};
        if (!lecture_id || !class_id || !candidate) {
          return cb && cb({ ok: false, error: "invalid ice-candidate payload" });
        }

        const room = `lec:${lecture_id}:cls:${class_id}`;
        // ICE candidate를 상대방에게 전달
        if (to) {
          io.to(to).emit("webrtc:ice-candidate", {
            candidate,
            from: socket.id,
          });
        } else {
          socket.to(room).emit("webrtc:ice-candidate", {
            candidate,
            from: socket.id,
          });
        }
        cb && cb({ ok: true });
      } catch (e) {
        cb && cb({ ok: false, error: e.message });
      }
    });

    socket.on("disconnect", () => {});
  });

  return io;
}

module.exports = { attachSocket };
