const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, default: "" },
    email: { type: String, required: true, unique: true },
    phone: { type: String, default: "" },
    password: { type: String, required: true },
    user_type: { type: String, enum: ["professor", "student"], required: true },
    profile_image: { type: String, default: "" }, // 프로필 사진 URL
  },
  {
    timestamps: true, // createdAt, updatedAt 자동 생성
  }
);

module.exports = mongoose.models.User || mongoose.model("User", UserSchema);
