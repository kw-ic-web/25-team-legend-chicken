import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Download, ChevronDown, ChevronUp, Users } from "lucide-react";
import { getClasses, getLectureDetail, getClassMaterials, getMyQuestions, type MyQuestionItem } from "../../api/student";
import { getMaterialPages } from "../../api/materials";
import Toast from "../../components/common/Toast";
import { getBaseUrl, apiFetch } from "../../api/auth/client";
import LessonQuestionModal from "../../components/modal/lessonQuestion/LessonQuestionModal";
import CommonSidebar from "../../components/layout/CommonSidebar";
import { getMyInfo } from "../../api/auth";
import { io, Socket } from "socket.io-client";
import { useAuth } from "../../contexts/AuthContext";
import type { WhiteboardPage } from "../../api/professor";

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
    url?: string;
    lectureId?: string;
    classId?: number;
    pages?: WhiteboardPage[];
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
  // 최신 질문 관련 state
  const [latestQuestions, setLatestQuestions] = useState<MyQuestionItem[]>([]);
  const [isLatestQuestionsLoading, setIsLatestQuestionsLoading] = useState(false);
  const [latestQuestionsError, setLatestQuestionsError] = useState<string | null>(null);
  const [selectedQuestionClassId, setSelectedQuestionClassId] = useState<number | null>(null);

  const resolveUrl = useCallback((url: string | undefined | null) => {
    if (!url || typeof url !== "string") return url || "";
    return url.startsWith("http") ? url : `${getBaseUrl()}${url}`;
  }, []);

  // 학생 정보 및 강좌 목록 조회
  useEffect(() => {
    const fetchStudentData = async () => {
      try {
        const myInfoResponse = await getMyInfo().catch(() => null);

        if (myInfoResponse?.success && myInfoResponse.user) {
          setStudentInfo({
            name: myInfoResponse.user.name,
            title: "학생",
            affiliation: "광운대학교 정보융합학부",
          });
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
                  lecture_id?: string;
                }>(
                  `/api/professor/lectures/${id}/classes/${week.week}/live/current`,
                  {
                    method: "GET",
                    headers: {
                      Authorization: `Bearer ${token}`,
                    },
                  }
                );
                console.log(`[StudentClass] Week ${week.week} live status:`, response);
                const isActive = response.active === true;
                console.log(`[StudentClass] Week ${week.week} isActive:`, isActive);
                return { 
                  week: week.week, 
                  active: isActive,
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
          console.log("[StudentClass] Live checks result:", liveChecks);
          console.log("[StudentClass] Active live week:", liveWeek);
          console.log("[StudentClass] Current live class state before update:", currentLiveClass);

          if (liveWeek) {
            const liveWeekData = transformedWeeks.find(
              (w) => w.week === liveWeek.week
            );
            const weekTitle = liveWeekData?.title || `${liveWeek.week}주차`;
            const newLiveClass = {
              active: true,
              classId: liveWeek.classId || liveWeek.week,
              weekTitle: weekTitle,
            };
            console.log("[StudentClass] Setting currentLiveClass to:", JSON.stringify(newLiveClass));
            setCurrentLiveClass(newLiveClass);
            console.log("[StudentClass] ✅ Current live class set:", newLiveClass);
            
            // 배너 표시 확인
            console.log("[StudentClass] 배너 표시 조건:", {
              currentLiveClass: newLiveClass,
              active: newLiveClass.active,
              shouldShow: newLiveClass && newLiveClass.active
            });
          } else {
            console.log("[StudentClass] No active live class found");
            setCurrentLiveClass(null);
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

  // 주기적으로 라이브 상태 확인 (30초마다)
  useEffect(() => {
    if (!id || weeks.length === 0) return;

    const checkLiveStatus = async () => {
      try {
        const token = localStorage.getItem("lecq.token");
        if (!token) return;

        const liveChecks = await Promise.all(
          weeks.map(async (week) => {
            try {
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
              return { 
                week: week.week, 
                active: response.active === true,
                liveId: response.live_id || null,
                classId: response.class_id || week.week,
              };
            } catch (error) {
              return { week: week.week, active: false, liveId: null, classId: week.week };
            }
          })
        );

        const liveWeek = liveChecks.find((check) => check.active === true);
        if (liveWeek) {
          const liveWeekData = weeks.find((w) => w.week === liveWeek.week);
          setCurrentLiveClass({
            active: true,
            classId: liveWeek.classId || liveWeek.week,
            weekTitle: liveWeekData?.title || `${liveWeek.week}주차`,
          });
        } else {
          setCurrentLiveClass(null);
        }
      } catch (error) {
        console.error("라이브 상태 확인 오류:", error);
      }
    };

    // 즉시 한 번 확인
    checkLiveStatus();

    // 30초마다 확인
    const interval = setInterval(checkLiveStatus, 30000);

    return () => {
      clearInterval(interval);
    };
  }, [id, weeks]);

  // 선택된 클래스의 질문 조회
  useEffect(() => {
    let isMounted = true;
    const fetchLatestQuestions = async () => {
      if (!id || !selectedQuestionClassId) return;
      setIsLatestQuestionsLoading(true);
      setLatestQuestionsError(null);
      try {
        const response = await getMyQuestions(id, selectedQuestionClassId, 200);
        if (!isMounted) return;
        const sorted = [...(response.questions ?? [])].sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        setLatestQuestions(sorted.slice(0, 5));
      } catch (error) {
        if (!isMounted) return;
        const message =
          error instanceof Error ? error.message : "질문을 불러오지 못했어요.";
        setLatestQuestions([]);
        setLatestQuestionsError(message);
      } finally {
        if (isMounted) {
          setIsLatestQuestionsLoading(false);
        }
      }
    };

    fetchLatestQuestions();
    return () => {
      isMounted = false;
    };
  }, [id, selectedQuestionClassId]);

  // weeks가 변경되면 첫 번째 클래스를 기본 선택
  useEffect(() => {
    if (weeks.length > 0 && selectedQuestionClassId === null) {
      setSelectedQuestionClassId(Number(weeks[0].week));
    }
  }, [weeks, selectedQuestionClassId]);

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
      // 통일된 materials API 사용 (페이지별 교안 조회)
      const pagesResponse = await getMaterialPages(course.id, classId, "finalized");
      
      // 페이지별 교안이 있으면 사용, 없으면 원본 materials 확인
      let materialUrl: string | undefined;
      let materialName: string | undefined;
      let pages: WhiteboardPage[] | undefined;

      if (pagesResponse.pages && pagesResponse.pages.length > 0) {
        // 페이지별 교안이 있는 경우
        pages = pagesResponse.pages.map(page => ({
          page_number: page.page_number,
          image_path: page.image_path,
          pdf_path: page.pdf_path,
          text: page.text,
          status: page.status,
        }));
        
        // 첫 번째 페이지의 PDF 경로 사용 (페이지별 PDF가 있으면 사용)
        const { ensureHttps } = await import("../../api/auth/client");
        const firstPage = pagesResponse.pages[0];
        if (firstPage.pdf_path) {
          materialUrl = ensureHttps(
            firstPage.pdf_path.startsWith("http")
              ? firstPage.pdf_path
              : `${getBaseUrl()}${firstPage.pdf_path}`
          );
        } else if (firstPage.image_path) {
          // PDF가 없으면 이미지 경로 사용
          materialUrl = ensureHttps(
            firstPage.image_path.startsWith("http")
              ? firstPage.image_path
              : `${getBaseUrl()}${firstPage.image_path}`
          );
        }
        materialName = `교안 (${pagesResponse.total_pages}페이지)`;
      }
      
      // 페이지별 교안이 없고 원본 PDF가 있는 경우
      if (!materialUrl && pagesResponse.original_materials && pagesResponse.original_materials.length > 0) {
        const { ensureHttps } = await import("../../api/auth/client");
        const firstMaterial = pagesResponse.original_materials[0];
        materialUrl = ensureHttps(
          firstMaterial.url.startsWith("http")
            ? firstMaterial.url
            : `${getBaseUrl()}${firstMaterial.url}`
        );
        materialName = firstMaterial.originalName || "강의 자료";
      }

      if (!materialUrl) {
        setToast({ message: "교안이 없습니다.", type: "error" });
        return;
      }

      // 파일 크기 가져오기
      let fileSize = "파일";
      try {
        const headResponse = await fetch(materialUrl, { method: "HEAD" });
        const contentLength = headResponse.headers.get("content-length");
        if (contentLength) {
          fileSize = `[ ${formatFileSize(Number(contentLength))} ]`;
        }
      } catch {
        // 파일 크기 가져오기 실패 시 무시
      }

      setSelectedLesson({
        title: pagesResponse.class_title || defaultTitle,
        fileName: materialName || "강의 자료",
        fileSize,
        url: materialUrl,
        lectureId: course.id,
        classId: classId,
        pages: pages,
      });
      setIsLessonQuestionModalOpen(true);
    } catch (error) {
      console.error("교안 조회 실패:", error);
      const message =
        error instanceof Error
          ? error.message
          : "교안을 불러오는 중 오류가 발생했습니다.";
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
        const resp = await getClassMaterials(course.id, classId);

        // materials 배열에서 정보 추출
        const newItems = (resp.materials || [])
          .map((material) => {
            const url = resolveUrl(material.url);
            const name = material.originalName || (url ? url.split("/").pop() || "자료" : "자료");
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

  const formatQuestionTimestamp = (isoString?: string) => {
    if (!isoString) return "-";
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return "-";
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    const hh = String(date.getHours()).padStart(2, "0");
    const mm = String(date.getMinutes()).padStart(2, "0");
    return `${y}.${m}.${d} ${hh}:${mm}`;
  };

  return (
    <div className="flex-1 flex">
      {/* 사이드바 */}
      <CommonSidebar
        userType="student"
        userInfo={studentInfo}
        additionalContent={
          <div className="flex flex-col h-full border-t border-gray-200 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
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
                <div className="mt-6 space-y-5 text-gray-700 text-[12px] max-h-32 overflow-y-auto pr-1">
                  <p>
                    {course.description ||
                      "이미 12명 이상이 학습하고 만족한 최고의 프로그래밍 입문 강의. 프로그래밍을 전혀 접해보지 못한 사람부터 실제 활용 가능한 프로그래밍 능력까지 갈 수 있도록 도와주는 강의입니다."}
                  </p>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between gap-2 border-t border-gray-200 pt-2 mb-3">
                  <h4 className="text-md font-semibold text-gray-900 whitespace-nowrap flex-shrink-0">
                    최신 질문
                  </h4>
                  {weeks.length > 0 && (
                    <select
                      className="text-xs border border-gray-200 rounded-md px-2 py-1 text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white flex-shrink min-w-0 max-w-full"
                      value={selectedQuestionClassId ?? ""}
                      onChange={(e) => {
                        const value = Number(e.target.value);
                        setSelectedQuestionClassId(
                          Number.isNaN(value) ? null : value
                        );
                      }}
                    >
                      {weeks.map((week) => (
                        <option key={week.week} value={week.week}>
                          {week.title}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <div className="space-y-3 h-56 overflow-auto pr-1">
                  {isLatestQuestionsLoading ? (
                    <div className="text-sm text-gray-500 py-6 text-center">
                      질문을 불러오는 중입니다...
                    </div>
                  ) : latestQuestionsError ? (
                    <div className="text-sm text-red-500 py-6 text-center">
                      {latestQuestionsError}
                    </div>
                  ) : latestQuestions.length === 0 ? (
                    <div className="text-sm text-gray-500 py-6 text-center">
                      아직 질문이 없습니다.
                    </div>
                  ) : (
                    latestQuestions.map((item) => (
                      <div
                        key={item._id}
                        className="border border-gray-200 rounded-lg p-3 bg-white/60"
                      >
                        <div className="flex items-center justify-between gap-2 text-[11px] text-gray-500 mb-1">
                          <span className="truncate flex-shrink-0">
                            {item.author?.name || "익명"}
                          </span>
                          <span className="whitespace-nowrap flex-shrink-0">
                            {formatQuestionTimestamp(item.timestamp)}
                          </span>
                        </div>
                        <div className="text-sm font-medium text-gray-900 break-words">
                          Q. {item.text}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        }
      />

      {/* 메인 콘텐츠 */}
      <section className="flex-1 flex flex-col ml-80 overflow-y-auto bg-gradient-to-br from-gray-50 to-gray-100">
        {/* 헤더 */}
        <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold text-gray-900">
                {course.title || "강좌 정보를 불러오는 중..."}
              </h1>
            </div>
          </div>
        </div>

        {/* 콘텐츠 */}
        <div className="flex-1 p-6 overflow-y-auto flex-shrink">
          {/* 라이브 알림 및 입장하기 버튼 - 강의 목록 위에 표시 */}
          {currentLiveClass && currentLiveClass.active && (
            <div className="mb-6">
              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-md">
                <div className="flex items-center justify-between gap-6">
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                      현재{" "}
                      <span className="text-blue-600">
                        {currentLiveClass.weekTitle}
                      </span>
                      가 진행 중입니다.
                    </h2>
                    <p className="text-sm text-gray-500">
                      지금 입장하면 실시간 채팅과 질문 참여가 가능합니다. 늦지 않게
                      합류하세요!
                    </p>
                  </div>
                  <button
                    onClick={handleEnterLecture}
                    className="px-6 py-3 bg-gray-900 hover:bg-gray-800 text-white font-medium rounded-lg transition-colors flex items-center gap-2 flex-shrink-0"
                  >
                    <span className="text-lg">▶</span>
                    <span>강의 입장하기</span>
                  </button>
                </div>
              </div>
            </div>
          )}
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
                    className="bg-white border border-gray-200 rounded-xl shadow-md group"
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
                              className="flex items-center justify-between p-3 border border-gray-200 rounded hover:bg-gray-100"
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
          pdfUrl={selectedLesson.url}
          lectureId={selectedLesson.lectureId}
          classId={selectedLesson.classId}
          pages={selectedLesson.pages}
          questions={[]}
        />
      )}
    </div>
  );
};

export default StudentClass;
