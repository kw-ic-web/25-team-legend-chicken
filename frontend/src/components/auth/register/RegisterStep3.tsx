import React from "react";
import ProgressIndicator from "../ProgressIndicator";
import RegistrationComplete from "../RegistrationComplete";

const RegisterStep3: React.FC = () => {
  const userData = {
    name: "홍길동",
    userId: "hong123",
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
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
        <ProgressIndicator currentStep={3} />

        {/* 가입 완료 */}
        <RegistrationComplete
          userName={userData.name}
          userId={userData.userId}
        />
      </div>
    </div>
  );
};

export default RegisterStep3;
