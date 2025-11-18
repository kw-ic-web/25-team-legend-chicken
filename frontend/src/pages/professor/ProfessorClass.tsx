import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Play, Users, Download, ChevronDown, ChevronUp } from "lucide-react";
import CommonSidebar from "../../components/layout/CommonSidebar";
import BroadcastAgreementModal from "../../components/modal/startBroadcast/BroadcastAgreementModal";
import LectureReservationModal from "../../components/modal/reserveBroadcast/LectureReservationModal";
import LessonQuestionModal from "../../components/modal/lessonQuestion/LessonQuestionModal";
import LecturePersonnelModal from "../../components/modal/lecturePersonnel/LecturePersonnelModal";
import {
  getClassDetail,
  getClassPdfs,
  getClasses,
  getMembers,
  getLiveStatus,
  startLive,
  endLive,
  getClassQuestions,
  type LiveStatusClass,
  type GetClassDetailResponse,
  type ClassQuestion,
} from "../../api/professor";
import Toast from "../../components/common/Toast";
import { getBaseUrl } from "../../api/auth/client";

const ProfessorClass: React.FC = () => {
  const { id } = useParams();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isReservationModalOpen, setIsReservationModalOpen] = useState(false);
  const [isLessonQuestionModalOpen, setIsLessonQuestionModalOpen] =
    useState(false);
  const [selectedLesson, setSelectedLesson] = useState<{
    title: string;
    fileName: string;
    fileSize: string;
  } | null>(null);
  const [isLessonDetailLoading, setIsLessonDetailLoading] = useState(false);
  const [isPersonnelModalOpen, setIsPersonnelModalOpen] = useState(false);
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
      items: Array<{ name: string; size: string; url?: string }>;
    }>
  >([]);
  const [students, setStudents] = useState<
    Array<{ id: number | string; name: string; email: string }>
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPdfLoadingFor, setIsPdfLoadingFor] = useState<number | null>(null);
  const [loadedClassIds, setLoadedClassIds] = useState<number[]>([]);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const [liveStatuses, setLiveStatuses] = useState<
    Record<number, LiveStatusClass>
  >({});
  const [liveActionLoading, setLiveActionLoading] = useState<number | null>(
    null
  );
  const [targetClass, setTargetClass] = useState<{
    id: number;
    title: string;
  } | null>(null);
  const [selectedQuestionClassId, setSelectedQuestionClassId] = useState<
    number | null
  >(null);
  const [latestQuestions, setLatestQuestions] = useState<ClassQuestion[]>([]);
  const [isLatestQuestionsLoading, setIsLatestQuestionsLoading] =
    useState(false);
  const [latestQuestionsError, setLatestQuestionsError] = useState<
    string | null
  >(null);
  const navigate = useNavigate();
  const lectureIdForAnalysis = course.id || id || "";
  const firstClassIdForAnalysis =
    weeks.length > 0 ? Number(weeks[0].week) : null;
  const analysisLink = lectureIdForAnalysis
    ? firstClassIdForAnalysis
      ? `/professor/analysis/${lectureIdForAnalysis}?classId=${firstClassIdForAnalysis}`
      : `/professor/analysis/${lectureIdForAnalysis}`
    : "#";

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
        // 클래스 목록과 멤버 정보를 병렬로 조회
        const [classesResponse, membersResponse] = await Promise.all([
          getClasses(id),
          getMembers(id).catch(() => null), // 실패해도 계속 진행
        ]);

        // 강좌 정보 업데이트
        setCourse({
          id: classesResponse.lecture_id,
          title: classesResponse.lecture_name,
          instructor: "", // API 응답에 교수자명이 없으므로 나중에 별도 API로 가져와야 함
          description: "",
          participants: membersResponse?.student_count || 0,
        });

        // 학생 목록 업데이트
        if (membersResponse) {
          setStudents(
            membersResponse.students.map((student) => ({
              id: student.id,
              name: student.name,
              email: student.email,
            }))
          );
        }

        // 클래스를 weeks 형식으로 변환
        const transformedWeeks =
          classesResponse.classes && classesResponse.classes.length > 0
            ? classesResponse.classes.map((cls, index) => {
                const classId = Number(
                  cls.id !== undefined && cls.id !== null ? cls.id : index + 1
                );
                // materials URL에서 파일명 추출
                const items = cls.materials
                  ? cls.materials.map((materialUrl) => {
                      const resolvedUrl = resolveUrl(materialUrl);
                      const urlParts = resolvedUrl.split("/");
                      const fileName = urlParts[urlParts.length - 1] || "파일";
                      // 파일 크기는 API에 없으므로 기본값 사용
                      return {
                        name: fileName,
                        size: "파일",
                        url: resolvedUrl,
                      };
                    })
                  : [];

                return {
                  week: classId,
                  title: cls.title || `${index + 1}주차`,
                  items: items.length > 0 ? items : [],
                };
              })
            : [];

        setWeeks(transformedWeeks);
        setLoadedClassIds([]);
        setIsPdfLoadingFor(null);
      } catch (error) {
        console.error("데이터 조회 오류:", error);
        const errorMessage =
          error instanceof Error
            ? error.message
            : "데이터를 불러오는 중 오류가 발생했습니다.";
        setToast({ message: errorMessage, type: "error" });
        setWeeks([]);
        setLoadedClassIds([]);
        setIsPdfLoadingFor(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [id, resolveUrl]);

  useEffect(() => {
    if (weeks.length > 0 && selectedQuestionClassId === null) {
      setSelectedQuestionClassId(Number(weeks[0].week));
    }
  }, [weeks, selectedQuestionClassId]);

  useEffect(() => {
    let isMounted = true;
    const fetchLatestQuestions = async () => {
      if (!course.id || !selectedQuestionClassId) return;
      setIsLatestQuestionsLoading(true);
      setLatestQuestionsError(null);
      try {
        const response = await getClassQuestions(
          course.id,
          selectedQuestionClassId,
          { limit: 200 }
        );
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
  }, [course.id, selectedQuestionClassId]);

  const handleStartBroadcast = () => {
    if (weeks.length === 0) {
      setToast({
        message: "시작할 클래스를 찾을 수 없습니다.",
        type: "error",
      });
      return;
    }
    const firstWeek = weeks[0];
    setTargetClass({ id: Number(firstWeek.week), title: firstWeek.title });
    setIsModalOpen(true);
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setTargetClass(null);
  };

  const handleReservationModalOpen = () => {
    setIsReservationModalOpen(true);
  };

  const handleReservationModalClose = () => {
    setIsReservationModalOpen(false);
  };

  const handleReservation = (reservationData: {
    title: string;
    date: string;
    time: string;
    participants: string;
  }) => {
    // 실제 예약 로직 (여기에 예약 API 호출 등)
    console.log("강의 예약됨:", reservationData);
    alert(
      `강의가 예약되었습니다!\n제목: ${reservationData.title}\n날짜: ${reservationData.date}\n시간: ${reservationData.time}\n참여 대상: ${reservationData.participants}`
    );
  };

  const handleLessonQuestionModalOpen = async (
    classId: number,
    defaultTitle: string,
    material?: { name: string; size: string }
  ) => {
    if (!course.id) return;
    setIsLessonDetailLoading(true);
    try {
      const detail: GetClassDetailResponse = await getClassDetail(
        course.id,
        classId
      );
      const materials = detail.class?.materials ?? [];
      const firstMaterialName =
        material?.name ||
        (materials.length > 0
          ? materials[0].split("/").pop() || "자료"
          : "자료");
      const firstMaterialSize = material?.size || "파일";

      setSelectedLesson({
        title: detail.class?.title || defaultTitle,
        fileName: firstMaterialName,
        fileSize: firstMaterialSize,
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
      setIsLessonDetailLoading(false);
    }
  };

  const fetchClassPdfs = useCallback(
    async (classId: number, defaultTitle: string) => {
      if (!course.id) return;
      setIsPdfLoadingFor(classId);
      try {
        const resp = await getClassPdfs(course.id, classId);
        const newItems = (resp.pdfs || []).map((pdfUrl) => {
          const url = resolveUrl(pdfUrl);
          const name = url.split("/").pop() || "자료";
          return { name, size: "파일", url };
        });
        setWeeks((prev) =>
          prev.map((w) =>
            Number(w.week) === Number(classId)
              ? {
                  ...w,
                  title: resp.class_title || defaultTitle || w.title,
                  items: newItems,
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

  const handleLessonQuestionModalClose = () => {
    setIsLessonQuestionModalOpen(false);
    setSelectedLesson(null);
  };

  const loadLiveStatuses = useCallback(async () => {
    if (!id) return;
    try {
      const response = await getLiveStatus(id);
      const map: Record<number, LiveStatusClass> = {};
      response.classes?.forEach((cls) => {
        map[cls.class_id] = cls;
      });
      setLiveStatuses(map);
    } catch (error) {
      console.error("라이브 상태 조회 실패:", error);
    }
  }, [id]);

  useEffect(() => {
    loadLiveStatuses();
  }, [loadLiveStatuses]);

  const handleStartLiveFlow = (
    classId: number,
    classTitle: string,
    e?: React.MouseEvent<HTMLButtonElement>
  ) => {
    e?.preventDefault();
    e?.stopPropagation();
    setTargetClass({ id: classId, title: classTitle });
    setIsModalOpen(true);
  };

  const handleEndLive = async (
    classId: number,
    e?: React.MouseEvent<HTMLButtonElement>
  ) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (!id) return;
    setLiveActionLoading(classId);
    try {
      const response = await endLive(id, classId);
      setToast({
        message: response.message || "라이브가 종료되었습니다.",
        type: "success",
      });
      await loadLiveStatuses();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "라이브 종료 중 오류가 발생했습니다.";
      setToast({ message, type: "error" });
    } finally {
      setLiveActionLoading(null);
    }
  };

  const handleAddAnswer = (questionId: number, answer: string) => {
    // 실제 답변 추가 로직 (여기에 API 호출 등)
    console.log("답변 추가됨:", { questionId, answer });
  };

  const handlePersonnelModalOpen = () => {
    setIsPersonnelModalOpen(true);
  };

  const handlePersonnelModalClose = () => {
    setIsPersonnelModalOpen(false);
  };

  const handleInviteByLink = () => {
    // 실제 링크 초대 로직 (여기에 API 호출 등)
    console.log("링크 초대됨");
  };

  const handleInviteById = (studentEmail: string) => {
    // API 호출은 IdInviteModal에서 처리됨
    console.log("이메일 초대됨:", studentEmail);
  };

  const handleLiveFlowComplete = async (
    cameraRequired: boolean,
    files: File[]
  ) => {
    if (!id || !targetClass) return;
    setIsModalOpen(false);
    setLiveActionLoading(targetClass.id);
    try {
      const response = await startLive(id, targetClass.id);
      setToast({
        message:
          response.message || `${targetClass.title} 라이브가 시작되었습니다.`,
        type: "success",
      });
      await loadLiveStatuses();
      const realtimePath = `/professor/realtime-dashboard/${id}/${targetClass.id}/${response.live_id}`;
      navigate(realtimePath, {
        state: {
          lectureId: id,
          classId: targetClass.id,
          classTitle: targetClass.title,
          liveId: response.live_id,
          cameraRequired,
          materials: files.map((file) => ({
            name: file.name,
            size: file.size,
          })),
        },
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "라이브 시작 중 오류가 발생했습니다.";
      setToast({ message, type: "error" });
    } finally {
      setLiveActionLoading(null);
      setTargetClass(null);
    }
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
      {/* 사이드바: 공용 컴포넌트 사용 */}
      <CommonSidebar
        userType="professor"
        userInfo={{
          name: "김철수",
          title: "강의자",
          affiliation: "광운대학교 정보융합학부",
          currentLectures: 13,
        }}
        showBroadcastControls={false}
        additionalContent={
          <div className="p-6 border-t border-gray-200 space-y-6">
            <div>
              <h4 className="text-xl font-extrabold text-gray-900 leading-snug">
                {course.title}
              </h4>
              <div className="mt-2 flex items-center space-x-4 text-gray-800">
                <span className="text-base font-medium">
                  {course.instructor}
                </span>
                <span className="inline-flex items-center space-x-1 text-base">
                  <Users className="w-4 h-4 text-gray-500" />
                  <span>{course.participants}</span>
                </span>
              </div>
              <div className="mt-6 space-y-5 text-gray-700 text-[12px]">
                <p>
                  이미 12명 이상이 학습하고 만족한 최고의 프로그래밍 입문 강의.
                  프로그래밍을 전혀 접해보지 못한 사람부터 실제 활용 가능한
                  프로그래밍 능력까지 갈 수 있도록 도와주는 강의입니다.
                </p>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between border-t border-gray-200 pt-2">
                <h4 className="text-md font-semibold text-gray-900 mb-3">
                  최신 질문
                </h4>
                {weeks.length > 0 && (
                  <select
                    className="text-xs border border-gray-200 rounded-md px-2 py-1 text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
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
                      <div className="flex items-center justify-between text-[11px] text-gray-500 mb-1">
                        <span>{item.author?.name || "익명"}</span>
                        <span>{formatQuestionTimestamp(item.timestamp)}</span>
                      </div>
                      <div className="text-sm font-medium text-gray-900">
                        Q. {item.text}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="pt-2">
              <button
                onClick={handleStartBroadcast}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
              >
                <Play className="w-5 h-5" />
                <span>실시간 방송 시작하기</span>
              </button>
            </div>
          </div>
        }
      />

      {/* 메인 컨텐츠 */}
      <section className="flex-1 p-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-extrabold text-gray-900">
            {course.title || "강좌 정보를 불러오는 중..."}
          </h1>
          <div className="flex items-center space-x-3">
            <Link
              to={analysisLink}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold shadow-sm transition-all duration-200 ${
                lectureIdForAnalysis
                  ? "bg-gradient-to-r from-[#07CDAC] via-[#1089E3] to-[#3A6EFF] text-white hover:shadow-lg hover:-translate-y-0.5"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
              }`}
            >
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M9 9v6l5-3-5-3z" />
                <path d="M21 15V9a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 9v6a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 15Z" />
              </svg>
              <span>분석 리포트</span>
            </Link>
            <button
              onClick={handleReservationModalOpen}
              className="px-4 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200 transition-colors duration-200"
            >
              강좌 예약
            </button>
            <button
              onClick={handlePersonnelModalOpen}
              className="px-4 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200 transition-colors duration-200"
            >
              강좌 인원 관리
            </button>
          </div>
        </div>

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
          <div className="space-y-3">
            {weeks.map((w) => {
              const classId = Number(w.week);
              const liveInfo = liveStatuses[classId];
              const isLiveActive = liveInfo?.isLiveActive ?? false;
              return (
                <details
                  key={w.week}
                  className="bg-white border border-gray-200 rounded-lg group"
                  onToggle={(event) =>
                    handleToggleWeek(classId, w.title, event.currentTarget.open)
                  }
                >
                  <summary className="list-none cursor-pointer select-none px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 flex items-center justify-center">
                        <ChevronDown className="w-4 h-4 text-gray-500 group-open:hidden" />
                        <ChevronUp className="w-4 h-4 text-gray-500 hidden group-open:block" />
                      </div>
                      <div className="font-semibold">{w.title}</div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2">
                        <button
                          className="flex items-center space-x-1 px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md text-sm transition-colors duration-200"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            w.items.forEach((it) => {
                              if (it.url) {
                                window.open(resolveUrl(it.url), "_blank");
                              }
                            });
                          }}
                        >
                          <Download className="w-4 h-4" />
                          <span>전체 다운로드</span>
                        </button>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          className={`px-3 py-1 rounded text-sm transition-colors duration-200 ${
                            isLiveActive
                              ? "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100"
                              : "bg-green-50 text-green-700 border border-green-200 hover:bg-green-100"
                          } ${liveActionLoading === classId ? "opacity-60 cursor-not-allowed" : ""}`}
                          onClick={(e) =>
                            isLiveActive
                              ? handleEndLive(classId, e)
                              : handleStartLiveFlow(classId, w.title, e)
                          }
                          disabled={liveActionLoading === classId}
                        >
                          {liveActionLoading === classId
                            ? "처리 중..."
                            : isLiveActive
                              ? "라이브 종료"
                              : "라이브 시작"}
                        </button>
                      </div>
                    </div>
                  </summary>
                  <div className="divide-y">
                    {isPdfLoadingFor === classId ? (
                      <div className="px-4 py-3 text-sm text-gray-500">
                        PDF 목록을 불러오는 중...
                      </div>
                    ) : w.items.length > 0 ? (
                      w.items.map((it, idx) => (
                        <div
                          key={idx}
                          className="px-4 py-3 flex items-center justify-between"
                        >
                          <div className="text-sm text-gray-800 truncate pr-4">
                            {idx + 1}. {it.name} [ {it.size} ]
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() =>
                                handleLessonQuestionModalOpen(
                                  classId,
                                  w.title,
                                  it
                                )
                              }
                              disabled={isLessonDetailLoading}
                              className="px-3 py-1 bg-gray-100 rounded text-sm hover:bg-gray-200 transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                              {isLessonDetailLoading
                                ? "불러오는 중..."
                                : "교안 및 질문 보기"}
                            </button>
                            <button
                              className="px-3 py-1 bg-gray-100 rounded text-sm hover:bg-gray-200 transition-colors duration-200"
                              onClick={() => {
                                if (it.url) {
                                  window.open(resolveUrl(it.url), "_blank");
                                }
                              }}
                            >
                              다운로드
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="px-4 py-3 text-sm text-gray-500">
                        등록된 PDF가 없습니다.
                      </div>
                    )}
                  </div>
                </details>
              );
            })}
          </div>
        )}
      </section>

      {/* 실시간 방송 시작 모달 */}
      <BroadcastAgreementModal
        isOpen={isModalOpen}
        onClose={handleClose}
        onAgree={handleLiveFlowComplete}
      />

      {/* 강의 예약 모달 */}
      <LectureReservationModal
        isOpen={isReservationModalOpen}
        onClose={handleReservationModalClose}
        onReserve={handleReservation}
      />

      {/* 교안 및 질문보기 모달 */}
      {selectedLesson && (
        <LessonQuestionModal
          isOpen={isLessonQuestionModalOpen}
          onClose={handleLessonQuestionModalClose}
          lessonTitle={selectedLesson.title}
          fileName={selectedLesson.fileName}
          fileSize={selectedLesson.fileSize}
          questions={[
            {
              id: 1,
              question: "과목에 대한 질문을 해도 되나요?",
              answer: "네, 얼마든지요...",
              isOpen: true,
            },
            {
              id: 2,
              question: "실습 환경은 어떻게 구성하나요?",
              answer: "Colab을 권장합니다.",
              isOpen: false,
            },
            {
              id: 3,
              question: "과제 제출 형식이 궁금해요",
              answer: "PDF 혹은 노트북 파일",
              isOpen: false,
            },
            {
              id: 4,
              question: "파이썬 설치 방법을 알려주세요",
              answer: "공식 홈페이지에서 다운로드하세요",
              isOpen: false,
            },
            {
              id: 5,
              question: "코딩 테스트는 언제 하나요?",
              answer: "매주 금요일에 진행됩니다",
              isOpen: false,
            },
            {
              id: 6,
              question: "교재는 어디서 구할 수 있나요?",
              answer: "온라인 서점에서 구매 가능합니다",
              isOpen: false,
            },
            {
              id: 7,
              question: "프로젝트 제출 기한이 언제인가요?",
              answer: "12월 말까지 제출해주세요",
              isOpen: false,
            },
            {
              id: 8,
              question: "오프라인 수업은 있나요?",
              answer: "온라인으로만 진행됩니다",
              isOpen: false,
            },
          ]}
          onAddAnswer={handleAddAnswer}
        />
      )}

      {/* 강좌 인원관리 모달 */}
      <LecturePersonnelModal
        isOpen={isPersonnelModalOpen}
        onClose={handlePersonnelModalClose}
        lectureId={id || ""}
        students={students}
        onInviteByLink={handleInviteByLink}
        onInviteById={handleInviteById}
      />

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

export default ProfessorClass;
