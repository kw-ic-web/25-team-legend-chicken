import React, { useState, useEffect } from "react";
// import { Search } from "lucide-react";
import FilterTabs from "../../components/common/FilterTabs";
import SearchBar from "../../components/common/SearchBar";
import LectureCard from "../../components/common/LectureCard";
import Pagination from "../../components/common/Pagination";
import { getLectures, type Lecture } from "../../api/professor";
import Toast from "../../components/common/Toast";
import { getBaseUrl } from "../../api/auth/client";

const ProfessorDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  // 강의 목록 조회
  useEffect(() => {
    const fetchLectures = async () => {
      setIsLoading(true);
      try {
        const response = await getLectures();
        setLectures(response.lectures || []);
      } catch (error) {
        console.error("강의 목록 조회 오류:", error);
        const errorMessage =
          error instanceof Error
            ? error.message
            : "강의 목록을 불러오는 중 오류가 발생했습니다.";
        setToast({ message: errorMessage, type: "error" });
        setLectures([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLectures();
  }, []);

  // 강의 데이터를 LectureCard 형식으로 변환
  const transformLectureToCard = (lecture: Lecture) => {
    // lecture_id를 그대로 사용 (URL 파라미터로 사용)
    const id = lecture.lecture_id;

    // 상태 판단: classes 배열의 날짜를 기준으로 판단
    // 현재는 간단하게 scheduled로 설정 (실제로는 현재 시간과 비교 필요)
    let status: "broadcasting" | "scheduled" | "completed" = "scheduled";
    if (lecture.classes && lecture.classes.length > 0) {
      const now = new Date();
      const firstClassDate = new Date(lecture.classes[0].date);
      const lastClassDate = new Date(
        lecture.classes[lecture.classes.length - 1].date
      );

      if (now >= firstClassDate && now <= lastClassDate) {
        status = "broadcasting";
      } else if (now > lastClassDate) {
        status = "completed";
      }
    }

    // subject 추출 (lecture_description이나 name에서 추출하거나 기본값 사용)
    const subject = lecture.lecture_description?.includes("파이썬")
      ? "Python"
      : lecture.lecture_description?.includes("웹")
        ? "Web"
        : lecture.lecture_description?.includes("데이터베이스")
          ? "Database"
          : lecture.lecture_description?.includes("머신러닝")
            ? "ML"
            : lecture.lecture_description?.includes("알고리즘")
              ? "Algorithm"
              : lecture.lecture_description?.includes("소프트웨어")
                ? "SE"
                : "Python";

    // 썸네일 절대경로로 변환 (백엔드가 /uploads/... 경로를 반환하는 경우)
    const thumbnail = lecture.thumbnail
      ? lecture.thumbnail.startsWith("http")
        ? lecture.thumbnail
        : `${getBaseUrl()}${lecture.thumbnail}`
      : undefined;

    return {
      id,
      title: lecture.name,
      instructor: lecture.professor_name,
      participants: lecture.student_count,
      status,
      newQuestions: 0, // API 응답에 없으므로 기본값
      subject,
      image: thumbnail,
    };
  };

  // 필터링 및 검색
  const filteredLectures = lectures
    .map((lecture) => transformLectureToCard(lecture))
    .filter((lecture) => {
      // 검색어 필터
      if (searchTerm.trim()) {
        const searchLower = searchTerm.toLowerCase();
        return (
          lecture.title.toLowerCase().includes(searchLower) ||
          lecture.instructor.toLowerCase().includes(searchLower) ||
          lecture.subject.toLowerCase().includes(searchLower)
        );
      }
      return true;
    })
    .filter((lecture) => {
      // 탭 필터
      if (activeTab === "all") return true;
      if (activeTab === "ongoing") return lecture.status === "broadcasting";
      if (activeTab === "completed") return lecture.status === "completed";
      return true;
    });

  // 페이지네이션
  const itemsPerPage = 9;
  const totalPages = Math.ceil(filteredLectures.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedLectures = filteredLectures.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  // 검색어 변경 시 첫 페이지로
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, activeTab]);

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
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-500">강의 목록을 불러오는 중...</div>
          </div>
        ) : paginatedLectures.length === 0 ? (
          <div className="flex items-center justify-center h-64 flex-col space-y-2">
            <div className="text-gray-500">
              {searchTerm || activeTab !== "all"
                ? "검색 결과가 없습니다."
                : "등록된 강의가 없습니다."}
            </div>
            <div className="text-xs text-gray-400">
              전체 강의 수: {lectures.length}개 | 필터링 후:{" "}
              {filteredLectures.length}개
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedLectures.map((lecture) => (
                <LectureCard
                  key={lecture.id}
                  id={lecture.id}
                  title={lecture.title}
                  instructor={lecture.instructor}
                  participants={lecture.participants}
                  status={lecture.status}
                  newQuestions={lecture.newQuestions}
                  subject={lecture.subject}
                  image={lecture.image}
                />
              ))}
            </div>

            {/* 페이지네이션 */}
            {totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                showFirstLast={true}
                maxVisiblePages={5}
              />
            )}
          </>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default ProfessorDashboard;
