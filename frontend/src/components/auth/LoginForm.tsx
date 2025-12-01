import React from "react";
import { Link } from "react-router-dom";

interface LoginFormProps {
  userType: "student" | "teacher";
  formData: {
    id: string;
    password: string;
  };
  rememberId: boolean;
  onFormDataChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRememberIdChange: (checked: boolean) => void;
  onSubmit: (e: React.FormEvent) => void;
}

const LoginForm: React.FC<LoginFormProps> = ({
  userType,
  formData,
  rememberId,
  onFormDataChange,
  onRememberIdChange,
  onSubmit,
}) => {
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* 아이디 입력 */}
      <div>
        <label
          htmlFor="id"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          아이디
        </label>
        <input
          type="text"
          id="id"
          name="id"
          value={formData.id}
          onChange={onFormDataChange}
          placeholder={
            userType === "student"
              ? "학생 아이디를 입력하세요"
              : "강의자 아이디를 입력하세요"
          }
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          required
        />
      </div>

      {/* 비밀번호 입력 */}
      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          비밀번호
        </label>
        <input
          type="password"
          id="password"
          name="password"
          value={formData.password}
          onChange={onFormDataChange}
          placeholder="비밀번호를 입력하세요"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          required
        />
      </div>

      {/* 아이디/비밀번호 찾기 */}
      <div className="text-right">
        <Link
          to="/find-id"
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          아이디 찾기
        </Link>
        <span className="mx-2 text-gray-400">|</span>
        <Link
          to="/find-password"
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          비밀번호 찾기
        </Link>
      </div>

      {/* 옵션 체크박스 */}
      <div className="flex justify-start items-center">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={rememberId}
            onChange={(e) => onRememberIdChange(e.target.checked)}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <span className="ml-2 text-sm text-gray-700">아이디 저장</span>
        </label>
      </div>

      {/* 로그인 버튼 */}
      <button
        type="submit"
        className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
      >
        {userType === "student" ? "학생 로그인" : "강의자 로그인"}
      </button>
    </form>
  );
};

export default LoginForm;
