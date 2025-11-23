const mongoose = require("mongoose");

const ParticipantSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
  },
  userName: {
    type: String,
    required: true,
  },
  socketId: {
    type: String,
  },
  role: {
    type: String,
    enum: ["professor", "student"],
    required: true,
  },
  joinedAt: {
    type: Date,
    default: Date.now,
  },
});

const RoomSchema = new mongoose.Schema({
  // 랜덤 ID는 MongoDB의 기본 _id 사용
  roomId: {
    type: String,
    unique: true,
    required: true,
    default: () => {
      // 랜덤 문자열 생성 (영문자 + 숫자 조합)
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
      let result = "";
      for (let i = 0; i < 12; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    },
  },
  lectureId: {
    type: String,
    required: true,
  },
  classId: {
    type: Number,
    required: true,
  },
  liveId: {
    type: Number,
    required: true,
  },
  title: {
    type: String,
    default: "",
  },
  participants: [ParticipantSchema],
  maxParticipants: {
    type: Number,
    default: 100, // 라이브 강의는 많은 인원 가능
  },
  status: {
    type: String,
    enum: ["open", "closed"],
    default: "open",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  startedAt: {
    type: Date,
    default: Date.now,
  },
  endedAt: {
    type: Date,
    default: null,
  },
});

// 인덱스 설정
RoomSchema.index({ roomId: 1 });
RoomSchema.index({ lectureId: 1, classId: 1, liveId: 1 });
RoomSchema.index({ createdAt: -1 });
RoomSchema.index({ "participants.socketId": 1 });

const Room = mongoose.model("Room", RoomSchema);

module.exports = Room;

