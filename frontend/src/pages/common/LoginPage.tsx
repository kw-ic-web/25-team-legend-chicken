import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import UserTypeSelector from "../../components/auth/UserTypeSelector";
import LoginForm from "../../components/auth/LoginForm";
import CustomerSupport from "../../components/auth/CustomerSupport";
import { useAuth } from "../../contexts/AuthContext";
import { loginUser } from "../../api/auth";
import Toast from "../../components/common/Toast";

const LoginPage: React.FC = () => {
  const [userType, setUserType] = useState<"student" | "teacher">("student");
  const [formData, setFormData] = useState({
    id: "",
    password: "",
  });
  const [rememberId, setRememberId] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, login } = useAuth();

  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  useEffect(() => {
    if (user) {
      const redirectPath =
        user.role === "professor"
          ? "/professor/dashboard"
          : "/student/dashboard";
      navigate(redirectPath, { replace: true });
      return;
    }

    const rawAuth = localStorage.getItem("lecq.auth");
    if (!rawAuth) return;
    try {
      const parsed = JSON.parse(rawAuth) as {
        id?: string;
        name?: string;
        role?: "student" | "professor";
      };
      if (parsed.id && parsed.name && parsed.role) {
        login({ id: parsed.id, name: parsed.name, role: parsed.role });
      }
    } catch (error) {
      console.warn("잘못된 인증 정보가 발견되어 초기화합니다.", error);
      localStorage.removeItem("lecq.auth");
    }
  }, [navigate, user, login]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await loginUser({
        email: formData.id,
        password: formData.password,
      });

      if (
        !res.success ||
        !res.user ||
        !res.access_token ||
        !res.refresh_token
      ) {
        setToast({
          message: res.message || "로그인에 실패했습니다.",
          type: "error",
        });
        return;
      }

      // 토큰 저장
      localStorage.setItem("lecq.token", res.access_token);
      localStorage.setItem("lecq.refreshToken", res.refresh_token);
      if (typeof res.expires_in === "number") {
        const expiresAt = Date.now() + res.expires_in * 1000;
        localStorage.setItem("lecq.tokenExpiresAt", String(expiresAt));
      } else {
        localStorage.removeItem("lecq.tokenExpiresAt");
      }

      const role = (
        res.user.user_type === "professor" ? "professor" : "student"
      ) as "student" | "professor";
      login({ id: res.user.id, name: res.user.name, role });

      // 성공 토스트 후 자연스러운 페이지 전환
      setToast({ message: "로그인 성공!", type: "success" });

      const state = location.state as { from?: { pathname?: string } } | null;
      const userType = res.user.user_type;
      const from = state?.from?.pathname;
      setTimeout(() => {
        if (from && !from.startsWith("/login")) {
          navigate(from, { replace: true });
          return;
        }

        if ((userType === "student" ? "student" : "professor") === "student") {
          navigate("/student/dashboard", { replace: true });
        } else {
          navigate("/professor/dashboard", { replace: true });
        }
      }, 800);
    } catch (error) {
      const message =
        (error as Error)?.message || "로그인 중 오류가 발생했습니다.";
      setToast({ message, type: "error" });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="min-h-screen bg-white flex flex-col relative">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      {/* 로그인 섹션 (화면 높이 채움) */}
      <div className="min-h-screen flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          {/* 브랜드 로고 & 문구 */}
          <div className="flex flex-col items-center mb-6">
            <img
              src="/lecq-nooki.svg"
              alt="Lec-Q"
              className="h-20 w-auto mb-3"
            />
            <p className="text-gray-500 text-sm text-center">
              AI 기반 스마트 학습 보조 플랫폼, Lec-Q
            </p>
          </div>
          {/* 제목 */}
          <h1 className="text-3xl font-bold text-center text-gray-900 mb-8">
            로그인
          </h1>

          {/* 사용자 유형 선택 */}
          <UserTypeSelector
            userType={userType}
            onUserTypeChange={setUserType}
          />

          {/* 로그인 폼 */}
          <LoginForm
            userType={userType}
            formData={formData}
            rememberId={rememberId}
            onFormDataChange={handleChange}
            onRememberIdChange={setRememberId}
            onSubmit={handleSubmit}
          />

          {/* 회원가입 링크 */}
          <div className="mt-6 text-center">
            <p className="text-gray-600">
              나만의 강의 프로그램, Lec-Q{" "}
              <Link
                to="/register"
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                회원가입하기
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* 고객 지원 섹션 (본문 아래로 스크롤되어 노출) */}
      <div className="shrink-0">
        <CustomerSupport />
      </div>

      {/* 임시 대시보드 이동 버튼 */}
      <div className="px-4 py-6 border-t bg-white">
        <div className="max-w-7xl mx-auto flex items-center justify-center gap-3">
          <Link
            to="/student/dashboard"
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            학생 대시보드로 이동
          </Link>
          <Link
            to="/professor/dashboard"
            className="px-4 py-2 rounded-lg bg-slate-700 text-white hover:bg-slate-800 transition-colors"
          >
            강의자 대시보드로 이동
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
