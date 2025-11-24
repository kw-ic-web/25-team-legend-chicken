import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Play,
  Users,
  Download,
  ChevronDown,
  ChevronUp,
  PenSquare,
  Trash2,
  Plus,
  Upload,
  X,
} from "lucide-react";
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
  getMyInfo,
  getLectures,
  addLectureClass,
  updateLectureClasses,
  deleteLectureClass,
  uploadClassPdf,
  getWhiteboardPages,
  type WhiteboardPage,
} from "../../api/professor";
import type {
  LectureClass,
  LiveStatusClass,
  GetClassDetailResponse,
  ClassQuestion,
  MyInfoUser,
} from "../../api/professor";
import Toast from "../../components/common/Toast";
import { getBaseUrl } from "../../api/auth/client";
import Modal from "../../components/common/Modal";

type MaterialEntry = string | { url?: string; originalName?: string };

const normalizeMaterialEntry = (
  entry: MaterialEntry | undefined | null
): { url: string; originalName?: string } => {
  if (!entry) {
    return { url: "", originalName: undefined };
  }
  if (typeof entry === "string") {
    return { url: entry, originalName: undefined };
  }
  return {
    url: entry.url ?? "",
    originalName: entry.originalName,
  };
};

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
    url?: string;
    lectureId?: string;
    classId?: number;
    pages?: WhiteboardPage[];
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
  const [myInfo, setMyInfo] = useState<MyInfoUser | null>(null);
  const [lectureCount, setLectureCount] = useState(0);
  const [classList, setClassList] = useState<LectureClass[]>([]);
  const [isAddClassModalOpen, setIsAddClassModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<LectureClass | null>(null);
  const [deletingClass, setDeletingClass] = useState<LectureClass | null>(null);
  const [classForm, setClassForm] = useState({
    title: "",
    description: "",
    date: "",
    materialsInput: "",
  });
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState<Set<string>>(new Set());
  const [uploadProgress, setUploadProgress] = useState<Map<string, number>>(
    new Map()
  );
  const [isDragOver, setIsDragOver] = useState(false);
  const [isClassSubmitting, setIsClassSubmitting] = useState(false);
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

  const fetchClassesData = useCallback(async () => {
    if (!id) return;

    setIsLoading(true);
    try {
      const [classesResponse, membersResponse] = await Promise.all([
        getClasses(id),
        getMembers(id).catch(() => null),
      ]);

      setCourse({
        id: classesResponse.lecture_id,
        title: classesResponse.lecture_name,
        instructor: "",
        description: "",
        participants: membersResponse?.student_count || 0,
      });

      const normalizedClasses =
        classesResponse.classes?.map((cls, index) => ({
          ...cls,
          id:
            cls.id !== undefined && cls.id !== null
              ? Number(cls.id)
              : index + 1,
        })) ?? [];
      setClassList(normalizedClasses);

      if (membersResponse) {
        setStudents(
          membersResponse.students.map((student) => ({
            id: student.id,
            name: student.name,
            email: student.email,
          }))
        );
      }

      const transformedWeeks =
        normalizedClasses.length > 0
          ? normalizedClasses.map((cls, idx) => {
              const classId = Number(cls.id);
              const items =
                (cls.materials as MaterialEntry[] | undefined)
                  ?.map((material) => {
                    const normalized = normalizeMaterialEntry(material);
                    if (!normalized.url) return null;
                    const resolvedUrl = resolveUrl(normalized.url);
                    const urlParts = resolvedUrl.split("/");
                    const fileName =
                      normalized.originalName ||
                      urlParts[urlParts.length - 1] ||
                      "파일";
                    return {
                      name: fileName,
                      size: "파일",
                      url: resolvedUrl,
                    };
                  })
                  .filter(
                    (
                      item
                    ): item is { name: string; size: string; url: string } =>
                      item !== null
                  ) || [];

              return {
                week: classId,
                title: cls.title || `${idx + 1}주차`,
                items: items.length > 0 ? items : [],
              };
            })
          : [];

      setWeeks(transformedWeeks);
      setLoadedClassIds([]);
      setIsPdfLoadingFor(null);

      // 모든 클래스의 PDF 목록 자동 로드
      if (normalizedClasses.length > 0 && classesResponse.lecture_id) {
        normalizedClasses.forEach((cls) => {
          const classId = Number(cls.id);
          const classTitle =
            cls.title || `${normalizedClasses.indexOf(cls) + 1}주차`;

          // PDF 목록 로드 (비동기로 실행)
          (async () => {
            try {
              setIsPdfLoadingFor(classId);
              const resp = await getClassPdfs(
                classesResponse.lecture_id,
                classId
              );
              const newItems =
                (resp.pdfs as MaterialEntry[] | undefined)
                  ?.map((pdfItem) => {
                    const normalized = normalizeMaterialEntry(pdfItem);
                    if (!normalized.url) return null;
                    const url = resolveUrl(normalized.url);
                    const name =
                      normalized.originalName || url.split("/").pop() || "자료";
                    return { name, size: "파일", url };
                  })
                  .filter(
                    (
                      item
                    ): item is { name: string; size: string; url: string } =>
                      item !== null
                  ) || [];

              setWeeks((prev) =>
                prev.map((w) =>
                  Number(w.week) === Number(classId)
                    ? {
                        ...w,
                        title: resp.class_title || classTitle || w.title,
                        items: newItems,
                      }
                    : w
                )
              );
              setLoadedClassIds((prev) =>
                prev.includes(classId) ? prev : [...prev, classId]
              );
            } catch (error) {
              // 404 에러는 PDF가 없는 경우이므로 조용히 처리
              const errorMessage =
                error instanceof Error ? error.message : String(error);
              if (
                errorMessage.includes("404") ||
                errorMessage.includes("찾을 수 없습니다")
              ) {
                // PDF가 없는 경우 빈 배열로 설정
                setWeeks((prev) =>
                  prev.map((w) =>
                    Number(w.week) === Number(classId)
                      ? {
                          ...w,
                          items: [],
                        }
                      : w
                  )
                );
                setLoadedClassIds((prev) =>
                  prev.includes(classId) ? prev : [...prev, classId]
                );
              } else {
                console.error(`클래스 ${classId} PDF 로드 실패:`, error);
              }
            } finally {
              setIsPdfLoadingFor((current) =>
                current === classId ? null : current
              );
            }
          })();
        });
      }
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
  }, [id, resolveUrl]);

  useEffect(() => {
    fetchClassesData();
  }, [fetchClassesData]);

  // editingClass가 변경될 때 classForm 업데이트
  useEffect(() => {
    if (editingClass) {
      // 날짜 형식 변환 (datetime-local input 형식: YYYY-MM-DDTHH:mm)
      let dateValue = "";
      if (editingClass.date) {
        try {
          const date = new Date(editingClass.date);
          if (!Number.isNaN(date.getTime())) {
            // 로컬 시간대로 변환하여 datetime-local 형식에 맞춤
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, "0");
            const day = String(date.getDate()).padStart(2, "0");
            const hours = String(date.getHours()).padStart(2, "0");
            const minutes = String(date.getMinutes()).padStart(2, "0");
            dateValue = `${year}-${month}-${day}T${hours}:${minutes}`;
          }
        } catch (error) {
          console.error("날짜 변환 오류:", error);
        }
      }

      setClassForm({
        title: editingClass.title ?? "",
        description: editingClass.description ?? "",
        date: dateValue,
        materialsInput: "",
      });
      setSelectedFiles([]);
      setUploadingFiles(new Set());
      setUploadProgress(new Map());
      setIsDragOver(false);
    }
  }, [editingClass]);

  const resetClassForm = () => {
    setClassForm({
      title: "",
      description: "",
      date: "",
      materialsInput: "",
    });
    setSelectedFiles([]);
    setUploadingFiles(new Set());
    setUploadProgress(new Map());
    setIsDragOver(false);
  };

  const openAddClassModal = () => {
    resetClassForm();
    setIsAddClassModalOpen(true);
  };

  const closeClassModals = () => {
    setIsAddClassModalOpen(false);
    setEditingClass(null);
    setDeletingClass(null);
    setIsClassSubmitting(false);
    resetClassForm();
  };

  const openEditClassModal = (cls: LectureClass) => {
    setEditingClass(cls);
    setClassForm({
      title: cls.title ?? "",
      description: cls.description ?? "",
      date: cls.date ? new Date(cls.date).toISOString().slice(0, 16) : "",
      materialsInput: "",
    });
    setSelectedFiles([]);
    setUploadingFiles(new Set());
  };

  const openDeleteClassModal = (cls: LectureClass) => {
    setDeletingClass(cls);
  };

  const toISOString = (value: string) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toISOString();
  };

  const handleSubmitAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    const lectureId = course.id || id;
    if (!lectureId) return;
    setIsClassSubmitting(true);
    try {
      // 먼저 클래스를 추가 (materials는 빈 배열로)
      const addResponse = await addLectureClass(lectureId, {
        title: classForm.title,
        description: classForm.description,
        date: toISOString(classForm.date),
        materials: [],
      });

      const newClassId = addResponse.class.id;

      // 선택된 파일들을 업로드
      const uploadedMaterialUrls: string[] = [];
      if (selectedFiles.length > 0) {
        for (const file of selectedFiles) {
          const fileKey = `${file.name}-${file.size}`;
          setUploadingFiles((prev) => new Set(prev).add(fileKey));
          setUploadProgress((prev) => new Map(prev).set(fileKey, 0));
          try {
            const result = await uploadClassPdf(
              lectureId,
              newClassId,
              file,
              (progress) => {
                setUploadProgress((prev) =>
                  new Map(prev).set(fileKey, progress)
                );
              }
            );
            // whiteboard/upload-pdf API는 original_pdf_url을 반환
            if (result.original_pdf_url) {
              const pdfUrl = result.original_pdf_url.startsWith("http")
                ? result.original_pdf_url.replace(/^https?:\/\/[^/]+/, "")
                : result.original_pdf_url;
              uploadedMaterialUrls.push(pdfUrl);
            } else if (result.pdf_url) {
              const pdfUrl = result.pdf_url.startsWith("http")
                ? result.pdf_url.replace(/^https?:\/\/[^/]+/, "")
                : result.pdf_url;
              uploadedMaterialUrls.push(pdfUrl);
            }
            setUploadingFiles((prev) => {
              const next = new Set(prev);
              next.delete(fileKey);
              return next;
            });
            setUploadProgress((prev) => {
              const next = new Map(prev);
              next.delete(fileKey);
              return next;
            });
          } catch (error) {
            setUploadingFiles((prev) => {
              const next = new Set(prev);
              next.delete(fileKey);
              return next;
            });
            setUploadProgress((prev) => {
              const next = new Map(prev);
              next.delete(fileKey);
              return next;
            });
            throw error;
          }
        }
      }

      // 업로드된 파일이 있으면 클래스 materials 업데이트
      if (uploadedMaterialUrls.length > 0) {
        // 최신 클래스 목록을 가져옴
        await fetchClassesData();

        // 업데이트된 classList를 사용하여 materials 업데이트
        const updatedClasses = classList.map((cls) => {
          if (Number(cls.id) === Number(newClassId)) {
            return {
              ...cls,
              materials: uploadedMaterialUrls,
            };
          }
          return cls;
        });

        // 새로 추가된 클래스가 classList에 없을 수 있으므로 확인
        const newClassInList = updatedClasses.find(
          (c) => Number(c.id) === Number(newClassId)
        );
        if (!newClassInList) {
          updatedClasses.push({
            ...addResponse.class,
            materials: uploadedMaterialUrls,
          });
        }

        await updateLectureClasses(lectureId, {
          classes: updatedClasses,
        });
      }

      setToast({ message: "클래스가 추가되었습니다.", type: "success" });
      await fetchClassesData();
      closeClassModals();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "클래스를 추가하는 중 오류가 발생했습니다.";
      setToast({ message, type: "error" });
    } finally {
      setIsClassSubmitting(false);
    }
  };

  const handleSubmitEditClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClass) return;
    const lectureId = course.id || id;
    if (!lectureId) return;
    setIsClassSubmitting(true);
    try {
      // 먼저 선택된 파일들을 업로드
      const uploadedMaterialUrls: string[] = [];
      if (selectedFiles.length > 0) {
        for (const file of selectedFiles) {
          const fileKey = `${file.name}-${file.size}`;
          setUploadingFiles((prev) => new Set(prev).add(fileKey));
          setUploadProgress((prev) => new Map(prev).set(fileKey, 0));
          try {
            const result = await uploadClassPdf(
              lectureId,
              Number(editingClass.id),
              file,
              (progress) => {
                setUploadProgress((prev) =>
                  new Map(prev).set(fileKey, progress)
                );
              }
            );
            // whiteboard/upload-pdf API는 original_pdf_url을 반환
            if (result.original_pdf_url) {
              const pdfUrl = result.original_pdf_url.startsWith("http")
                ? result.original_pdf_url.replace(/^https?:\/\/[^/]+/, "")
                : result.original_pdf_url;
              uploadedMaterialUrls.push(pdfUrl);
            } else if (result.pdf_url) {
              const pdfUrl = result.pdf_url.startsWith("http")
                ? result.pdf_url.replace(/^https?:\/\/[^/]+/, "")
                : result.pdf_url;
              uploadedMaterialUrls.push(pdfUrl);
            }
            setUploadingFiles((prev) => {
              const next = new Set(prev);
              next.delete(fileKey);
              return next;
            });
            setUploadProgress((prev) => {
              const next = new Map(prev);
              next.delete(fileKey);
              return next;
            });
          } catch (error) {
            setUploadingFiles((prev) => {
              const next = new Set(prev);
              next.delete(fileKey);
              return next;
            });
            setUploadProgress((prev) => {
              const next = new Map(prev);
              next.delete(fileKey);
              return next;
            });
            throw error;
          }
        }
      }

      // 기존 materials와 새로 업로드한 materials 합치기
      const existingMaterials = editingClass.materials || [];
      const allMaterials = [...existingMaterials, ...uploadedMaterialUrls];

      // 전체 클래스 목록을 가져와서 수정할 클래스만 업데이트
      const updatedClasses = classList.map((cls) => {
        if (Number(cls.id) === Number(editingClass.id)) {
          return {
            ...cls,
            title: classForm.title,
            description: classForm.description,
            date: toISOString(classForm.date),
            materials: allMaterials,
          };
        }
        return cls;
      });

      // 클래스 정보 업데이트
      await updateLectureClasses(lectureId, {
        classes: updatedClasses,
      });
      setToast({ message: "클래스가 수정되었습니다.", type: "success" });
      await fetchClassesData();
      closeClassModals();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "클래스를 수정하는 중 오류가 발생했습니다.";
      setToast({ message, type: "error" });
    } finally {
      setIsClassSubmitting(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const pdfFiles = files.filter((file) => file.type === "application/pdf");
    if (pdfFiles.length !== files.length) {
      setToast({
        message: "PDF 파일만 업로드할 수 있습니다.",
        type: "error",
      });
    }
    setSelectedFiles((prev) => [...prev, ...pdfFiles]);
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    const file = selectedFiles[index];
    if (file) {
      const fileKey = `${file.name}-${file.size}`;
      setUploadProgress((prev) => {
        const next = new Map(prev);
        next.delete(fileKey);
        return next;
      });
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    const pdfFiles = files.filter((file) => file.type === "application/pdf");
    if (pdfFiles.length !== files.length) {
      setToast({
        message: "PDF 파일만 업로드할 수 있습니다.",
        type: "error",
      });
    }
    setSelectedFiles((prev) => [...prev, ...pdfFiles]);
  };

  const handleConfirmDeleteClass = async () => {
    if (!deletingClass) return;
    const lectureId = course.id || id;
    if (!lectureId) return;
    setIsClassSubmitting(true);
    try {
      await deleteLectureClass(lectureId, deletingClass.id);
      setToast({ message: "클래스가 삭제되었습니다.", type: "success" });
      await fetchClassesData();
      closeClassModals();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "클래스를 삭제하는 중 오류가 발생했습니다.";
      setToast({ message, type: "error" });
    } finally {
      setIsClassSubmitting(false);
    }
  };

  useEffect(() => {
    const fetchMyInfo = async () => {
      try {
        const response = await getMyInfo();
        setMyInfo(response.user);
      } catch (error) {
        console.error("내 정보 조회 실패:", error);
      }
    };
    fetchMyInfo();
  }, []);

  useEffect(() => {
    const fetchLectureCount = async () => {
      try {
        const response = await getLectures();
        setLectureCount(response.lectures?.length ?? 0);
      } catch (error) {
        console.error("강좌 목록 조회 실패:", error);
        setLectureCount(0);
      }
    };
    fetchLectureCount();
  }, []);

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
    material?: { name: string; size: string; url?: string }
  ) => {
    if (!course.id) return;
    setIsLessonDetailLoading(true);
    try {
      const detail: GetClassDetailResponse = await getClassDetail(
        course.id,
        classId
      );
      const materials = detail.class?.materials as MaterialEntry[] | undefined;

      // materials에서 첫 번째 자료 찾기
      const firstMaterial = materials?.[0]
        ? normalizeMaterialEntry(materials[0])
        : null;

      // material prop이 있으면 우선 사용
      const materialUrl = material?.url || firstMaterial?.url;
      const firstMaterialName =
        material?.name ||
        firstMaterial?.originalName ||
        (firstMaterial?.url ? firstMaterial.url.split("/").pop() : undefined) ||
        "자료";
      const firstMaterialSize = material?.size || "파일";

      // whiteboard pages 가져오기 시도
      let pages: WhiteboardPage[] | undefined;
      try {
        console.log("[DEBUG] Whiteboard pages 요청 시작:", {
          lectureId: course.id,
          classId: classId,
        });
        const pagesResponse = await getWhiteboardPages(
          course.id,
          classId,
          "finalized"
        );
        console.log("[DEBUG] Whiteboard pages 응답:", {
          count: pagesResponse.count,
          pagesLength: pagesResponse.pages?.length,
          pages: pagesResponse.pages,
        });
        pages = pagesResponse.pages || [];
        console.log("[DEBUG] 처리된 pages:", pages);
      } catch (error) {
        // whiteboard pages가 없으면 무시 (fallback으로 전체 PDF 사용)
        console.error("[DEBUG] Whiteboard pages 조회 실패:", error);
        console.log(
          "[DEBUG] Whiteboard pages를 찾을 수 없습니다. 전체 PDF를 사용합니다."
        );
        pages = undefined;
      }

      const lessonData = {
        title: detail.class?.title || defaultTitle,
        fileName: firstMaterialName,
        fileSize: firstMaterialSize,
        url: materialUrl ? resolveUrl(materialUrl) : undefined,
        lectureId: course.id,
        classId: classId,
        pages: pages,
      };
      console.log("[DEBUG] selectedLesson 설정:", lessonData);
      setSelectedLesson(lessonData);
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
        const newItems =
          (resp.pdfs as MaterialEntry[] | undefined)
            ?.map((pdfItem) => {
              const normalized = normalizeMaterialEntry(pdfItem);
              if (!normalized.url) return null;
              const url = resolveUrl(normalized.url);
              const name =
                normalized.originalName || url.split("/").pop() || "자료";
              return { name, size: "파일", url };
            })
            .filter(
              (item): item is { name: string; size: string; url: string } =>
                item !== null
            ) || [];
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
        // 404 에러는 PDF가 없는 경우이므로 조용히 처리
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        if (
          errorMessage.includes("404") ||
          errorMessage.includes("찾을 수 없습니다")
        ) {
          // PDF가 없는 경우 빈 배열로 설정
          setWeeks((prev) =>
            prev.map((w) =>
              Number(w.week) === Number(classId)
                ? {
                    ...w,
                    items: [],
                  }
                : w
            )
          );
          setLoadedClassIds((prev) =>
            prev.includes(classId) ? prev : [...prev, classId]
          );
        } else {
          console.error("PDF 목록 조회 실패:", error);
          const message =
            error instanceof Error
              ? error.message
              : "PDF 목록을 불러오는 중 오류가 발생했습니다.";
          setToast({ message, type: "error" });
        }
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
          id: myInfo?.id,
          name: myInfo?.name || "교수자",
          title:
            myInfo?.user_type === "professor"
              ? "교수"
              : myInfo?.user_type || "강의자",
          affiliation: course.description || "강의자 정보",
          currentLectures: lectureCount,
          profileImage: myInfo?.profile_image,
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
                      <div className="flex items-center space-x-2 flex-wrap gap-2 justify-end">
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
                        <button
                          className="px-3 py-1 rounded text-sm border border-gray-200 text-gray-600 hover:bg-gray-50 flex items-center space-x-1 transition-colors duration-200"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const original = classList.find(
                              (cls) => cls.id === classId
                            );
                            if (original) {
                              openEditClassModal(original);
                            } else {
                              setToast({
                                message: "클래스 정보를 찾을 수 없습니다.",
                                type: "error",
                              });
                            }
                          }}
                        >
                          <PenSquare className="w-4 h-4" />
                          <span>수정</span>
                        </button>
                        <button
                          className="px-3 py-1 rounded text-sm border border-red-200 text-red-600 hover:bg-red-50 flex items-center space-x-1 transition-colors duration-200"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const original = classList.find(
                              (cls) => cls.id === classId
                            );
                            if (original) {
                              openDeleteClassModal(original);
                            } else {
                              setToast({
                                message: "클래스 정보를 찾을 수 없습니다.",
                                type: "error",
                              });
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>삭제</span>
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
        <div className="mt-6">
          <button
            onClick={openAddClassModal}
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>클래스 추가</span>
          </button>
        </div>
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
          pdfUrl={selectedLesson.url}
          lectureId={selectedLesson.lectureId}
          classId={selectedLesson.classId}
          pages={selectedLesson.pages}
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

      <Modal
        isOpen={isAddClassModalOpen}
        onClose={closeClassModals}
        title="클래스 추가"
        size="lg"
      >
        <form onSubmit={handleSubmitAddClass} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              제목
            </label>
            <input
              type="text"
              value={classForm.title}
              onChange={(e) =>
                setClassForm((prev) => ({ ...prev, title: e.target.value }))
              }
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="클래스 제목을 입력하세요"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              설명
            </label>
            <textarea
              value={classForm.description}
              onChange={(e) =>
                setClassForm((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              일정
            </label>
            <input
              type="datetime-local"
              value={classForm.date}
              onChange={(e) =>
                setClassForm((prev) => ({ ...prev, date: e.target.value }))
              }
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              자료 파일 (PDF)
            </label>
            <div className="space-y-2">
              {/* 드래그 앤 드롭 영역 */}
              <div
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                  isDragOver
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-300 hover:border-gray-400"
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600 mb-2">
                  PDF 파일을 여기에 끌어다 놓거나
                </p>
                <label className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer">
                  <Upload className="w-4 h-4" />
                  <span>파일 선택</span>
                  <input
                    type="file"
                    accept=".pdf"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </label>
              </div>

              {/* 선택된 파일 목록 */}
              {selectedFiles.length > 0 && (
                <div className="space-y-2">
                  {selectedFiles.map((file, index) => {
                    const fileKey = `${file.name}-${file.size}`;
                    const isUploading = uploadingFiles.has(fileKey);
                    const progress = uploadProgress.get(fileKey) || 0;
                    return (
                      <div
                        key={`${file.name}-${index}`}
                        className="bg-gray-50 px-3 py-2 rounded border"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-gray-700 truncate flex-1">
                            {file.name} ({(file.size / 1024 / 1024).toFixed(2)}{" "}
                            MB)
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveFile(index)}
                            className="ml-2 text-red-500 hover:text-red-700"
                            disabled={isUploading}
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        {isUploading && (
                          <div className="mt-2">
                            <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                              <span>업로드 중...</span>
                              <span>{progress}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={closeClassModals}
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
              disabled={isClassSubmitting}
            >
              취소
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
              disabled={isClassSubmitting}
            >
              {isClassSubmitting ? "저장 중..." : "추가"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={Boolean(editingClass)}
        onClose={closeClassModals}
        title="클래스 수정"
        size="lg"
      >
        <form onSubmit={handleSubmitEditClass} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              제목
            </label>
            <input
              type="text"
              value={classForm.title}
              onChange={(e) =>
                setClassForm((prev) => ({ ...prev, title: e.target.value }))
              }
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              설명
            </label>
            <textarea
              value={classForm.description}
              onChange={(e) =>
                setClassForm((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              일정
            </label>
            <input
              type="datetime-local"
              value={classForm.date}
              onChange={(e) =>
                setClassForm((prev) => ({ ...prev, date: e.target.value }))
              }
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              자료 파일 (PDF)
            </label>
            <div className="space-y-2">
              {/* 드래그 앤 드롭 영역 */}
              <div
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                  isDragOver
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-300 hover:border-gray-400"
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600 mb-2">
                  PDF 파일을 여기에 끌어다 놓거나
                </p>
                <label className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer">
                  <Upload className="w-4 h-4" />
                  <span>파일 선택</span>
                  <input
                    type="file"
                    accept=".pdf"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </label>
              </div>

              {/* 선택된 파일 목록 */}
              {selectedFiles.length > 0 && (
                <div className="space-y-2">
                  {selectedFiles.map((file, index) => {
                    const fileKey = `${file.name}-${file.size}`;
                    const isUploading = uploadingFiles.has(fileKey);
                    const progress = uploadProgress.get(fileKey) || 0;
                    return (
                      <div
                        key={`${file.name}-${index}`}
                        className="bg-gray-50 px-3 py-2 rounded border"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-gray-700 truncate flex-1">
                            {file.name} ({(file.size / 1024 / 1024).toFixed(2)}{" "}
                            MB)
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveFile(index)}
                            className="ml-2 text-red-500 hover:text-red-700"
                            disabled={isUploading}
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        {isUploading && (
                          <div className="mt-2">
                            <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                              <span>업로드 중...</span>
                              <span>{progress}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              {/* 기존 자료 표시 */}
              {editingClass &&
                editingClass.materials &&
                editingClass.materials.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-500 mb-1">기존 자료:</p>
                    <div className="space-y-1">
                      {editingClass.materials.map((material, index) => (
                        <div
                          key={index}
                          className="text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded"
                        >
                          {material.split("/").pop() || material}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={closeClassModals}
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
              disabled={isClassSubmitting}
            >
              취소
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
              disabled={isClassSubmitting}
            >
              {isClassSubmitting ? "저장 중..." : "저장"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={Boolean(deletingClass)}
        onClose={closeClassModals}
        title="클래스 삭제"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-700">
            선택한 클래스를 삭제하시겠어요? 이 작업은 되돌릴 수 없습니다.
          </p>
          <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
            <div className="font-semibold text-gray-900">
              {deletingClass?.title}
            </div>
            <div>{deletingClass?.description || "-"}</div>
          </div>
          <div className="flex justify-end space-x-2">
            <button
              onClick={closeClassModals}
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
              disabled={isClassSubmitting}
            >
              취소
            </button>
            <button
              onClick={handleConfirmDeleteClass}
              className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
              disabled={isClassSubmitting}
            >
              {isClassSubmitting ? "삭제 중..." : "삭제"}
            </button>
          </div>
        </div>
      </Modal>

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
