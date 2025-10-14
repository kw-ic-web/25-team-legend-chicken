import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import UserTypeSelector from "../../components/auth/UserTypeSelector";
import LoginForm from "../../components/auth/LoginForm";
import CustomerSupport from "../../components/auth/CustomerSupport";
import { useAuth } from "../../contexts/AuthContext";

const LoginPage: React.FC = () => {
  const [userType, setUserType] = useState<"student" | "teacher">("student");
  const [formData, setFormData] = useState({
    id: "",
    password: "",
  });
  const [rememberId, setRememberId] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: 실제 API 연동 필요. 지금은 데모용으로 로컬 상태 저장
    const role = userType === "teacher" ? "professor" : "student";
    login({ id: formData.id || "user", name: "User", role });

    const state = location.state as { from?: { pathname?: string } } | null;
    const from = state?.from?.pathname;
    if (from && !from.startsWith("/login")) {
      navigate(from, { replace: true });
      return;
    }

    if (role === "student") {
      navigate("/student/dashboard", { replace: true });
    } else {
      navigate("/professor/dashboard", { replace: true });
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
    </div>
  );
};

export default LoginPage;
