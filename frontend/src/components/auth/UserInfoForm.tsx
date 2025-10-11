import React, { useState } from "react";
import Select from "react-select";

interface UserInfoFormProps {
  onNext: () => void;
  onPrev: () => void;
}

const UserInfoForm: React.FC<UserInfoFormProps> = ({ onNext, onPrev }) => {
  const [formData, setFormData] = useState({
    name: "",
    userType: "student",
    email: "",
    emailDomain: "직접입력",
    password: "",
    phone1: "",
    phone2: "",
    phone3: "",
    birthYear: "",
    birthMonth: "",
    birthDay: "",
    calendarType: "solar",
  });

  const emailDomainOptions = [
    { value: "직접입력", label: "직접입력" },
    { value: "gmail.com", label: "gmail.com" },
    { value: "naver.com", label: "naver.com" },
    { value: "daum.net", label: "daum.net" },
  ];

  const customSelectStyles = {
    control: (provided: any, state: any) => ({
      ...provided,
      border: "1px solid #e5e7eb",
      borderRadius: "6px",
      backgroundColor: "#f9fafb",
      minHeight: "48px",
      boxShadow: "none",
      "&:hover": {
        border: "1px solid #e5e7eb",
      },
      ...(state.isFocused && {
        border: "2px solid #3b82f6",
        boxShadow: "0 0 0 2px rgba(59, 130, 246, 0.1)",
      }),
    }),
    valueContainer: (provided: any) => ({
      ...provided,
      padding: "8px 12px",
    }),
    input: (provided: any) => ({
      ...provided,
      margin: "0",
    }),
    indicatorSeparator: () => ({
      display: "none",
    }),
    dropdownIndicator: (provided: any) => ({
      ...provided,
      color: "#6b7280",
      "&:hover": {
        color: "#374151",
      },
    }),
    option: (provided: any, state: any) => ({
      ...provided,
      backgroundColor: state.isSelected
        ? "#3b82f6"
        : state.isFocused
          ? "#f3f4f6"
          : "white",
      color: state.isSelected ? "white" : "#374151",
      "&:hover": {
        backgroundColor: state.isSelected ? "#3b82f6" : "#f3f4f6",
      },
    }),
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSelectChange = (selectedOption: any) => {
    setFormData({
      ...formData,
      emailDomain: selectedOption.value,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("회원가입 정보:", formData);
    onNext();
  };

  return (
    <div className="max-w-3xl mx-auto px-4">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">정보 입력</h2>
        <p className="text-gray-600">
          필수항목이므로 반드시 입력해 주시기 바랍니다.
        </p>
      </div>

      <div className="">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* 이름 */}
          <div className="border-b border-gray-200 pb-4">
            <div className="flex items-center">
              <label
                htmlFor="name"
                className="w-32 text-sm font-medium text-gray-700"
              >
                이름
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="flex-1 px-4 py-3 border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                required
              />
            </div>
          </div>

          {/* 회원 유형 */}
          <div className="border-b border-gray-200 pb-4">
            <div className="flex items-center">
              <label className="w-32 text-sm font-medium text-gray-700">
                회원 유형
              </label>
              <div className="flex space-x-6">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="userType"
                    value="student"
                    checked={formData.userType === "student"}
                    onChange={handleChange}
                    className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-gray-700">학생</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="userType"
                    value="instructor"
                    checked={formData.userType === "instructor"}
                    onChange={handleChange}
                    className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-gray-700">강의자</span>
                </label>
              </div>
            </div>
          </div>

          {/* 이메일 */}
          <div className="border-b border-gray-200 pb-4">
            <div className="flex items-center">
              <label className="w-32 text-sm font-medium text-gray-700">
                이메일 (아이디)
              </label>
              <div className="flex items-center space-x-2 flex-1">
                <input
                  type="text"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="flex-1 px-4 py-3 border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                  placeholder="이메일"
                  required
                />
                <span className="text-gray-500">@</span>
                <input
                  type="text"
                  className="flex-1 px-4 py-3 border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                  placeholder="도메인"
                />
                <div className="flex-1">
                  <Select
                    value={emailDomainOptions.find(
                      (option) => option.value === formData.emailDomain
                    )}
                    onChange={handleSelectChange}
                    options={emailDomainOptions}
                    styles={customSelectStyles}
                    isSearchable={false}
                    placeholder="직접입력"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 비밀번호 */}
          <div className="border-b border-gray-200 pb-4">
            <div className="flex items-center">
              <label
                htmlFor="password"
                className="w-32 text-sm font-medium text-gray-700"
              >
                비밀번호
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="flex-1 px-4 py-3 border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                required
              />
            </div>
          </div>

          {/* 휴대폰 번호 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              휴대폰 번호
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                name="phone1"
                value={formData.phone1}
                onChange={handleChange}
                className="w-20 px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center"
                placeholder="010"
                maxLength={3}
              />
              <span className="text-gray-500">-</span>
              <input
                type="text"
                name="phone2"
                value={formData.phone2}
                onChange={handleChange}
                className="w-20 px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center"
                placeholder="1234"
                maxLength={4}
              />
              <span className="text-gray-500">-</span>
              <input
                type="text"
                name="phone3"
                value={formData.phone3}
                onChange={handleChange}
                className="w-20 px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center"
                placeholder="5678"
                maxLength={4}
              />
            </div>
          </div>

          {/* 생년월일 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              생년월일
            </label>
            <div className="flex items-center space-x-2 mb-3">
              <input
                type="text"
                name="birthYear"
                value={formData.birthYear}
                onChange={handleChange}
                className="w-20 px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center"
                placeholder="년"
                maxLength={4}
              />
              <span className="text-gray-500">년</span>
              <input
                type="text"
                name="birthMonth"
                value={formData.birthMonth}
                onChange={handleChange}
                className="w-16 px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center"
                placeholder="월"
                maxLength={2}
              />
              <span className="text-gray-500">월</span>
              <input
                type="text"
                name="birthDay"
                value={formData.birthDay}
                onChange={handleChange}
                className="w-16 px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center"
                placeholder="일"
                maxLength={2}
              />
              <span className="text-gray-500">일</span>
            </div>
            <div className="flex space-x-6">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="calendarType"
                  value="solar"
                  checked={formData.calendarType === "solar"}
                  onChange={handleChange}
                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <span className="ml-2 text-gray-700">양력</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="calendarType"
                  value="lunar"
                  checked={formData.calendarType === "lunar"}
                  onChange={handleChange}
                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <span className="ml-2 text-gray-700">음력</span>
              </label>
            </div>
          </div>

          {/* 버튼 */}
          <div className="flex justify-center space-x-4 pt-4">
            <button
              type="submit"
              className="px-8 py-3 bg-gray-800 text-white rounded-md font-medium hover:bg-gray-900 transition-colors"
            >
              가입
            </button>
            <button
              type="button"
              onClick={onPrev}
              className="px-8 py-3 bg-white border border-gray-300 text-gray-700 rounded-md font-medium hover:bg-gray-50 transition-colors"
            >
              취소
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserInfoForm;
