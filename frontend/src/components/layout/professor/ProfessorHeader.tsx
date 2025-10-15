import React from "react";
import { Link, useLocation } from "react-router-dom";

const ProfessorHeader: React.FC = () => {
  const location = useLocation();

  const navItems = [
    { path: "/professor/dashboard", label: "대시보드" },
    { path: "/professor/analysis", label: "분석리포트" },
  ];

  return (
    <header className="relative h-20 shadow-lg">
      {/* 배경 색상: 60도 대각선 구분 (70% / 5% / 25%) */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(-60deg, #3A6EFF 0% 70%, #1089E3 70% 75%, #07CDAC 75% 100%)",
        }}
      ></div>

      {/* 컨텐츠 */}
      <div className="relative z-10 h-full flex items-center justify-between px-6">
        {/* 로고 (클릭 시 홈 이동) */}
        <Link
          to="/"
          className="flex items-center justify-center h-full cursor-pointer"
          aria-label="홈으로 이동"
        >
          <img src="/white-logo.svg" alt="lec-Q" className="h-12 w-auto pb-2" />
        </Link>

        {/* 네비게이션 */}
        <nav className="flex space-x-8">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`text-white font-medium px-4 py-2 rounded-lg transition-all duration-200 hover:bg-white/20 ${
                location.pathname === item.path
                  ? "bg-white/30 font-semibold"
                  : "hover:bg-white/10"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
};

export default ProfessorHeader;
