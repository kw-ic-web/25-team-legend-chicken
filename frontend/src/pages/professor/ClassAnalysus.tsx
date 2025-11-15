import React, { useState, useMemo } from "react";
// import { useParams } from "react-router-dom"; // TODO: 강좌 ID로 데이터 조회
import StatsSection from "../../components/professor/analysis/class/StatsSection";
import PdfViewer from "../../components/professor/analysis/class/PdfViewer";
import DifficultyFeedbackList from "../../components/professor/analysis/class/DifficultyFeedbackList";
import WeekFilter from "../../components/professor/analysis/class/WeekFilter";
import QuestionCategoryChart from "../../components/professor/analysis/class/charts/QuestionCategoryChart";
import LeaderboardChart from "../../components/professor/analysis/class/charts/LeaderboardChart";
import InteractionTimelineChart from "../../components/professor/analysis/class/charts/InteractionTimelineChart";
import QuestionTrendChart from "../../components/professor/analysis/class/charts/QuestionTrendChart";
import ConceptNetworkChart from "../../components/professor/analysis/class/charts/ConceptNetworkChart";
import ComparisonChart from "../../components/professor/analysis/class/charts/ComparisonChart";
import type {
  ClassData,
  DifficultyFeedback,
} from "../../components/professor/analysis/class/types";

const ClassAnalysis: React.FC = () => {
  // const { id } = useParams<{ id: string }>(); // TODO: 강좌 ID로 데이터 조회
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);

  // 통계 데이터
  const [stats] = useState({
    totalQuestions: 75,
    totalUpvotes: 75,
    participationRate: 75,
    mostDifficultConcept: "네트워크",
  });

  // 강의 데이터 (주차별)
  const [classes] = useState<ClassData[]>([
    {
      id: 1,
      title: "데이터베이스 개론 - 1주차",
      date: "2024-01-15",
      attendance: 45,
      totalQuestions: 12,
      avgEngagement: 8.5,
      keyTopics: ["정규화", "ER 모델", "SQL 기초"],
      week: 1,
      pdfUrl: "/uploads/pdfs/lecture1.pdf",
      pdfFileName: "데이터베이스_개론_1주차.pdf",
      difficultyScore: 7.2,
    },
    {
      id: 2,
      title: "데이터베이스 개론 - 2주차",
      date: "2024-01-22",
      attendance: 43,
      totalQuestions: 8,
      avgEngagement: 7.2,
      keyTopics: ["인덱싱", "트랜잭션", "동시성 제어"],
      week: 2,
      pdfUrl: "/uploads/pdfs/lecture2.pdf",
      pdfFileName: "데이터베이스_개론_2주차.pdf",
      difficultyScore: 6.8,
    },
    {
      id: 3,
      title: "네트워크 프로그래밍 - 1주차",
      date: "2024-02-08",
      attendance: 42,
      totalQuestions: 20,
      avgEngagement: 8.8,
      keyTopics: ["TCP/IP", "HTTP", "소켓 프로그래밍"],
      week: 1,
      pdfUrl: "/uploads/pdfs/network1.pdf",
      pdfFileName: "네트워크_프로그래밍_1주차.pdf",
      difficultyScore: 9.5, // 가장 어려운 주차
    },
    {
      id: 4,
      title: "네트워크 프로그래밍 - 2주차",
      date: "2024-02-15",
      attendance: 40,
      totalQuestions: 15,
      avgEngagement: 8.0,
      keyTopics: ["라우팅", "전송 계층"],
      week: 2,
      pdfUrl: "/uploads/pdfs/network2.pdf",
      pdfFileName: "네트워크_프로그래밍_2주차.pdf",
      difficultyScore: 8.3,
    },
  ]);

  // 어려움 피드백 데이터
  const [feedbacks] = useState<DifficultyFeedback[]>([
    {
      id: 1,
      title: "개념이 너무 추상적이에요",
      description:
        "PDF에 나오는 구조도는 복잡하고, 한 번에 여러 정보를 담고 있어서",
      details: [
        "PDF에 나오는 구조도는 복잡하고, 한 번에 여러 정보를 담고 있어서",
        '"이게 어디에 쓰이는지?"가 직관적으로 안 보입니다.',
      ],
      week: 1,
    },
    {
      id: 2,
      title: "층마다 역할이 비슷해 보여요",
      description: "입력층/은닉층/출력층이라는 개념은 알지만,",
      details: [
        "입력층/은닉층/출력층이라는 개념은 알지만,",
        "은닉층들이 서로 어떤 차이가 있는지 구분하기 어려워합니다.",
      ],
      week: 1,
    },
    {
      id: 3,
      title: "예시가 없어 실제 적용을 상상하기 어려움",
      description: "PDF에서 공식이나 구조 설명은 나오지만",
      details: [
        "PDF에서 공식이나 구조 설명은 나오지만",
        '"이게 실제로 모델을 돌릴 때 어떤 영향을 주지?" 하는 감이 잘 안 잡힌다는 피드백이 많았습니다.',
      ],
      week: 1,
    },
  ]);

  // 가장 어려운 주차 찾기
  const mostDifficultClass = useMemo(() => {
    return classes.reduce((prev, current) => {
      return (prev.difficultyScore || 0) > (current.difficultyScore || 0)
        ? prev
        : current;
    }, classes[0]);
  }, [classes]);

  // 필터링된 피드백
  const filteredFeedbacks = useMemo(() => {
    if (selectedWeek === null) {
      return feedbacks;
    }
    return feedbacks.filter((feedback) => feedback.week === selectedWeek);
  }, [feedbacks, selectedWeek]);

  // 사용 가능한 주차 목록
  const availableWeeks = useMemo(() => {
    const weeks = new Set(feedbacks.map((f) => f.week));
    return Array.from(weeks).sort((a, b) => a - b);
  }, [feedbacks]);

  // 현재 표시할 PDF (선택된 주차가 있으면 해당 주차, 없으면 가장 어려운 주차)
  const currentPdfClass = useMemo(() => {
    if (selectedWeek !== null) {
      const found = classes.find((c) => c.week === selectedWeek);
      return found || mostDifficultClass;
    }
    return mostDifficultClass;
  }, [selectedWeek, classes, mostDifficultClass]);

  // 차트 데이터
  const questionCategoryData = [
    { name: "클로저", value: 20, color: "#7c3aed", percentage: 35 },
    { name: "스코프", value: 15, color: "#3b82f6", percentage: 26 },
    { name: "호이스팅", value: 10, color: "#8b5cf6", percentage: 18 },
    { name: "비동기", value: 8, color: "#c4b5fd", percentage: 15 },
  ];

  const leaderboardData = [
    { name: "김지훈", curious: 45, questions: 10 },
    { name: "박민서", curious: 38, questions: 12 },
    { name: "이수현", curious: 30, questions: 8 },
    { name: "익명", curious: 20, questions: 7 },
  ];

  const timelineData = [
    { time: 0, curious: 4, questions: 2 },
    { time: 5, curious: 12, questions: 8 },
    { time: 10, curious: 9, questions: 6 },
    { time: 15, curious: 20, questions: 15 },
    { time: 20, curious: 13, questions: 7 },
    { time: 25, curious: 6, questions: 4 },
  ];

  const trendData = [
    { time: "10", value: 5 },
    { time: "20", value: 8 },
    { time: "10", value: 2 },
    { time: "20", value: 6 },
    { time: "10", value: 3 },
    { time: "20", value: 5 },
  ];

  const conceptNodes = [
    { id: "closure", label: "클로저", x: 200, y: 80 },
    { id: "let", label: "let", x: 300, y: 80 },
    { id: "scope", label: "스코프", x: 150, y: 150 },
    { id: "hoisting", label: "호이스팅", x: 320, y: 150 },
    { id: "async", label: "비동기", x: 200, y: 220 },
  ];

  const conceptConnections = [
    { from: "closure", to: "scope", thickness: 3 },
    { from: "closure", to: "let", thickness: 1 },
    { from: "let", to: "scope", thickness: 1 },
    { from: "let", to: "hoisting", thickness: 1 },
    { from: "scope", to: "async", thickness: 1 },
  ];

  const comparisonData = [
    { category: "질문 수", current: 85, previous: 68 },
    { category: "참여도", current: 78, previous: 69 },
    { category: "이해도", current: 80, previous: 74 },
  ];

  return (
    <div className="flex-1 flex flex-col bg-gray-50">
      <div className="p-6 space-y-6">
        {/* 페이지 제목 및 주차 필터 */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">
            강의 분석 및 리포트
          </h1>
          <WeekFilter
            weeks={availableWeeks}
            selectedWeek={selectedWeek}
            onWeekChange={setSelectedWeek}
          />
        </div>

        {/* 상단 통계 카드 섹션 */}
        <StatsSection stats={stats} />

        {/* 메인 콘텐츠: PDF 뷰어와 피드백 리스트 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 왼쪽: PDF 뷰어 */}
          <div className="flex flex-col">
            <PdfViewer
              pdfUrl={currentPdfClass.pdfUrl}
              fileName={currentPdfClass.pdfFileName}
              week={currentPdfClass.week}
            />
          </div>

          {/* 오른쪽: 어려움 피드백 리스트 */}
          <DifficultyFeedbackList feedbacks={filteredFeedbacks} />
        </div>

        {/* 분석 차트 섹션 */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-gray-900">상세 분석</h2>

          {/* 첫 번째 행: 질문 카테고리, 리더보드 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <QuestionCategoryChart
              data={questionCategoryData}
              totalText='"클로저 관련 질문이 전체의 35%로 가장 많음"'
            />
            <LeaderboardChart
              data={leaderboardData}
              description="질문과 반응이 활발한 상위 참여자 식별 - 가산점 부여 또는 피드백 관리 가능"
            />
          </div>

          {/* 두 번째 행: 상호작용 타임라인, 질문 트렌드 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <InteractionTimelineChart
              data={timelineData}
              annotation="15분 구간에서 질문과 궁금해요 급증 → 비동기 처리 개념 혼동 구간으로 추정"
            />
            <QuestionTrendChart
              data={trendData}
              annotation='"20분 구간에서 클로저 관련 질문 급증 - 개념 혼동 지점"'
            />
          </div>

          {/* 세 번째 행: 개념 네트워크, 지난 강의와 비교 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ConceptNetworkChart
              nodes={conceptNodes}
              connections={conceptConnections}
              description='"클로저와 스코프의 연결이 두꺼울수록 학생들이 두 개념을 혼동한다는 의미"'
            />
            <ComparisonChart
              data={comparisonData}
              summary="전반적으로 질문 수, 참여도, 이해도가 모두 지난 강의보다 향상됨"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClassAnalysis;
