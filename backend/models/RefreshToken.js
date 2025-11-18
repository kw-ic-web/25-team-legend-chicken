// models/RefreshToken.js
const mongoose = require("mongoose");

const RefreshTokenSchema = new mongoose.Schema(
  {
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    expires_at: {
      type: Date,
      required: true,
      index: { expireAfterSeconds: 0 }, // TTL 인덱스로 자동 삭제
    },
    created_at: {
      type: Date,
      default: Date.now,
    },
    device_info: {
      type: String,
      default: null, // 선택적: 디바이스 정보 저장
    },
    ip_address: {
      type: String,
      default: null, // 선택적: IP 주소 저장
    },
  },
  {
    timestamps: false, // created_at을 수동으로 관리
  }
);

// 복합 인덱스: user_id와 expires_at
RefreshTokenSchema.index({ user_id: 1, expires_at: 1 });

module.exports =
  mongoose.models.RefreshToken ||
  mongoose.model("RefreshToken", RefreshTokenSchema);

