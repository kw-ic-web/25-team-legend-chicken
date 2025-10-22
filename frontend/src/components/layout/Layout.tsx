import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import StudentSidebar from "./student/StudentSidebar";
import ProfessorSidebar from "./professor/ProfessorSidebar";
import ProfessorHeader from "./professor/ProfessorHeader";

const Layout: React.FC = () => {
  const location = useLocation();

  const isStudentRoute = location.pathname.startsWith("/student");
  const isProfessorRoute = location.pathname.startsWith("/professor");
  const isProfessorCourseDetail = location.pathname.startsWith(
    "/professor/courses/"
  );
  const isRealtimeDashboard =
    location.pathname === "/professor/realtime-dashboard";

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* 헤더 */}
      {isProfessorRoute && !isRealtimeDashboard && <ProfessorHeader />}

      {/* 메인 레이아웃 */}
      <div className="flex flex-1">
        {/* 사이드바 */}
        {!isRealtimeDashboard && (
          <div className="flex flex-col">
            {isStudentRoute && <StudentSidebar />}
            {isProfessorRoute && !isProfessorCourseDetail && (
              <ProfessorSidebar />
            )}
          </div>
        )}

        {/* 메인 콘텐츠 */}
        <main className="flex-1 flex flex-col">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
