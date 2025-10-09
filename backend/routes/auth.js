const express = require("express");
const router = express.Router();
const User = require("../models/User");

// 회원가입
router.post("/register", async (req, res) => {
  try {
    const { email, password, name, role } = req.body;
    const newUser = new User({ email, password, name, role });
    await newUser.save();
    res.json({ success: true, user: newUser });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 로그인
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email, password });
  if (!user)
    return res.status(401).json({ success: false, message: "로그인 실패" });
  res.json({ success: true, user });
});

module.exports = router;


