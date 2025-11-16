import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Download, ChevronDown, ChevronUp } from "lucide-react";
import { getClasses, getLectureDetail, type LectureClass } from "../../api/student";
import Toast from "../../components/common/Toast";
import { getBaseUrl, apiFetch } from "../../api/auth/client";
import LessonQuestionModal from "../../components/modal/lessonQuestion/LessonQuestionModal";

const StudentClass: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState({
    id: id || "",
    title: "",
    instructor: "",
    description: "",
    participants: 0,
  });
  const [weeks, setWeeks] = useState<
    Array<{
      week: number;
      title: string;
      items: Array<{ name: string; size: string; url?: string; originalName?: string }>;
    }>
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPdfLoadingFor, setIsPdfLoadingFor] = useState<number | null>(null);
  const [loadedClassIds, setLoadedClassIds] = useState<number[]>([]);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const [isLessonQuestionModalOpen, setIsLessonQuestionModalOpen] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState<{
    title: string;
    fileName: string;
    fileSize: string;
  } | null>(null);
  const [currentLiveClass, setCurrentLiveClass] = useState<{
    active: boolean;
    classId: number;
    weekTitle: string;
  } | null>(null);

  const resolveUrl = useCallback((url: string) => {
    if (!url) return url;
    return url.startsWith("http") ? url : `${getBaseUrl()}${url}`;
  }, []);

  // 클래스 목록 및 강좌 정보 조회
  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;

      setIsLoading(true);
      try {
        const [classesResponse, lectureDetailResponse] = await Promise.all([
          getClasses(id),
          getLectureDetail(id).catch(() => null),
        ]);

        // 강좌 정보 업데이트
        setCourse({
          id: classesResponse.lecture_id,
          title: classesResponse.lecture_name,
          instructor: lectureDetailResponse?.professor_name || "",
          description: lectureDetailResponse?.lecture_description || "",
          participants: lectureDetailResponse?.student_count || 0,
        });


        // 클래스를 weeks 형식으로 변환
        const transformedWeeks =
          classesResponse.classes && classesResponse.classes.length > 0
            ? classesResponse.classes.map((cls, index) => {
                const classId = Number(
                  cls.id !== undefined && cls.id !== null ? cls.id : index + 1
                );
                const title = cls.title
                  ? `${classId}주차. ${cls.title}`
                  : `${classId}주차`;
                return {
                  week: classId,
                  title,
                  items: [],
                };
              })
            : [];

        setWeeks(transformedWeeks);

        // 각 클래스의 라이브 상태 확인
        const liveChecks = await Promise.all(
          transformedWeeks.map(async (week) => {
            try {
              const token = localStorage.getItem("lecq.token");
              if (!token) return { week: week.week, active: false };
              const response = await apiFetch<{ active: boolean }>(
                `/api/professor/lectures/${id}/classes/${week.week}/live/current`,
                {
                  method: "GET",
                  headers: {
                    Authorization: `Bearer ${token}`,
                  },
                }
              );
              return { week: week.week, active: response.active };
            } catch {
              return { week: week.week, active: false };
            }
          })
        );

        // 현재 라이브 중인 클래스 찾기
        const liveWeek = liveChecks.find((check) => check.active);
        if (liveWeek) {
          const liveWeekData = transformedWeeks.find(
            (w) => w.week === liveWeek.week
          );
          setCurrentLiveClass({
            active: true,
            classId: liveWeek.week,
            weekTitle: liveWeekData?.title || `${liveWeek.week}주차`,
          });
        } else {
          setCurrentLiveClass(null);
        }
      } catch (error) {
        console.error("데이터 조회 실패:", error);
        const message =
          error instanceof Error
            ? error.message
            : "클래스 목록을 불러오는 중 오류가 발생했습니다.";
        setToast({ message, type: "error" });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  const handleDownload = async (url: string, fileName: string) => {
    try {
      const resolvedUrl = resolveUrl(url);
      const response = await fetch(resolvedUrl);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error("다운로드 실패:", error);
      setToast({
        message: "파일 다운로드에 실패했습니다.",
        type: "error",
      });
    }
  };

  const handleDownloadAll = async (
    items: Array<{ name: string; size: string; url?: string; originalName?: string }>
  ) => {
    for (const item of items) {
      if (item.url) {
        await handleDownload(item.url, item.originalName || item.name);
        // 다운로드 간 약간의 지연
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    }
  };

  const handleViewHandout = async (classId: number, defaultTitle: string) => {
    if (!course.id) return;
    setIsPdfLoadingFor(classId);
    try {
      const token = localStorage.getItem("lecq.token");
      if (!token) {
        throw new Error("인증 토큰이 필요합니다.");
      }
      const resp = await apiFetch<{
        lecture_id: string;
        lecture_name: string;
        class_id: number;
        class_title: string;
        pdf_count: number;
        pdfs: string[];
      }>(`/api/professor/lectures/${course.id}/classes/${classId}/pdf`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const materials = resp.pdfs || [];
      if (materials.length === 0) {
        setToast({ message: "자료가 없습니다.", type: "error" });
        return;
      }

      const firstMaterial = materials[0];
      const resolvedUrl = resolveUrl(firstMaterial);
      const fileName = firstMaterial.split("/").pop() || "자료";

      // 파일 크기 가져오기
      let fileSize = "파일";
      try {
        const headResponse = await fetch(resolvedUrl, { method: "HEAD" });
        const contentLength = headResponse.headers.get("content-length");
        if (contentLength) {
          fileSize = `[ ${formatFileSize(Number(contentLength))} ]`;
        }
      } catch {
        // 파일 크기 가져오기 실패 시 무시
      }

      setSelectedLesson({
        title: resp.class_title || defaultTitle,
        fileName,
        fileSize,
      });
      setIsLessonQuestionModalOpen(true);
    } catch (error) {
      console.error("클래스 정보 조회 실패:", error);
      const message =
        error instanceof Error
          ? error.message
          : "클래스 정보를 불러오는 중 오류가 발생했습니다.";
      setToast({ message, type: "error" });
    } finally {
      setIsPdfLoadingFor(null);
    }
  };

  const fetchClassPdfs = useCallback(
    async (classId: number, defaultTitle: string) => {
      if (!course.id) return;
      setIsPdfLoadingFor(classId);
      try {
        const token = localStorage.getItem("lecq.token");
        if (!token) {
          throw new Error("인증 토큰이 필요합니다.");
        }
        const resp = await apiFetch<{
          lecture_id: string;
          lecture_name: string;
          class_id: number;
          class_title: string;
          pdf_count: number;
          pdfs: string[];
        }>(`/api/professor/lectures/${course.id}/classes/${classId}/pdf`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const newItems = (resp.pdfs || []).map((pdfUrl) => {
          const url = resolveUrl(pdfUrl);
          const name = url.split("/").pop() || "자료";
          return { name, size: "파일", url, originalName: name };
        });

        // 파일 크기 가져오기
        const itemsWithSize = await Promise.all(
          newItems.map(async (item) => {
            if (!item.url) return item;
            try {
              const headResponse = await fetch(item.url, { method: "HEAD" });
              const contentLength = headResponse.headers.get("content-length");
              if (contentLength) {
                return {
                  ...item,
                  size: `[ ${formatFileSize(Number(contentLength))} ]`,
                };
              }
            } catch {
              // 파일 크기 가져오기 실패 시 무시
            }
            return item;
          })
        );

        setWeeks((prev) =>
          prev.map((w) =>
            Number(w.week) === Number(classId)
              ? {
                  ...w,
                  title: resp.class_title
                    ? `${classId}주차. ${resp.class_title}`
                    : defaultTitle || w.title,
                  items: itemsWithSize,
                }
              : w
          )
        );
        setLoadedClassIds((prev) =>
          prev.includes(classId) ? prev : [...prev, classId]
        );
      } catch (error) {
        console.error("PDF 목록 조회 실패:", error);
        const message =
          error instanceof Error
            ? error.message
            : "PDF 목록을 불러오는 중 오류가 발생했습니다.";
        setToast({ message, type: "error" });
      } finally {
        setIsPdfLoadingFor((current) => (current === classId ? null : current));
      }
    },
    [course.id, resolveUrl]
  );

  const handleToggleWeek = useCallback(
    (classId: number, defaultTitle: string, isOpen: boolean) => {
      if (!isOpen) return;
      if (loadedClassIds.includes(classId)) return;
      fetchClassPdfs(classId, defaultTitle);
    },
    [fetchClassPdfs, loadedClassIds]
  );

  const handleEnterLecture = () => {
    if (currentLiveClass?.active && currentLiveClass?.classId) {
      navigate(
        `/student/participate?lectureId=${course.id}&classId=${currentLiveClass.classId}`
      );
    }
  };

  const handleLessonQuestionModalClose = () => {
    setIsLessonQuestionModalOpen(false);
    setSelectedLesson(null);
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* 헤더 */}
      <div className="bg-gray-100 px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-bold text-gray-900">{course.title}</h1>
            {currentLiveClass?.active && (
              <div className="flex items-center space-x-2 px-3 py-1 bg-red-100 rounded-md">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <span className="text-red-600 text-sm font-medium">
                  LIVE • 진행 중
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 라이브 알림 및 입장하기 버튼 */}
      {currentLiveClass?.active && (
        <div className="bg-gray-50 px-6 py-6 border-b border-gray-200">
          <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-lg font-bold text-gray-900 mb-2">
                  현재{" "}
                  <span className="text-blue-600 font-bold">
                    {currentLiveClass.weekTitle.match(/^\d+주차/)?.[0] || ""} 강의
                  </span>
                  <span className="text-gray-900">가 진행 중입니다.</span>
                </p>
                <p className="text-sm text-gray-700">
                  지금 입장하면 실시간 채팅과 질문 참여가 가능합니다. 늦지 않게 합류하세요!
                </p>
              </div>
              <button
                onClick={handleEnterLecture}
                className="ml-6 px-6 py-3 bg-black hover:bg-gray-900 text-white font-medium rounded-lg transition-colors flex items-center space-x-2 flex-shrink-0"
              >
                <span className="text-lg">▷</span>
                <span>강의 입장하기</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 콘텐츠 */}
      <div className="flex-1 p-6 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-500">클래스 목록을 불러오는 중...</div>
          </div>
        ) : weeks.length === 0 && course.title ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-500">등록된 클래스가 없습니다.</div>
          </div>
        ) : weeks.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-500">
              클래스 목록을 불러올 수 없습니다. 페이지를 새로고침해주세요.
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {weeks.map((w) => {
              const classId = Number(w.week);
              return (
                <details
                  key={w.week}
                  className="bg-white border border-gray-200 rounded-lg group"
                  open={w.week === 1}
                  onToggle={(event) =>
                    handleToggleWeek(classId, w.title, event.currentTarget.open)
                  }
                >
                  <summary className="list-none cursor-pointer select-none px-6 py-4 flex items-center justify-between border-b border-gray-200 group-open:border-b">
                    <div className="flex items-center space-x-3">
                      <div className="w-5 h-5 flex items-center justify-center">
                        <ChevronDown className="w-5 h-5 text-gray-500 group-open:hidden transition-transform" />
                        <ChevronUp className="w-5 h-5 text-gray-500 hidden group-open:block transition-transform" />
                      </div>
                      <div className="font-semibold text-gray-900">{w.title}</div>
                    </div>
                  </summary>
                  <div className="p-6 space-y-3">
                    {isPdfLoadingFor === classId ? (
                      <div className="text-center py-4 text-gray-500">
                        자료를 불러오는 중...
                      </div>
                    ) : w.items.length === 0 ? (
                      <div className="text-center py-4 text-gray-500">
                        등록된 자료가 없습니다.
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-sm text-gray-600">
                            {w.items.length}개의 파일
                          </span>
                          <button
                            onClick={() => handleDownloadAll(w.items)}
                            className="text-sm text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                          >
                            <Download className="w-4 h-4" />
                            <span>전체 다운로드</span>
                          </button>
                        </div>
                        {w.items.map((item, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-3 border border-gray-200 rounded hover:bg-gray-50"
                          >
                            <div className="flex items-center space-x-3 flex-1 min-w-0">
                              <Download className="w-5 h-5 text-gray-400 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-gray-900 truncate">
                                  {item.name}
                                </div>
                                <div className="text-xs text-gray-500">{item.size}</div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2 ml-4">
                              <button
                                onClick={() =>
                                  handleViewHandout(classId, w.title)
                                }
                                className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                              >
                                자료 보기
                              </button>
                              {item.url && (
                                <button
                                  onClick={() =>
                                    handleDownload(item.url!, item.originalName || item.name)
                                  }
                                  className="px-3 py-1.5 text-sm bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors flex items-center space-x-1"
                                >
                                  <Download className="w-4 h-4" />
                                  <span>다운로드</span>
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </details>
              );
            })}
          </div>
        )}
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {isLessonQuestionModalOpen && selectedLesson && (
        <LessonQuestionModal
          isOpen={isLessonQuestionModalOpen}
          onClose={handleLessonQuestionModalClose}
          lessonTitle={selectedLesson.title}
          fileName={selectedLesson.fileName}
          fileSize={selectedLesson.fileSize}
          questions={[]}
        />
      )}
    </div>
  );
};

export default StudentClass;

