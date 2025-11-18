import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Download, ChevronDown, ChevronUp, Users } from "lucide-react";
import { getClasses, getLectureDetail, getMyLectures } from "../../api/student";
import Toast from "../../components/common/Toast";
import { getBaseUrl, apiFetch } from "../../api/auth/client";
import LessonQuestionModal from "../../components/modal/lessonQuestion/LessonQuestionModal";
import CommonSidebar from "../../components/layout/CommonSidebar";
import { getMyInfo } from "../../api/auth";
import { io, Socket } from "socket.io-client";
import { useAuth } from "../../contexts/AuthContext";

const StudentClass: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const socketRef = useRef<Socket | null>(null);
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
      items: Array<{
        name: string;
        size: string;
        url?: string;
        originalName?: string;
      }>;
    }>
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPdfLoadingFor, setIsPdfLoadingFor] = useState<number | null>(null);
  const [loadedClassIds, setLoadedClassIds] = useState<number[]>([]);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const [isLessonQuestionModalOpen, setIsLessonQuestionModalOpen] =
    useState(false);
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

  // currentLiveClass 변경 시 디버깅
  useEffect(() => {
    console.log("[StudentClass] currentLiveClass changed:", currentLiveClass);
    console.log("[StudentClass] currentLiveClass?.active:", currentLiveClass?.active);
    if (currentLiveClass && currentLiveClass.active) {
      console.log("[StudentClass] ✅ Live banner should be visible!");
      console.log("[StudentClass] classId:", currentLiveClass.classId);
      console.log("[StudentClass] weekTitle:", currentLiveClass.weekTitle);
    }
  }, [currentLiveClass]);
  const [studentInfo, setStudentInfo] = useState({
    name: "",
    title: "학생",
    affiliation: "광운대학교 정보융합학부",
  });
  const [myLectures, setMyLectures] = useState<
    Array<{
      title: string;
      participants: number;
    }>
  >([]);

  // 최신 질문 (임시 데이터, 나중에 API로 교체)
  const latestQuestions = [
    { q: "과목에 대한 질문을 해도 되나요?", a: "네, 얼마든지요..." },
    { q: "실습 환경은 어떻게 구성하나요?", a: "Colab을 권장합니다." },
    { q: "과제 제출 형식이 궁금해요", a: "PDF 혹은 노트북 파일" },
  ];

  const resolveUrl = useCallback((url: string | undefined | null) => {
    if (!url || typeof url !== "string") return url || "";
    return url.startsWith("http") ? url : `${getBaseUrl()}${url}`;
  }, []);

  // 학생 정보 및 강좌 목록 조회
  useEffect(() => {
    const fetchStudentData = async () => {
      try {
        const [myInfoResponse, lecturesResponse] = await Promise.all([
          getMyInfo().catch(() => null),
          getMyLectures().catch(() => null),
        ]);

        if (myInfoResponse?.success && myInfoResponse.user) {
          setStudentInfo({
            name: myInfoResponse.user.name,
            title: "학생",
            affiliation: "광운대학교 정보융합학부",
          });
        }

        if (lecturesResponse?.lectures) {
          const lecturesList = lecturesResponse.lectures.map(
            (lecture: { name: string }) => ({
              title: lecture.name,
              participants: 0,
            })
          );
          setMyLectures(lecturesList.slice(0, 4));
        }
      } catch (error) {
        console.error("학생 정보 조회 실패:", error);
      }
    };

    fetchStudentData();
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
        if (transformedWeeks.length > 0) {
          const liveChecks = await Promise.all(
            transformedWeeks.map(async (week) => {
              try {
                const token = localStorage.getItem("lecq.token");
                if (!token) {
                  console.log(`Week ${week.week}: No token`);
                  return { week: week.week, active: false, liveId: null };
                }
                const response = await apiFetch<{ 
                  active: boolean; 
                  live_id?: number | null;
                  class_id?: number;
                }>(
                  `/api/professor/lectures/${id}/classes/${week.week}/live/current`,
                  {
                    method: "GET",
                    headers: {
                      Authorization: `Bearer ${token}`,
                    },
                  }
                );
                console.log(`Week ${week.week} live status:`, response);
                return { 
                  week: week.week, 
                  active: response.active === true,
                  liveId: response.live_id || null,
                  classId: response.class_id || week.week,
                };
              } catch (error) {
                console.error(`Week ${week.week} live check error:`, error);
                return { week: week.week, active: false, liveId: null, classId: week.week };
              }
            })
          );

          // 현재 라이브 중인 클래스 찾기
          const liveWeek = liveChecks.find((check) => check.active === true);
          console.log("Live checks result:", liveChecks);
          console.log("Active live week:", liveWeek);
          console.log(
            "Current live class state before update:",
            currentLiveClass
          );

          if (liveWeek) {
            const liveWeekData = transformedWeeks.find(
              (w) => w.week === liveWeek.week
            );
            const newLiveClass = {
              active: true,
              classId: liveWeek.classId || liveWeek.week,
              weekTitle: liveWeekData?.title || `${liveWeek.week}주차`,
            };
            console.log("Setting currentLiveClass to:", JSON.stringify(newLiveClass));
            setCurrentLiveClass(newLiveClass);
            console.log("Current live class set:", newLiveClass);
            
            // 이미 시작된 라이브에 대한 알림 표시
            setTimeout(() => {
              setToast({
                message: `${newLiveClass.weekTitle} 라이브가 진행 중입니다! 지금 입장하세요.`,
                type: "success",
              });
            }, 100);
          } else {
            setCurrentLiveClass(null);
            console.log("No active live class found");
          }
        } else {
          console.log("No weeks to check for live status");
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

  // 소켓 연결 및 라이브 시작 알림 리스닝
  useEffect(() => {
    if (!id || !user?.id) return;

    const baseUrl = getBaseUrl();
    const token = localStorage.getItem("lecq.token");

    const socket = io(baseUrl, {
      transports: ["websocket", "polling"],
      withCredentials: true,
      auth: token ? { token } : undefined,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("[StudentClass] Socket connected:", socket.id);
      // 강좌의 baseRoom에 join (모든 클래스의 라이브 이벤트를 받기 위해)
      // 각 클래스별로 join하는 대신, 강좌 전체의 baseRoom에 join
      const joinPayload = {
        lecture_id: id,
        class_id: 0, // 0은 전체 강좌를 의미 (실제 클래스 ID는 live:started 이벤트에서 받음)
        live_id: null,
        role: "student",
        user_id: user.id,
      };
      console.log("[StudentClass] Emitting live:join with payload:", joinPayload);
      socket.emit("live:join", joinPayload);
    });

    socket.on("connect_error", (err) => {
      console.error("[StudentClass] Socket connect error:", err);
    });

    // 라이브 시작 이벤트 리스닝
    socket.on("live:started", (data: {
      lecture_id: string;
      class_id: number;
      live_id: number;
      started_at: string;
      live_path?: string;
      professor?: {
        id: string;
        name: string;
      };
    }) => {
      console.log("[StudentClass] Live started event received:", data);
      console.log("[StudentClass] Current lecture id:", id);
      console.log("[StudentClass] Event lecture id:", data.lecture_id);
      
      // 현재 강좌의 라이브인지 확인
      if (data.lecture_id !== id) {
        console.log("[StudentClass] Lecture ID mismatch, ignoring event");
        return;
      }

      console.log("[StudentClass] Lecture ID matches, processing event");
      console.log("[StudentClass] Current weeks:", weeks);

      // 해당 클래스 정보 찾기
      const weekData = weeks.find((w) => w.week === data.class_id);
      const weekTitle = weekData?.title || `${data.class_id}주차`;
      
      console.log("[StudentClass] Found week data:", weekData);
      console.log("[StudentClass] Week title:", weekTitle);

      // currentLiveClass 업데이트
      setCurrentLiveClass({
        active: true,
        classId: data.class_id,
        weekTitle: weekTitle,
      });

      console.log("[StudentClass] Updated currentLiveClass");

      // 알림 표시
      setToast({
        message: `${weekTitle} 라이브가 시작되었습니다! 지금 입장하세요.`,
        type: "success",
      });
      
      console.log("[StudentClass] Toast notification set");
    });

    // 라이브 종료 이벤트 리스닝
    socket.on("live:ended", (data: {
      lecture_id: string;
      class_id: number;
      live_id: number;
    }) => {
      console.log("[StudentClass] Live ended event:", data);
      
      // 현재 강좌의 라이브인지 확인
      if (data.lecture_id !== id) return;

      // 해당 클래스의 라이브가 종료된 경우
      setCurrentLiveClass((prev) => {
        if (prev?.classId === data.class_id) {
          setToast({
            message: "라이브 방송이 종료되었습니다.",
            type: "success",
          });
          return null;
        }
        return prev;
      });
    });

    return () => {
      socket.off("connect");
      socket.off("connect_error");
      socket.off("live:started");
      socket.off("live:ended");
      socketRef.current = null;
      socket.disconnect();
    };
  }, [id, user?.id, weeks]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  const handleDownload = async (url: string, fileName: string) => {
    try {
      if (!url || typeof url !== "string") {
        setToast({
          message: "파일 URL이 올바르지 않습니다.",
          type: "error",
        });
        return;
      }
      const resolvedUrl = resolveUrl(url);
      if (!resolvedUrl) {
        setToast({
          message: "파일 URL을 확인할 수 없습니다.",
          type: "error",
        });
        return;
      }
      const response = await fetch(resolvedUrl);
      if (!response.ok) {
        if (response.status === 404) {
          setToast({
            message: "파일을 찾을 수 없습니다. 파일이 삭제되었을 수 있습니다.",
            type: "error",
          });
        } else {
          setToast({
            message: `파일 다운로드에 실패했습니다. (${response.status})`,
            type: "error",
          });
        }
        return;
      }
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
      const message =
        error instanceof Error
          ? error.message
          : "파일 다운로드에 실패했습니다.";
      setToast({
        message,
        type: "error",
      });
    }
  };

  const handleDownloadAll = async (
    items: Array<{
      name: string;
      size: string;
      url?: string;
      originalName?: string;
    }>
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

        const newItems = (resp.pdfs || [])
          .filter((pdfUrl) => pdfUrl && typeof pdfUrl === "string")
          .map((pdfUrl) => {
            const url = resolveUrl(pdfUrl);
            const name = url ? url.split("/").pop() || "자료" : "자료";
            return { name, size: "파일", url, originalName: name };
          })
          .filter((item) => item.url); // 유효한 URL만 유지

        // 파일 크기 가져오기
        const itemsWithSize = await Promise.all(
          newItems.map(async (item) => {
            if (!item.url || typeof item.url !== "string") return item;
            try {
              const headResponse = await fetch(item.url, { method: "HEAD" });
              if (!headResponse.ok) {
                // 404 등 에러 시 기본값 유지
                if (headResponse.status === 404) {
                  return {
                    ...item,
                    size: "[ 파일 없음 ]",
                  };
                }
                return item;
              }
              const contentLength = headResponse.headers.get("content-length");
              if (contentLength) {
                return {
                  ...item,
                  size: `[ ${formatFileSize(Number(contentLength))} ]`,
                };
              }
            } catch (error) {
              // 파일 크기 가져오기 실패 시 무시 (404 등)
              console.warn(`파일 크기 조회 실패 (${item.url}):`, error);
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
    <div className="flex-1 flex">
      {/* 사이드바 */}
      <CommonSidebar
        userType="student"
        userInfo={studentInfo}
        myLectures={myLectures}
        hideStudentMyLectures
        additionalContent={
          <div className="p-6 border-t border-gray-200 space-y-6">
            <div>
              <h4 className="text-xl font-extrabold text-gray-900 leading-snug">
                {course.title || "강좌 정보를 불러오는 중..."}
              </h4>
              <div className="mt-2 flex items-center space-x-4 text-gray-800">
                <span className="text-base font-medium">
                  {course.instructor || ""}
                </span>
                <span className="inline-flex items-center space-x-1 text-base">
                  <Users className="w-4 h-4 text-gray-500" />
                  <span>{course.participants}</span>
                </span>
              </div>
              <div className="mt-6 space-y-5 text-gray-700 text-[12px]">
                <p>
                  {course.description ||
                    "이미 12명 이상이 학습하고 만족한 최고의 프로그래밍 입문 강의. 프로그래밍을 전혀 접해보지 못한 사람부터 실제 활용 가능한 프로그래밍 능력까지 갈 수 있도록 도와주는 강의입니다."}
                </p>
              </div>
            </div>
            <div>
              <h4 className="text-md font-semibold text-gray-900 mb-3 border-t border-gray-200 pt-2">
                최신 질문
              </h4>
              <div className="space-y-3 max-h-60 overflow-y-visible pr-1">
                {latestQuestions.map((item, idx) => (
                  <div key={idx} className="border border-gray-200 rounded p-3">
                    <div className="text-sm font-medium text-gray-800">
                      Q. {item.q}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{item.a}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        }
      />

      {/* 메인 콘텐츠 */}
      <section className="flex-1 flex flex-col ml-80 overflow-y-auto">
        {/* 헤더 */}
        <div className="bg-gray-100 px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold text-gray-900">
                {course.title || "강좌 정보를 불러오는 중..."}
              </h1>
            </div>
          </div>
        </div>

        {/* 라이브 알림 및 입장하기 버튼 */}
        {currentLiveClass && currentLiveClass.active && (
          <div className="px-6 py-6 bg-gray-50 border-b border-gray-200 flex-shrink-0" style={{ display: 'block', visibility: 'visible', opacity: 1, position: 'relative', zIndex: 10 }}>
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border-2 border-blue-200 shadow-lg">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-red-500 text-white animate-pulse">
                      🔴 LIVE
                    </span>
                    <p className="text-lg font-bold text-gray-900">
                      현재{" "}
                      <span className="text-blue-600 font-bold">
                        {currentLiveClass.weekTitle}
                      </span>
                      <span className="text-gray-900">가 진행 중입니다.</span>
                    </p>
                  </div>
                  <p className="text-sm text-gray-700 mb-2">
                    지금 입장하면 실시간 채팅과 질문 참여가 가능합니다. 늦지 않게
                    합류하세요!
                  </p>
                  <p className="text-xs text-gray-500">
                    입장 링크: /student/participate?lectureId={course.id}&classId={currentLiveClass.classId}
                  </p>
                </div>
                <button
                  onClick={handleEnterLecture}
                  className="ml-6 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center space-x-2 flex-shrink-0 shadow-md hover:shadow-lg transform hover:scale-105"
                >
                  <span className="text-lg">▷</span>
                  <span>강의 입장하기</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 콘텐츠 */}
        <div className="flex-1 p-6 overflow-y-auto flex-shrink">
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
                      handleToggleWeek(
                        classId,
                        w.title,
                        event.currentTarget.open
                      )
                    }
                  >
                    <summary className="list-none cursor-pointer select-none px-6 py-4 flex items-center justify-between border-b border-gray-200 group-open:border-b">
                      <div className="flex items-center space-x-3">
                        <div className="w-5 h-5 flex items-center justify-center">
                          <ChevronDown className="w-5 h-5 text-gray-500 group-open:hidden transition-transform" />
                          <ChevronUp className="w-5 h-5 text-gray-500 hidden group-open:block transition-transform" />
                        </div>
                        <div className="font-semibold text-gray-900">
                          {w.title}
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="text-sm text-gray-600">
                          {w.items.length}개
                        </span>
                        {w.items.length > 0 && (
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              handleDownloadAll(w.items);
                            }}
                            className="text-sm text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                          >
                            <Download className="w-4 h-4" />
                            <span>전체 다운로드</span>
                          </button>
                        )}
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
                                  <div className="text-xs text-gray-500">
                                    {item.size}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2 ml-4">
                                <button
                                  onClick={() =>
                                    handleViewHandout(classId, w.title)
                                  }
                                  className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                                >
                                  교안 및 질문 보기
                                </button>
                                {item.url && (
                                  <button
                                    onClick={() =>
                                      handleDownload(
                                        item.url!,
                                        item.originalName || item.name
                                      )
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
      </section>

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
