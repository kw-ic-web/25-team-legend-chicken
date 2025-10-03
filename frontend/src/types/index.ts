// 사용자 타입
export interface User {
  id: number;
  name: string;
  email: string;
  userType: "student" | "professor";
  createdAt: string;
}

// 강의 타입
export interface Lecture {
  id: number;
  title: string;
  description: string;
  subject: string;
  professorId: number;
  professorName: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  maxStudents: number;
  currentStudents: number;
  status: "upcoming" | "ongoing" | "completed";
  createdAt: string;
}

// 질문 타입
export interface Question {
  id: number;
  lectureId: number;
  studentId: number;
  studentName: string;
  question: string;
  answer?: string;
  status: "pending" | "answered" | "rejected";
  timestamp: string;
  answeredAt?: string;
}

// 강의 리포트 타입
export interface LectureReport {
  id: number;
  lectureId: number;
  lectureName: string;
  professor: string;
  date: string;
  summary: string;
  keyPoints: string[];
  questions: string[];
  attendance: number;
  totalStudents: number;
  avgEngagement: number;
}

// 실시간 대시보드 통계 타입
export interface RealtimeStats {
  totalStudents: number;
  activeStudents: number;
  totalQuestions: number;
  pendingQuestions: number;
}

// 강의 분석 데이터 타입
export interface LectureAnalysis {
  lectureId: number;
  title: string;
  date: string;
  attendance: number;
  totalQuestions: number;
  avgEngagement: number;
  keyTopics: string[];
  charts: {
    type: "attendance" | "questions" | "engagement";
    data: { label: string; value: number }[];
  }[];
}

// API 응답 타입
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

// 폼 데이터 타입
export interface LoginFormData {
  email: string;
  password: string;
}

export interface RegisterFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  userType: "student" | "professor";
}

export interface CreateLectureFormData {
  title: string;
  description: string;
  subject: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  maxStudents: number;
}
