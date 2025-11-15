import React, { useState } from "react";
import { MessageCircle, ThumbsUp, Users, AlertCircle } from "lucide-react";
import Pagination from "../../components/common/Pagination";

interface LectureData {
  id: number;
  title: string;
  date: string;
  attendance: number;
  totalQuestions: number;
  avgEngagement: number;
  keyTopics: string[];
}

interface QuestionRanking {
  id: number;
  question: string;
  upvotes: number;
  rank: number;
}

const LectureAnalysis: React.FC = () => {
  // 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // 통계 데이터
  const [stats] = useState({
    totalQuestions: 75,
    totalUpvotes: 75,
    participationRate: 75,
    mostDifficultConcept: "네트워크",
  });

  // 강좌 리스트 데이터
  const [lectures] = useState<LectureData[]>([
    {
      id: 1,
      title: "데이터베이스 개론 - 1주차",
      date: "2024-01-15",
      attendance: 45,
      totalQuestions: 12,
      avgEngagement: 8.5,
      keyTopics: ["정규화", "ER 모델", "SQL 기초"],
    },
    {
      id: 2,
      title: "데이터베이스 개론 - 2주차",
      date: "2024-01-22",
      attendance: 43,
      totalQuestions: 8,
      avgEngagement: 7.2,
      keyTopics: ["인덱싱", "트랜잭션", "동시성 제어"],
    },
    {
      id: 3,
      title: "웹 프로그래밍 - 1주차",
      date: "2024-02-01",
      attendance: 38,
      totalQuestions: 15,
      avgEngagement: 9.1,
      keyTopics: ["HTML/CSS", "JavaScript", "DOM 조작"],
    },
    {
      id: 4,
      title: "네트워크 프로그래밍 - 1주차",
      date: "2024-02-08",
      attendance: 42,
      totalQuestions: 20,
      avgEngagement: 8.8,
      keyTopics: ["TCP/IP", "HTTP", "소켓 프로그래밍"],
    },
    {
      id: 5,
      title: "알고리즘 - 1주차",
      date: "2024-02-15",
      attendance: 40,
      totalQuestions: 10,
      avgEngagement: 7.5,
      keyTopics: ["정렬", "탐색", "동적 프로그래밍"],
    },
    {
      id: 6,
      title: "운영체제 - 1주차",
      date: "2024-02-22",
      attendance: 39,
      totalQuestions: 14,
      avgEngagement: 8.2,
      keyTopics: ["프로세스", "스레드", "동기화"],
    },
    {
      id: 7,
      title: "컴퓨터 네트워크 - 1주차",
      date: "2024-03-01",
      attendance: 44,
      totalQuestions: 18,
      avgEngagement: 8.9,
      keyTopics: ["OSI 모델", "라우팅", "전송 계층"],
    },
    {
      id: 8,
      title: "자료구조 - 1주차",
      date: "2024-03-08",
      attendance: 41,
      totalQuestions: 11,
      avgEngagement: 7.8,
      keyTopics: ["배열", "연결 리스트", "스택"],
    },
    {
      id: 9,
      title: "소프트웨어 공학 - 1주차",
      date: "2024-03-15",
      attendance: 37,
      totalQuestions: 9,
      avgEngagement: 7.3,
      keyTopics: ["요구사항", "설계", "테스팅"],
    },
    {
      id: 10,
      title: "인공지능 기초 - 1주차",
      date: "2024-03-22",
      attendance: 46,
      totalQuestions: 22,
      avgEngagement: 9.3,
      keyTopics: ["머신러닝", "딥러닝", "신경망"],
    },
    {
      id: 11,
      title: "보안 프로그래밍 - 1주차",
      date: "2024-03-29",
      attendance: 35,
      totalQuestions: 13,
      avgEngagement: 8.0,
      keyTopics: ["암호화", "인증", "보안 취약점"],
    },
    {
      id: 12,
      title: "모바일 앱 개발 - 1주차",
      date: "2024-04-05",
      attendance: 43,
      totalQuestions: 16,
      avgEngagement: 8.6,
      keyTopics: ["React Native", "네이티브", "API 연동"],
    },
  ]);

  // 질문 순위 데이터 (상위 5개만)
  const [questionRankings] = useState<QuestionRanking[]>([
    {
      id: 1,
      question: "네트워크 계층 구조에 대해 더 자세히 설명해주세요",
      upvotes: 25,
      rank: 1,
    },
    {
      id: 2,
      question: "TCP와 UDP의 차이점은 무엇인가요?",
      upvotes: 18,
      rank: 2,
    },
    {
      id: 3,
      question: "HTTP와 HTTPS의 차이점을 알고 싶습니다",
      upvotes: 15,
      rank: 3,
    },
    {
      id: 4,
      question: "라우팅 프로토콜의 동작 원리를 설명해주세요",
      upvotes: 12,
      rank: 4,
    },
    {
      id: 5,
      question: "소켓 프로그래밍에서 비동기 처리는 어떻게 하나요?",
      upvotes: 10,
      rank: 5,
    },
  ]);

  // 페이지네이션 계산
  const totalPages = Math.ceil(lectures.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedLectures = lectures.slice(startIndex, endIndex);

  return (
    <div className="flex-1 flex flex-col bg-gray-50">
      <div className="p-6 space-y-6">
        {/* 페이지 제목 */}
        <h1 className="text-2xl font-bold text-gray-900">
          강좌 분석 및 리포트
        </h1>

        {/* 상단 통계 카드 섹션 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 총 질문 수 카드 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="w-10 h-10 bg-blue-100 rounded flex items-center justify-center mb-3">
                  <MessageCircle className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="text-sm font-medium text-gray-600 mb-2">
                  총 질문 수
                </h3>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.totalQuestions}개
                </p>
              </div>
            </div>
          </div>

          {/* 총 UPVOTE수 카드 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="w-10 h-10 bg-green-100 rounded flex items-center justify-center mb-3">
                  <ThumbsUp className="w-5 h-5 text-green-600" />
                </div>
                <h3 className="text-sm font-medium text-gray-600 mb-2">
                  총 UPVOTE수
                </h3>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.totalUpvotes}개
                </p>
              </div>
            </div>
          </div>

          {/* 참여 학생 비율 카드 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="w-10 h-10 bg-purple-100 rounded flex items-center justify-center mb-3">
                  <Users className="w-5 h-5 text-purple-600" />
                </div>
                <h3 className="text-sm font-medium text-gray-600 mb-2">
                  참여 학생 비율
                </h3>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.participationRate}%
                </p>
              </div>
            </div>
          </div>

          {/* 가장 어려운 개념 카드 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="w-10 h-10 bg-orange-100 rounded flex items-center justify-center mb-3">
                  <AlertCircle className="w-5 h-5 text-orange-600" />
                </div>
                <h3 className="text-sm font-medium text-gray-600 mb-2">
                  가장 어려운 개념
                </h3>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.mostDifficultConcept}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 하단 섹션: 강좌 리스트와 질문 순위 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 왼쪽: 강좌 리스트 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              강좌 리스트
            </h2>
            <div className="space-y-3">
              {paginatedLectures.map((lecture, index) => (
                <div
                  key={lecture.id}
                  className={`p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors ${
                    index !== paginatedLectures.length - 1 ? "border-b" : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-gray-900 mb-1">
                        {lecture.title}
                      </h3>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>{lecture.date}</span>
                        <span>출석: {lecture.attendance}명</span>
                        <span>질문: {lecture.totalQuestions}개</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                showFirstLast={true}
                maxVisiblePages={5}
              />
            )}
          </div>

          {/* 오른쪽: 강좌 질문 순위 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              강좌 질문 순위
            </h2>
            <div className="space-y-4">
              {questionRankings.slice(0, 5).map((ranking) => (
                <div
                  key={ranking.id}
                  className="p-4 rounded-lg border border-gray-200 bg-gray-50"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-sm font-semibold">
                      {ranking.rank}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-gray-500">
                          {ranking.rank}순위
                        </span>
                        <span className="text-xs text-gray-500">
                          👍 {ranking.upvotes}
                        </span>
                      </div>
                      <p className="text-sm text-gray-900 line-clamp-2">
                        {ranking.question}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LectureAnalysis;
