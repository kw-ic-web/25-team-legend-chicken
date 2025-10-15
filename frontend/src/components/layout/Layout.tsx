import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import StudentSidebar from "./student/StudentSidebar";
import ProfessorSidebar from "./professor/ProfessorSidebar";

const Layout: React.FC = () => {
  const location = useLocation();

  const isStudentRoute = location.pathname.startsWith("/student");
  const isProfessorRoute = location.pathname.startsWith("/professor");

  return (
    <div className="flex h-screen bg-gray-50">
      {/* 사이드바 */}
      {isStudentRoute && <StudentSidebar />}
      {isProfessorRoute && <ProfessorSidebar />}

      {/* 메인 콘텐츠 */}
      <main className="flex-1 flex flex-col">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
