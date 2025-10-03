import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import Header from "./Header";
import StudentSidebar from "./StudentSidebar";
import ProfessorSidebar from "./ProfessorSidebar";

const Layout: React.FC = () => {
  const location = useLocation();

  const isStudentRoute = location.pathname.startsWith("/student");
  const isProfessorRoute = location.pathname.startsWith("/professor");

  return (
    <div className="layout">
      <Header />

      <div className="main-content">
        {isStudentRoute && <StudentSidebar />}
        {isProfessorRoute && <ProfessorSidebar />}

        <main
          className={`content ${isStudentRoute || isProfessorRoute ? "with-sidebar" : ""}`}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
