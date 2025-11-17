import { apiFetch } from "./auth/client";

export interface ClassAnalysisKpis {
  totalQuestions?: number;
  totalCurious?: number;
  participationRate?: number;
  hardestConcept?: string;
}

export interface ClassAnalysisTimelineEntry {
  start?: string;
  end?: string;
  questions?: number;
  curious?: number;
}

export interface ClassAnalysisQuestionMatrixEntry {
  text?: string;
  frequency?: number;
  popularity?: number;
  uniqueAuthors?: number;
}

export interface ClassAnalysisConceptNode {
  id: string;
  label: string;
  weight?: number;
}

export interface ClassAnalysisConceptEdge {
  source: string;
  target: string;
  weight?: number;
}

export interface ClassAnalysisLeaderboard {
  topAskers?: Array<{
    userId: string;
    name: string;
    count?: number;
  }>;
  topVoters?: Array<{
    userId: string;
    name: string;
    likes?: number;
  }>;
}

export interface ClassAnalysisReport {
  _id: string;
  lecture_id: string;
  class_id: number;
  kpis?: ClassAnalysisKpis;
  timeline?: ClassAnalysisTimelineEntry[];
  questionMatrix?: ClassAnalysisQuestionMatrixEntry[];
  conceptGraph?: {
    nodes?: ClassAnalysisConceptNode[];
    edges?: ClassAnalysisConceptEdge[];
  };
  leaderboard?: ClassAnalysisLeaderboard;
  gpt?: {
    summary?: string;
    sections?: Record<string, string>;
    usage?: {
      prompt_tokens?: number;
      completion_tokens?: number;
      total_tokens?: number;
      estimated_cost?: number;
    };
  };
  generated_at?: string;
  createdAt?: string;
  updatedAt?: string;
}

export async function getLatestClassAnalysisReport(
  lectureId: string,
  classId: number
): Promise<ClassAnalysisReport> {
  const token = localStorage.getItem("lecq.token");
  if (!token) {
    throw new Error("인증 토큰이 필요합니다.");
  }

  return apiFetch<ClassAnalysisReport>(
    `/api/reports/${lectureId}/classes/${classId}/analysis/latest`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
}
