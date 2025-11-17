export interface LectureData {
  id: number;
  title: string;
  date: string;
  attendance: number;
  totalQuestions: number;
  avgEngagement: number;
  keyTopics: string[];
}

export interface QuestionRanking {
  id: number;
  question: string;
  upvotes: number;
  rank: number;
}

export interface StatsData {
  totalQuestions: number;
  totalUpvotes: number;
  participationRate: number;
  mostDifficultConcept: string;
}
