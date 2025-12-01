import React, { useState, useEffect } from "react";
import { Search } from "lucide-react";
import LectureCard from "../../components/common/LectureCard";
import Pagination from "../../components/common/Pagination";
import {
  getMyLectures,
  getLiveStatus,
  getLectureDetail,
} from "../../api/student";
import { getBaseUrl } from "../../api/auth/client";
import Toast from "../../components/common/Toast";

const StudentDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  type LectureStatus = "broadcasting" | "scheduled" | "completed";

  const [lectures, setLectures] = useState<
    Array<{
      id: string;
      title: string;
      instructor: string;
      participants: number;
      status: LectureStatus;
      newQuestions: number;
      subject: string;
      image?: string;
    }>
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [liveStatusMap, setLiveStatusMap] = useState<
    Map<string, LectureStatus>
  >(new Map());
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  useEffect(() => {
    const fetchLectures = async () => {
      try {
        setIsLoading(true);
        const response = await getMyLectures();
        const baseLectures = response.lectures.map((lec) => {
          const thumbnail = lec.thumbnail
            ? lec.thumbnail.startsWith("http")
              ? lec.thumbnail
              : `${getBaseUrl()}${lec.thumbnail}`
            : undefined;
          return {
            id: lec.lecture_id,
            title: lec.name,
            instructor: lec.professor_name,
            participants: 0,
            status: "scheduled" as LectureStatus, // 기본값 (라이브 상태 확인 후 업데이트됨)
            newQuestions: 0,
            subject: "Python", // 기본값
            image: thumbnail,
          };
        });

        // 각 강좌의 실제 수강 인원(student_count) 조회
        const counts = await Promise.all(
          baseLectures.map(async (lec) => {
            try {
              const detail = await getLectureDetail(lec.id);
              return { id: lec.id, studentCount: detail.student_count ?? 0 };
            } catch (error) {
              console.error(`강좌 ${lec.id} 상세 조회 실패:`, error);
              return { id: lec.id, studentCount: 0 };
            }
          })
        );
        const countMap = new Map(
          counts.map((c) => [c.id, c.studentCount] as [string, number])
        );

        const mappedLectures = baseLectures.map((lec) => ({
          ...lec,
          participants: countMap.get(lec.id) ?? 0,
        }));

        setLectures(mappedLectures);
      } catch (error) {
        console.error("강의 목록 조회 실패:", error);
        const message =
          error instanceof Error
            ? error.message
            : "강의 목록을 불러오는 중 오류가 발생했습니다.";
        setToast({ message, type: "error" });
      } finally {
        setIsLoading(false);
      }
    };

    fetchLectures();

    // 강의 참여 이벤트 리스너
    const handleLectureJoined = () => {
      fetchLectures();
    };
    window.addEventListener("lecture:joined", handleLectureJoined);
    return () => {
      window.removeEventListener("lecture:joined", handleLectureJoined);
    };
  }, []);

  // 검색어나 탭 변경 시 첫 페이지로
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, activeTab]);

  // 라이브 상태 확인
  useEffect(() => {
    const checkLiveStatuses = async () => {
      if (lectures.length === 0) return;

      const statusMap = new Map<string, LectureStatus>();

      // 각 강좌의 라이브 상태 확인
      const promises = lectures.map(async (lecture) => {
        try {
          const liveStatus = await getLiveStatus(lecture.id);

          const classes = liveStatus.classes || [];

          const hasActiveLive = classes.some(
            (cls) => cls.isLiveActive === true
          );
          const hasAnyLiveHistory = classes.some(
            (cls) => Array.isArray(cls.lives) && cls.lives.length > 0
          );

          let lectureStatus: LectureStatus = "scheduled";
          if (hasActiveLive) {
            lectureStatus = "broadcasting";
          } else if (hasAnyLiveHistory) {
            // 한 번이라도 라이브가 있었고, 지금은 진행 중이 아닌 경우 → 종료된 강좌
            lectureStatus = "completed";
          }

          statusMap.set(lecture.id, lectureStatus);
        } catch (error) {
          console.error(`강좌 ${lecture.id} 라이브 상태 확인 오류:`, error);
          statusMap.set(lecture.id, false);
        }
      });

      await Promise.all(promises);
      setLiveStatusMap(statusMap);
    };

    // 초기 확인
    checkLiveStatuses();

    // 주기적으로 확인 (10초마다)
    const interval = setInterval(checkLiveStatuses, 10000);

    return () => {
      clearInterval(interval);
    };
  }, [lectures]);

  return (
    <div className="flex-1 flex flex-col bg-gradient-to-br from-gray-50 to-gray-100">
      {/* 탭 네비게이션과 검색바 */}
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          {/* 탭 네비게이션 */}
          <div className="flex space-x-1">
            {["전체", "진행 중인 강좌", "종료된 강좌"].map((tab) => (
              <button
                key={tab}
                onClick={() =>
                  setActiveTab(
                    tab === "전체"
                      ? "all"
                      : tab === "진행 중인 강좌"
                        ? "ongoing"
                        : "completed"
                  )
                }
                className={`px-4 py-2 text-sm font-medium rounded transition-colors ${
                  activeTab ===
                  (tab === "전체"
                    ? "all"
                    : tab === "진행 중인 강좌"
                      ? "ongoing"
                      : "completed")
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-600 hover:text-gray-800 border border-gray-200"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* 검색바 */}
          <div className="flex items-center space-x-2">
            <div className="relative">
              <input
                type="text"
                placeholder="검색어를 입력하세요"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-80 px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded transition-colors">
              <Search className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* 콘텐츠 헤더 */}
      <div className="px-6 py-4">
        <h2 className="text-lg font-semibold text-gray-900">콘텐츠</h2>
      </div>

      {/* 강의 카드 그리드 */}
      <div className="flex-1 p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-500">강의 목록을 불러오는 중...</div>
          </div>
        ) : lectures.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-500">수강 중인 강의가 없습니다.</div>
          </div>
        ) : (
          (() => {
            // 필터링된 강좌 목록
            const filteredLectures = lectures
              .map((lecture) => {
                // 라이브 상태 확인 (live-status API 결과 사용)
                const liveStatus = liveStatusMap.get(lecture.id);
                const status: LectureStatus = liveStatus ?? lecture.status;

                return {
                  ...lecture,
                  status,
                };
              })
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
                if (activeTab === "ongoing") {
                  // 진행 중인 강좌: 라이브 방송 중인 경우만
                  return lecture.status === "broadcasting";
                }
                if (activeTab === "completed") {
                  // 종료된 강좌: 한 번이라도 라이브가 있었고, 현재는 방송 중이 아닌 경우
                  return lecture.status === "completed";
                }
                return true;
              });

            // 페이지네이션
            const itemsPerPage = 9;
            const totalPages = Math.ceil(
              filteredLectures.length / itemsPerPage
            );
            const startIndex = (currentPage - 1) * itemsPerPage;
            const paginatedLectures = filteredLectures.slice(
              startIndex,
              startIndex + itemsPerPage
            );

            return (
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
                      userType="student"
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
            );
          })()
        )}
      </div>

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

export default StudentDashboard;
