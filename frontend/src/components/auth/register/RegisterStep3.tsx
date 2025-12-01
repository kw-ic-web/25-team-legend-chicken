import React from "react";
import ProgressIndicator from "../ProgressIndicator";
import RegistrationComplete from "../RegistrationComplete";

const RegisterStep3: React.FC = () => {
  const userData = {
    name: "회원",
    userId: "hong123",
  };

  return (
    <div className="min-h-screen bg-gray-50 py-6 md:py-12">
      <div className="max-w-6xl mx-auto px-4">
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
