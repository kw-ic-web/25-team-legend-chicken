import React, { useState, useMemo } from "react";
// import { useParams } from "react-router-dom"; // TODO: 강좌 ID로 데이터 조회
import StatsSection from "../../components/professor/analysis/class/StatsSection";
import PdfViewer from "../../components/professor/analysis/class/PdfViewer";
import DifficultyFeedbackList from "../../components/professor/analysis/class/DifficultyFeedbackList";
import WeekFilter from "../../components/professor/analysis/class/WeekFilter";
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

  return (
    <div className="flex-1 flex flex-col bg-gray-50">
      <div className="p-6 space-y-6">
        {/* 페이지 제목 */}
        <h1 className="text-2xl font-bold text-gray-900">
          강의 분석 및 리포트
        </h1>

        {/* 상단 통계 카드 섹션 */}
        <StatsSection stats={stats} />

        {/* 주차 필터 */}
        <WeekFilter
          weeks={availableWeeks}
          selectedWeek={selectedWeek}
          onWeekChange={setSelectedWeek}
        />

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
      </div>
    </div>
  );
};

export default ClassAnalysis;
