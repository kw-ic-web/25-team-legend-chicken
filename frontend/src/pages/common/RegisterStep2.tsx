import React from "react";
import { useNavigate } from "react-router-dom";
import ProgressIndicator from "../../components/auth/ProgressIndicator";
import UserInfoForm from "../../components/auth/UserInfoForm";

const RegisterStep2: React.FC = () => {
  const navigate = useNavigate();

  const handleNext = () => {
    navigate("/register/step3");
  };

  const handlePrev = () => {
    navigate("/register/step1");
  };

  return (
    <div className="min-h-screen bg-white py-12">
      <div className="max-w-6xl mx-auto">
        {/* 제목 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Lec-Q 회원가입
          </h1>
          <p className="text-gray-600">
            간편하게 가입하고 Lec-Q의 모든 기능을 이용해보세요
          </p>
        </div>

        {/* 진행 표시기 */}
        <ProgressIndicator currentStep={2} />

        {/* 정보 입력 */}
        <UserInfoForm onNext={handleNext} onPrev={handlePrev} />
      </div>
    </div>
  );
};

export default RegisterStep2;
