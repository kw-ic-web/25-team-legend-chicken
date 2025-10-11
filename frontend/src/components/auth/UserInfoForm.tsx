import React, { useState } from "react";
import Select from "react-select";
import type {
  EmailDomainOption,
  EmailStatus,
  UserInfoFormData,
  SelectStyles,
  UserInfoFormProps,
} from "../../types";

const UserInfoForm: React.FC<UserInfoFormProps> = ({ onNext, onPrev }) => {
  const [formData, setFormData] = useState<UserInfoFormData>({
    name: "",
    userType: "student",
    email: "",
    emailDomain: "직접입력",
    password: "",
    confirmPassword: "",
    phone1: "",
    phone2: "",
    phone3: "",
    birthYear: "",
    birthMonth: "",
    birthDay: "",
    calendarType: "solar",
  });

  const [emailStatus, setEmailStatus] = useState<EmailStatus>({
    isChecking: false,
    isDuplicate: null,
    message: "",
  });

  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const emailDomainOptions: EmailDomainOption[] = [
    { value: "직접입력", label: "직접입력" },
    { value: "gmail.com", label: "gmail.com" },
    { value: "naver.com", label: "naver.com" },
    { value: "daum.net", label: "daum.net" },
  ];

  const customSelectStyles: SelectStyles = {
    control: (provided, state) => ({
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
    valueContainer: (provided) => ({
      ...provided,
      padding: "8px 12px",
    }),
    input: (provided) => ({
      ...provided,
      margin: "0",
    }),
    indicatorSeparator: () => ({
      display: "none",
    }),
    dropdownIndicator: (provided) => ({
      ...provided,
      color: "#6b7280",
      "&:hover": {
        color: "#374151",
      },
    }),
    option: (provided, state) => ({
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

    // 이메일 변경 시 중복 검사
    if (name === "email") {
      const fullEmail = `${value}@${formData.emailDomain === "직접입력" ? "" : formData.emailDomain}`;
      if (formData.emailDomain !== "직접입력") {
        checkEmailDuplicate(fullEmail);
      }
    }
  };

  const handleInput = (e: React.FormEvent<HTMLInputElement>) => {
    const { name, value } = e.currentTarget;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const { name, value, maxLength } = e.currentTarget;

    // 휴대폰 번호 자동 이동
    if (name === "phone1" && value.length === maxLength) {
      const nextField = document.querySelector(
        'input[name="phone2"]'
      ) as HTMLInputElement;
      nextField?.focus();
    } else if (name === "phone2" && value.length === maxLength) {
      const nextField = document.querySelector(
        'input[name="phone3"]'
      ) as HTMLInputElement;
      nextField?.focus();
    }

    // 생년월일 자동 이동
    if (name === "birthYear" && value.length === maxLength) {
      const nextField = document.querySelector(
        'input[name="birthMonth"]'
      ) as HTMLInputElement;
      nextField?.focus();
    } else if (name === "birthMonth" && value.length === maxLength) {
      const nextField = document.querySelector(
        'input[name="birthDay"]'
      ) as HTMLInputElement;
      nextField?.focus();
    }
  };

  const handleSelectChange = (selectedOption: EmailDomainOption | null) => {
    if (!selectedOption) return;

    setFormData({
      ...formData,
      emailDomain: selectedOption.value,
    });

    // 도메인 선택 시 중복 검사
    if (formData.email && selectedOption.value !== "직접입력") {
      const fullEmail = `${formData.email}@${selectedOption.value}`;
      checkEmailDuplicate(fullEmail);
    }
  };

  const handleDomainInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    setFormData({
      ...formData,
      emailDomain: value,
    });
  };

  // 이메일 중복 검사 함수 (실제로는 API 호출)
  const checkEmailDuplicate = async (email: string) => {
    if (!email) {
      setEmailStatus({
        isChecking: false,
        isDuplicate: null,
        message: "",
      });
      return;
    }

    setEmailStatus({
      isChecking: true,
      isDuplicate: null,
      message: "이메일 중복 확인 중...",
    });

    // 실제 환경에서는 API 호출
    // const response = await fetch(`/api/check-email?email=${email}`);
    // const { isDuplicate } = await response.json();

    // 시뮬레이션을 위한 가짜 API 호출
    setTimeout(() => {
      // 테스트용: 특정 이메일들을 중복으로 처리
      const duplicateEmails = [
        "test@test.com",
        "admin@admin.com",
        "user@user.com",
      ];
      const isDuplicate = duplicateEmails.includes(email);

      setEmailStatus({
        isChecking: false,
        isDuplicate,
        message: isDuplicate
          ? "이미 사용 중인 이메일입니다."
          : "사용 가능한 이메일입니다.",
      });
    }, 1000);
  };

  const validateForm = () => {
    const errors: string[] = [];

    if (formData.name.trim() === "") {
      errors.push("이름을 입력해주세요.");
    }
    if (formData.email.trim() === "") {
      errors.push("이메일을 입력해주세요.");
    }
    if (formData.password.trim() === "") {
      errors.push("비밀번호를 입력해주세요.");
    }
    if (formData.confirmPassword.trim() === "") {
      errors.push("비밀번호 확인을 입력해주세요.");
    }
    if (
      formData.password !== formData.confirmPassword &&
      formData.password.trim() !== "" &&
      formData.confirmPassword.trim() !== ""
    ) {
      errors.push("비밀번호가 일치하지 않습니다.");
    }
    if (
      formData.phone1.trim() === "" ||
      formData.phone2.trim() === "" ||
      formData.phone3.trim() === ""
    ) {
      errors.push("휴대폰 번호를 모두 입력해주세요.");
    }
    if (
      formData.birthYear.trim() === "" ||
      formData.birthMonth.trim() === "" ||
      formData.birthDay.trim() === ""
    ) {
      errors.push("생년월일을 모두 입력해주세요.");
    }
    if (emailStatus.isDuplicate === true) {
      errors.push("이미 사용 중인 이메일입니다.");
    }
    if (emailStatus.isChecking) {
      errors.push("이메일 중복 확인 중입니다. 잠시만 기다려주세요.");
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const isFormValid = () => {
    return (
      formData.name.trim() !== "" &&
      formData.email.trim() !== "" &&
      formData.password.trim() !== "" &&
      formData.confirmPassword.trim() !== "" &&
      formData.password === formData.confirmPassword &&
      formData.phone1.trim() !== "" &&
      formData.phone2.trim() !== "" &&
      formData.phone3.trim() !== "" &&
      formData.birthYear.trim() !== "" &&
      formData.birthMonth.trim() !== "" &&
      formData.birthDay.trim() !== "" &&
      emailStatus.isDuplicate === false // 이메일이 중복되지 않아야 함
      // userType은 기본값이 "student"로 설정되어 있어서 선택하지 않아도 됨
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // 유효성 검사 실행
    if (validateForm()) {
      console.log("회원가입 정보:", formData);
      onNext();
    } else {
      // 오류가 있으면 스크롤을 맨 위로 이동하여 오류 메시지를 보여줌
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 overflow-hidden">
      <div className="mb-6">
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-2 break-words">
          정보 입력
        </h2>
        <p className="text-sm md:text-base text-gray-600 break-words">
          필수항목이므로 반드시 입력해 주시기 바랍니다.
        </p>

        {/* 유효성 검사 오류 메시지 */}
        {validationErrors.length > 0 && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-center mb-2">
              <svg
                className="w-5 h-5 text-red-500 mr-2"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <h3 className="text-sm font-medium text-red-800">
                입력 오류가 있습니다
              </h3>
            </div>
            <ul className="text-sm text-red-700 space-y-1">
              {validationErrors.map((error, index) => (
                <li key={index} className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>{error}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4 md:p-6 overflow-hidden">
        <form onSubmit={handleSubmit} className="space-y-4 md:space-y-5">
          {/* 이름 */}
          <div className="border-b border-gray-200 pb-4">
            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-0">
              <label
                htmlFor="name"
                className="w-full md:w-32 text-sm font-medium text-gray-700 break-words"
              >
                이름
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                onInput={handleInput}
                className="flex-1 px-4 py-3 border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 min-w-0"
                required
              />
            </div>
          </div>

          {/* 회원 유형 */}
          <div className="border-b border-gray-200 pb-4">
            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-0">
              <label className="w-full md:w-32 text-sm font-medium text-gray-700 break-words">
                회원 유형
              </label>
              <div className="flex space-x-4 md:space-x-6">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="userType"
                    value="student"
                    checked={formData.userType === "student"}
                    onChange={handleChange}
                    className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-gray-700 break-words">학생</span>
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
                  <span className="ml-2 text-gray-700 break-words">강의자</span>
                </label>
              </div>
            </div>
          </div>

          {/* 이메일 */}
          <div className="border-b border-gray-200 pb-4">
            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-0">
              <label className="w-full md:w-32 text-sm font-medium text-gray-700 break-words">
                이메일 (아이디)
              </label>
              <div className="flex flex-col md:flex-row md:items-center space-y-2 md:space-y-0 md:space-x-2 flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    onInput={handleInput}
                    className="flex-1 px-4 py-3 border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 min-w-0"
                    placeholder="이메일"
                    required
                  />
                  <span className="text-gray-500 whitespace-nowrap">@</span>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={
                      formData.emailDomain === "직접입력"
                        ? ""
                        : formData.emailDomain
                    }
                    onChange={handleDomainInputChange}
                    onInput={handleInput}
                    className="flex-1 px-4 py-3 border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 min-w-0"
                    placeholder="도메인"
                    disabled={formData.emailDomain !== "직접입력"}
                  />
                  <div className="flex-1 min-w-0">
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
            {/* 이메일 중복 검사 결과 */}
            {emailStatus.message && (
              <div className="mt-2">
                <p
                  className={`text-sm ${
                    emailStatus.isChecking
                      ? "text-blue-600"
                      : emailStatus.isDuplicate
                        ? "text-red-500"
                        : "text-green-600"
                  }`}
                >
                  {emailStatus.message}
                </p>
              </div>
            )}
          </div>

          {/* 비밀번호 */}
          <div className="border-b border-gray-200 pb-4">
            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-0">
              <label
                htmlFor="password"
                className="w-full md:w-32 text-sm font-medium text-gray-700 break-words"
              >
                비밀번호
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                onInput={handleInput}
                className="flex-1 px-4 py-3 border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 min-w-0"
                required
              />
            </div>
          </div>

          {/* 비밀번호 확인 */}
          <div className="border-b border-gray-200 pb-4">
            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-0">
              <label
                htmlFor="confirmPassword"
                className="w-full md:w-32 text-sm font-medium text-gray-700 break-words"
              >
                비밀번호 확인
              </label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                onInput={handleInput}
                className={`flex-1 px-4 py-3 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 min-w-0 ${
                  formData.password &&
                  formData.confirmPassword &&
                  formData.password !== formData.confirmPassword
                    ? "border-red-500"
                    : "border-gray-200"
                }`}
                required
              />
            </div>
            {formData.password && formData.confirmPassword && (
              <p
                className={`text-sm mt-1 ml-0 md:ml-32 ${
                  formData.password === formData.confirmPassword
                    ? "text-green-600"
                    : "text-red-500"
                }`}
              >
                {formData.password === formData.confirmPassword
                  ? "비밀번호가 일치합니다."
                  : "비밀번호가 일치하지 않습니다."}
              </p>
            )}
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
                onInput={handleInput}
                onKeyPress={handleKeyPress}
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
                onInput={handleInput}
                onKeyPress={handleKeyPress}
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
                onInput={handleInput}
                onKeyPress={handleKeyPress}
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
                onInput={handleInput}
                onKeyPress={handleKeyPress}
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
                onInput={handleInput}
                onKeyPress={handleKeyPress}
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
                onInput={handleInput}
                onKeyPress={handleKeyPress}
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
              disabled={!isFormValid()}
              className={`px-8 py-3 rounded-md font-medium transition-colors ${
                isFormValid()
                  ? "bg-gray-800 text-white hover:bg-gray-900 cursor-pointer"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }`}
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
