const jwt = require("jsonwebtoken");
const User = require("../models/user");

async function authenticateToken(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token)
    return res.status(401).json({ message: "인증 토큰이 필요합니다." });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key");
    const user = await User.findById(decoded.id);
    if (!user)
      return res.status(404).json({ message: "사용자를 찾을 수 없습니다." });

    req.user = user;
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(419).json({ message: "토큰이 만료되었습니다." });
    }
    res.status(403).json({ message: "유효하지 않은 토큰입니다." });
  }
}

module.exports = { authenticateToken };
