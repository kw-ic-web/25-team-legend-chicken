import React from "react";
import { Link, useLocation } from "react-router-dom";

const StudentSidebar: React.FC = () => {
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname.startsWith(path);
  };

  const menuItems = [
    { path: "/student/dashboard", label: "대시보드", icon: "📊" },
    { path: "/student/participate", label: "실시간 참여", icon: "🎯" },
    { path: "/student/questions", label: "내 질문 내역", icon: "❓" },
    { path: "/student/reports", label: "강의 요약 리포트", icon: "📋" },
  ];

  return (
    <aside className="student-sidebar">
      <div className="sidebar-header">
        <h3>학생 메뉴</h3>
      </div>

      <nav className="sidebar-nav">
        <ul className="sidebar-list">
          {menuItems.map((item) => (
            <li key={item.path} className="sidebar-item">
              <Link
                to={item.path}
                className={
                  isActive(item.path) ? "sidebar-link active" : "sidebar-link"
                }
              >
                <span className="sidebar-icon">{item.icon}</span>
                <span className="sidebar-label">{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
};

export default StudentSidebar;
