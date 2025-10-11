import React from "react";
import { Check, Edit3, Flag } from "lucide-react";

interface ProgressIndicatorProps {
  currentStep: number;
}

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  currentStep,
}) => {
  const steps = [
    { id: 1, name: "약관 동의", icon: Check },
    { id: 2, name: "정보 입력", icon: Edit3 },
    { id: 3, name: "가입 완료", icon: Flag },
  ];

  return (
    <div className="flex justify-center items-center space-x-20 mb-12 relative">
      {steps.map((step, index) => {
        const IconComponent = step.icon;
        const isActive = currentStep === step.id;
        const isCompleted = currentStep > step.id;

        return (
          <div key={step.id} className="flex flex-col items-center relative">
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 ${
                isActive || isCompleted
                  ? "bg-blue-600 text-white"
                  : "bg-blue-200 text-blue-400"
              }`}
            >
              <IconComponent className="w-6 h-6" />
            </div>
            <span
              className={`text-sm font-medium ${
                isActive || isCompleted ? "text-gray-900" : "text-gray-500"
              }`}
            >
              {step.name}
            </span>
            {index < steps.length - 1 && (
              <div
                className={`absolute top-6 left-14 w-16 h-0.5 ${
                  isCompleted ? "bg-blue-600" : "bg-gray-300"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ProgressIndicator;
