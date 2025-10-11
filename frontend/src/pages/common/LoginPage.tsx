import React, { useState } from "react";
import { Link } from "react-router-dom";
import UserTypeSelector from "../../components/auth/UserTypeSelector";
import LoginForm from "../../components/auth/LoginForm";
import CustomerSupport from "../../components/auth/CustomerSupport";

const LoginPage: React.FC = () => {
  const [userType, setUserType] = useState<"student" | "teacher">("student");
  const [formData, setFormData] = useState({
    id: "",
    password: "",
  });
  const [rememberId, setRememberId] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("로그인 시도:", { userType, ...formData });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col relative">
      {/* 로그인 섹션 */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
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

      {/* 고객 지원 섹션 */}
      <CustomerSupport />
    </div>
  );
};

export default LoginPage;
