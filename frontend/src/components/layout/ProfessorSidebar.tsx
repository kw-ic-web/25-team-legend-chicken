import React from "react";
import { Link, useLocation } from "react-router-dom";

const ProfessorSidebar: React.FC = () => {
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname.startsWith(path);
  };

  const menuItems = [
    { path: "/professor/dashboard", label: "대시보드", icon: "📊" },
    { path: "/professor/create-lecture", label: "강의 개설", icon: "➕" },
    { path: "/professor/manage-lectures", label: "강의 관리", icon: "📚" },
    {
      path: "/professor/realtime-dashboard",
      label: "실시간 대시보드",
      icon: "📡",
    },
    { path: "/professor/analysis", label: "강의 분석 및 리포트", icon: "📈" },
  ];

  return (
    <aside className="professor-sidebar">
      <div className="sidebar-header">
        <h3>교수자 메뉴</h3>
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

export default ProfessorSidebar;
