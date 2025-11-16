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

    socket.on("disconnect", () => {});
  });

  return io;
}

module.exports = { attachSocket };
