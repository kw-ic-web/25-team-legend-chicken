import React from "react";
import { Flag } from "lucide-react";
import { Link } from "react-router-dom";

interface RegistrationCompleteProps {
  userName?: string;
  userId?: string;
}

const RegistrationComplete: React.FC<RegistrationCompleteProps> = ({
  userName = "홍길동",
  userId = "아이디",
}) => {
  return (
    <div className="max-w-2xl mx-auto px-4 text-center">
      {/* 아이콘 */}
      <div className="flex justify-center mb-8">
        <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
          <Flag className="w-8 h-8 text-white" />
        </div>
      </div>

      {/* 제목 */}
      <h2 className="text-3xl font-bold text-gray-900 mb-4">
        Lec-Q 회원가입 완료
      </h2>

      {/* 완료 메시지 */}
      <p className="text-lg text-gray-700 mb-8">
        {userName}({userId})님의 회원가입이 성공적으로 완료되었습니다.
      </p>

      {/* 안내 박스 */}
      <div className="bg-gray-100 rounded-lg p-6 mb-8">
        <div className="flex items-start">
          <div className="w-2 h-2 bg-gray-400 rounded-full mt-2 mr-3 flex-shrink-0"></div>
          <p className="text-gray-700">
            회원가입 확인 및 수집은{" "}
            <span className="text-red-600 font-medium">회원정보 수정</span>에서
            가능합니다.
          </p>
        </div>
      </div>

      {/* 로그인 버튼 */}
      <Link
        to="/login"
        className="inline-block px-8 py-3 bg-gray-800 text-white rounded-lg font-medium hover:bg-gray-900 transition-colors"
      >
        로그인하기
      </Link>
    </div>
  );
};

export default RegistrationComplete;
