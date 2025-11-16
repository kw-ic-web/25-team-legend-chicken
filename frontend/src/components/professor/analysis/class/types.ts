export interface ClassData {
  id: number;
  title: string;
  date: string;
  attendance: number;
  totalQuestions: number;
  avgEngagement: number;
  keyTopics: string[];
  week: number; // 주차 정보 추가
  pdfUrl?: string; // PDF URL 추가
  pdfFileName?: string; // PDF 파일명 추가
  difficultyScore?: number; // 어려움 점수 추가
}

export interface StatsData {
  totalQuestions: number;
  totalUpvotes: number;
  participationRate: number;
  mostDifficultConcept: string;
}

export interface DifficultyFeedback {
  id: number;
  title: string;
  description: string;
  details: string[];
  week: number; // 어느 주차의 피드백인지
}
