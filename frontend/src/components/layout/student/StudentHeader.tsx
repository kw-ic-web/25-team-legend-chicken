import React from "react";
import { Link } from "react-router-dom";

const StudentHeader: React.FC = () => {

  return (
    <header className="relative h-20 shadow-lg">
      {/* 배경 색상: 60도 대각선 구분 (70% / 5% / 25%) */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(-60deg, #3A6EFF 0% 30%, #1089E3 30% 35%, #07CDAC 35% 100%)",
        }}
      ></div>

      {/* 컨텐츠 */}
      <div className="relative z-10 h-full flex items-center px-6">
        {/* 로고 (클릭 시 홈 이동) */}
        <Link
          to="/"
          className="flex items-center justify-center h-full cursor-pointer"
          aria-label="홈으로 이동"
        >
          <img src="/white-logo.svg" alt="lec-Q" className="h-12 w-auto pb-2" />
        </Link>
      </div>
    </header>
  );
};

export default StudentHeader;

