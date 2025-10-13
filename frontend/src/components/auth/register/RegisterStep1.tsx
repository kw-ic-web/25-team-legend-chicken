import React from "react";
import { useNavigate } from "react-router-dom";
import ProgressIndicator from "../ProgressIndicator";
import TermsAgreement from "../TermsAgreement";

const RegisterStep1: React.FC = () => {
  const navigate = useNavigate();

  const handleNext = () => {
    navigate("/register/step2");
  };

  return (
    <div className="min-h-screen bg-white py-6 md:py-12">
      <div className="max-w-6xl mx-auto px-4">
        {/* 제목 */}
        <div className="text-center mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            Lec-Q 회원가입
          </h1>
          <p className="text-sm md:text-base text-gray-600">
            간편하게 가입하고 Lec-Q의 모든 기능을 이용해보세요
          </p>
        </div>

        {/* 진행 표시기 */}
        <ProgressIndicator currentStep={1} />

        {/* 약관 동의 */}
        <TermsAgreement onNext={handleNext} />
      </div>
    </div>
  );
};

export default RegisterStep1;
