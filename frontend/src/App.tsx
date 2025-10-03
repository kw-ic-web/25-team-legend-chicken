import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "./components/layout/Layout";

// Common pages
import LandingPage from "./pages/common/LandingPage";
import LoginPage from "./pages/common/LoginPage";
import RegisterPage from "./pages/common/RegisterPage";

// Student pages
import StudentDashboard from "./pages/student/StudentDashboard";
import RealTimeParticipation from "./pages/student/RealTimeParticipation";
import MyQuestions from "./pages/student/MyQuestions";
import LectureSummaryReport from "./pages/student/LectureSummaryReport";

// Professor pages
import ProfessorDashboard from "./pages/professor/ProfessorDashboard";
import CreateLecture from "./pages/professor/CreateLecture";
import ManageLectures from "./pages/professor/ManageLectures";
import RealtimeDashboard from "./pages/professor/RealtimeDashboard";
import LectureAnalysis from "./pages/professor/LectureAnalysis";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          {/* Common routes */}
          <Route index element={<LandingPage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />

          {/* Student routes */}
          <Route path="student/dashboard" element={<StudentDashboard />} />
          <Route
            path="student/participate"
            element={<RealTimeParticipation />}
          />
          <Route path="student/questions" element={<MyQuestions />} />
          <Route path="student/reports" element={<LectureSummaryReport />} />

          {/* Professor routes */}
          <Route path="professor/dashboard" element={<ProfessorDashboard />} />
          <Route path="professor/create-lecture" element={<CreateLecture />} />
          <Route
            path="professor/manage-lectures"
            element={<ManageLectures />}
          />
          <Route
            path="professor/realtime-dashboard"
            element={<RealtimeDashboard />}
          />
          <Route path="professor/analysis" element={<LectureAnalysis />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
