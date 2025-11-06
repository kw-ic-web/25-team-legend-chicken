const express = require("express");
const router = express.Router();
const User = require("../models/user");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { authenticateToken } = require("../middleware/auth");
const { uploadProfileImage } = require("../config/uploadImage");

// 회원가입
router.post("/register", async (req, res) => {
  try {
    const { name, email, phone, password, user_type } = req.body;

    // 입력값 검증
    if (!email || !password || !user_type) {
      return res.status(400).json({
        success: false,
        message: "이메일, 비밀번호, 사용자 유형은 필수 입력 항목입니다.",
      });
    }

    // 사용자 유형 검증
    if (!["professor", "student"].includes(user_type)) {
      return res.status(400).json({
        success: false,
        message: "사용자 유형은 'professor' 또는 'student'여야 합니다.",
      });
    }

    // 이메일 중복 확인
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "이미 사용 중인 이메일입니다.",
      });
    }

    // 비밀번호 해싱
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 새 사용자 생성
    const newUser = new User({
      name: name || "",
      email,
      phone: phone || "",
      password: hashedPassword,
      user_type,
    });

    await newUser.save();

    console.log("회원가입 성공:", email);

    return res.status(201).json({
      success: true,
      message: "회원가입이 완료되었습니다.",
      user: {
        id: newUser._id,
        email: newUser.email,
        name: newUser.name,
        user_type: newUser.user_type,
      },
    });
  } catch (error) {
    console.error("회원가입 오류:", error);
    return res.status(500).json({
      success: false,
      message: "서버 오류가 발생했습니다.",
    });
  }
});

// 로그인
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log("로그인 요청:", { email });

    // 입력값 검증
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "이메일과 비밀번호를 입력해주세요.",
      });
    }

    // 사용자 존재 확인
    const user = await User.findOne({ email });
    if (!user) {
      console.log("사용자 없음:", email);
      return res.status(401).json({
        success: false,
        message: "존재하지 않는 이메일입니다.",
      });
    }

    // 비밀번호 확인
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      console.log("비밀번호 불일치");
      return res.status(401).json({
        success: false,
        message: "비밀번호가 일치하지 않습니다.",
      });
    }

    // JWT 발급
    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
        name: user.name,
        user_type: user.user_type,
      },
      process.env.JWT_SECRET || "your-secret-key",
      {
        expiresIn: "24h",
        issuer: "lec-q",
        subject: "userInfo",
      }
    );

    console.log("로그인 성공, 토큰 발급:", { email: user.email });

    return res.json({
      success: true,
      message: "로그인 성공!",
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        user_type: user.user_type,
      },
      token,
    });
  } catch (error) {
    console.error("로그인 오류:", error);
    return res.status(500).json({
      success: false,
      message: "서버 오류가 발생했습니다.",
    });
  }
});

// 토큰 검증
router.get("/verify", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        code: 401,
        success: false,
        message: "토큰이 필요합니다.",
      });
    }

    // Bearer 토큰 형식 처리
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : authHeader;

    // 토큰 검증
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your-secret-key"
    );

    // 사용자 정보 조회 (선택적)
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(404).json({
        code: 404,
        success: false,
        message: "사용자를 찾을 수 없습니다.",
      });
    }

    return res.json({
      code: 200,
      success: true,
      message: "유효한 토큰입니다.",
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        user_type: user.user_type,
      },
    });
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(419).json({
        code: 419,
        success: false,
        message: "토큰이 만료되었습니다.",
      });
    }
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        code: 401,
        success: false,
        message: "유효하지 않은 토큰입니다.",
      });
    }
    console.error("토큰 검증 오류:", error);
    return res.status(500).json({
      code: 500,
      success: false,
      message: "서버 오류가 발생했습니다.",
    });
  }
});

// 로그아웃
router.post("/logout", authenticateToken, async (req, res) => {
  try {
    // JWT는 stateless이므로 서버 측에서 토큰을 무효화할 수 없습니다.
    // 클라이언트에서 토큰을 삭제하도록 안내합니다.
    // 향후 토큰 블랙리스트 기능을 추가할 수 있습니다.
    
    console.log("로그아웃 요청:", { email: req.user.email });

    return res.json({
      success: true,
      message: "로그아웃이 완료되었습니다.",
    });
  } catch (error) {
    console.error("로그아웃 오류:", error);
    return res.status(500).json({
      success: false,
      message: "서버 오류가 발생했습니다.",
    });
  }
});

// 내 정보 조회
router.get("/myinfo", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "사용자를 찾을 수 없습니다.",
      });
    }

    return res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        user_type: user.user_type,
        profile_image: user.profile_image || "",
      },
    });
  } catch (error) {
    console.error("내 정보 조회 오류:", error);
    return res.status(500).json({
      success: false,
      message: "서버 오류가 발생했습니다.",
    });
  }
});

// 내 정보 수정
router.put(
  "/myinfo",
  authenticateToken,
  uploadProfileImage.single("profile_image"),
  async (req, res) => {
    try {
      const user = await User.findById(req.user._id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "사용자를 찾을 수 없습니다.",
        });
      }

      // 요청 본문에서 수정할 정보 추출
      const { name, phone, password } = req.body;

      // 이름 수정
      if (name !== undefined) {
        user.name = name;
      }

      // 전화번호 수정
      if (phone !== undefined) {
        user.phone = phone;
      }

      // 비밀번호 수정
      if (password) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);
      }

      // 프로필 사진 업로드
      if (req.file) {
        const profileImageUrl = `/uploads/images/${req.file.filename}`;
        user.profile_image = profileImageUrl;
      }

      await user.save();

      return res.json({
        success: true,
        message: "정보가 성공적으로 수정되었습니다.",
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          user_type: user.user_type,
          profile_image: user.profile_image || "",
        },
      });
    } catch (error) {
      console.error("내 정보 수정 오류:", error);
      return res.status(500).json({
        success: false,
        message: "서버 오류가 발생했습니다.",
      });
    }
  }
);

module.exports = router;
