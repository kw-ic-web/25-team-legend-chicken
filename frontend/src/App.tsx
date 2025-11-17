import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "./components/layout/Layout";
import RequireAuth from "./components/RequireAuth";
import { AuthProvider } from "./contexts/AuthContext";

// Common pages
import LandingPage from "./pages/common/LandingPage";
import LoginPage from "./pages/common/LoginPage";
import RegisterPage from "./pages/common/RegisterPage";

// Register step pages
import RegisterStep1 from "./components/auth/register/RegisterStep1";
import RegisterStep2 from "./components/auth/register/RegisterStep2";
import RegisterStep3 from "./components/auth/register/RegisterStep3";

// Student pages
import StudentDashboard from "./pages/student/StudentDashboard";
import LiveWatching from "./pages/student/LiveWatching";
import MyQuestions from "./pages/student/MyQuestions";
import LectureSummaryReport from "./pages/student/LectureSummaryReport";

// Professor pages
import ProfessorDashboard from "./pages/professor/ProfessorDashboard";
import ManageLectures from "./pages/professor/ManageLectures";
import RealtimeDashboard from "./pages/professor/RealtimeDashboard";
import LectureAnalysis from "./pages/professor/LectureAnalysis";
import ClassAnalysis from "./pages/professor/ClassAnalysus";
import ProfessorClass from "./pages/professor/ProfessorClass";
import ProfessorProfile from "./pages/professor/ProfessorProfile";

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public routes (Layout 없음) */}
          <Route index element={<LandingPage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
          <Route path="register/step1" element={<RegisterStep1 />} />
          <Route path="register/step2" element={<RegisterStep2 />} />
          <Route path="register/step3" element={<RegisterStep3 />} />

          {/* Protected routes with Layout (사이드바 포함) */}
          <Route element={<RequireAuth />}>
            <Route element={<Layout />}>
              {/* Student routes */}
              <Route path="student/dashboard" element={<StudentDashboard />} />
              <Route path="student/participate" element={<LiveWatching />} />
              <Route path="student/questions" element={<MyQuestions />} />
              <Route
                path="student/reports"
                element={<LectureSummaryReport />}
              />

              {/* Professor routes */}
              <Route
                path="professor/dashboard"
                element={<ProfessorDashboard />}
              />
              <Route
                path="professor/manage-lectures"
                element={<ManageLectures />}
              />
              <Route
                path="professor/realtime-dashboard"
                element={<RealtimeDashboard />}
              />
              <Route
                path="professor/realtime-dashboard/:lectureId/:classId/:liveId"
                element={<RealtimeDashboard />}
              />
              <Route path="professor/profile" element={<ProfessorProfile />} />
              <Route path="professor/analysis" element={<LectureAnalysis />} />
              <Route
                path="professor/class-analysis/:id"
                element={<ClassAnalysis />}
              />
              <Route
                path="professor/courses/:id"
                element={<ProfessorClass />}
              />
            </Route>
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
