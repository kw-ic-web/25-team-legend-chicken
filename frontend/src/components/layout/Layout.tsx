import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import StudentSidebar from "./student/StudentSidebar";
import ProfessorSidebar from "./professor/ProfessorSidebar";
import ProfessorHeader from "./professor/ProfessorHeader";
import StudentHeader from "./student/StudentHeader";

const Layout: React.FC = () => {
  const location = useLocation();

  const isStudentRoute = location.pathname.startsWith("/student");
  const isProfessorRoute = location.pathname.startsWith("/professor");
  const isRealtimeDashboard = location.pathname.startsWith(
    "/professor/realtime-dashboard"
  );
  const isStudentClass = location.pathname.startsWith("/student/courses/");
  const isStudentParticipate = location.pathname.startsWith(
    "/student/participate"
  );

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* 헤더 */}
      {isProfessorRoute && <ProfessorHeader />}
      {isStudentRoute && <StudentHeader />}

      {/* 메인 레이아웃 */}
      <div className="flex flex-1 mt-20">
        {/* 사이드바 */}
        {!isRealtimeDashboard && !isStudentClass && !isStudentParticipate && (
          <>
            {isStudentRoute && <StudentSidebar />}
            {isProfessorRoute && <ProfessorSidebar />}
          </>
        )}

        {/* 메인 콘텐츠 */}
        <main
          className={`flex-1 flex flex-col ${
            !isRealtimeDashboard &&
            !isStudentClass &&
            !isStudentParticipate &&
            (isStudentRoute || isProfessorRoute)
              ? "ml-80"
              : ""
          }`}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
