import React, { useState } from "react";
// import { Search } from "lucide-react";
import FilterTabs from "../../components/common/FilterTabs";
import SearchBar from "../../components/common/SearchBar";
import LectureCard from "../../components/common/LectureCard";
import Pagination from "../../components/common/Pagination";

const ProfessorDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // 강의 카드 데이터
  const lectures = [
    {
      id: 1,
      title: "프로그래밍 시작하기: 파이썬 입문",
      instructor: "김철수",
      participants: 30,
      status: "broadcasting" as const,
      newQuestions: 2,
      subject: "Python",
      level: "Level. 1",
    },
    {
      id: 2,
      title: "웹 개발 기초",
      instructor: "김철수",
      participants: 20,
      status: "scheduled" as const,
      newQuestions: 0,
      subject: "Web",
      level: "Level. 2",
    },
    {
      id: 3,
      title: "데이터베이스 설계",
      instructor: "김철수",
      participants: 12,
      status: "completed" as const,
      newQuestions: 0,
      subject: "Database",
      level: "Level. 3",
    },
    {
      id: 4,
      title: "머신러닝 입문",
      instructor: "김철수",
      participants: 25,
      status: "broadcasting" as const,
      newQuestions: 1,
      subject: "ML",
      level: "Level. 4",
    },
    {
      id: 5,
      title: "알고리즘과 자료구조",
      instructor: "김철수",
      participants: 18,
      status: "scheduled" as const,
      newQuestions: 0,
      subject: "Algorithm",
      level: "Level. 3",
    },
    {
      id: 6,
      title: "소프트웨어 공학",
      instructor: "김철수",
      participants: 22,
      status: "completed" as const,
      newQuestions: 0,
      subject: "SE",
      level: "Level. 2",
    },
  ];

  return (
    <div className="flex-1 flex flex-col">
      {/* 탭 네비게이션과 검색바 */}
      <div className=" px-6 py-4">
        <div className="flex items-center justify-between">
          {/* 탭 네비게이션 */}
          <FilterTabs
            tabs={[
              { label: "전체", value: "all" },
              { label: "진행 중인 강좌", value: "ongoing" },
              { label: "종료된 강좌", value: "completed" },
            ]}
            activeValue={activeTab}
            onChange={setActiveTab}
          />

          {/* 검색바 */}
          <SearchBar
            value={searchTerm}
            onChange={setSearchTerm}
            onSubmit={() => {
              /* TODO: hook up search */
            }}
          />
        </div>
      </div>

      {/* 콘텐츠 헤더 */}
      <div className=" px-6 py-4">
        <h2 className="text-lg font-semibold text-gray-900">콘텐츠</h2>
      </div>

      {/* 강의 카드 그리드 */}
      <div className="flex-1 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {lectures.map((lecture) => (
            <LectureCard
              key={lecture.id}
              id={lecture.id}
              title={lecture.title}
              instructor={lecture.instructor}
              participants={lecture.participants}
              status={lecture.status}
              newQuestions={lecture.newQuestions}
              subject={lecture.subject}
              level={lecture.level}
            />
          ))}
        </div>

        {/* 페이지네이션 */}
        <Pagination
          currentPage={currentPage}
          totalPages={12}
          onPageChange={setCurrentPage}
          showFirstLast={true}
          maxVisiblePages={5}
        />
      </div>
    </div>
  );
};

export default ProfessorDashboard;
