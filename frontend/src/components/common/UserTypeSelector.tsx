import React from "react";

interface UserTypeSelectorProps {
  userType: "student" | "teacher";
  onUserTypeChange: (type: "student" | "teacher") => void;
}

const UserTypeSelector: React.FC<UserTypeSelectorProps> = ({
  userType,
  onUserTypeChange,
}) => {
  return (
    <div className="relative flex mb-8 bg-gray-200 rounded-lg p-1">
      {/* 슬라이딩 배경 */}
      <div
        className={`absolute top-1 bottom-1 w-1/2 bg-blue-600 rounded-md transition-transform duration-300 ease-in-out ${
          userType === "student" ? "translate-x-0" : "translate-x-full"
        }`}
      />

      <button
        type="button"
        onClick={() => onUserTypeChange("student")}
        className={`relative flex-1 py-3 px-4 text-center font-medium rounded-md transition-colors duration-300 ${
          userType === "student"
            ? "text-white"
            : "text-gray-700 hover:text-gray-900"
        }`}
      >
        학생
      </button>
      <button
        type="button"
        onClick={() => onUserTypeChange("teacher")}
        className={`relative flex-1 py-3 px-4 text-center font-medium rounded-md transition-colors duration-300 ${
          userType === "teacher"
            ? "text-white"
            : "text-gray-700 hover:text-gray-900"
        }`}
      >
        선생님
      </button>
    </div>
  );
};

export default UserTypeSelector;
