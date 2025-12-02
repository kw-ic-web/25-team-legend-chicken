import React, { useState, useEffect, useRef } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  ThumbsUp,
  MessageSquare,
  Plus,
} from "lucide-react";
import clsx from "clsx";
import { io, Socket } from "socket.io-client";
import Modal from "../../common/Modal";
import {
  getClassQuestions,
  createQuestion,
  updateQuestionAnswer,
  upvoteQuestion,
  type Question as ApiQuestion,
} from "../../../api/questions";
import { useToast } from "../../../contexts/ToastContext";
import { getMyInfo } from "../../../api/auth";
import { getBaseUrl } from "../../../api/auth/client";
import { downloadNotes } from "../../../api/professor";

interface WhiteboardPage {
  page_number: number;
  image_path: string;
  original_pdf_path?: string; // 원본 교안 PDF
  pdf_path: string; // 필기+교안 합본 PDF
  text: string;
  status: string;
}

interface LessonQuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  lessonTitle: string;
  fileName: string;
  fileSize: string;
  pdfUrl?: string;
  lectureId?: string;
  classId?: number;
  pages?: WhiteboardPage[];
  questions?: ApiQuestion[];
}

const LessonQuestionModal: React.FC<LessonQuestionModalProps> = ({
  isOpen,
  onClose,
  lessonTitle,
  fileName,
  fileSize,
  pdfUrl,
  lectureId,
  classId,
  pages,
  questions: initialQuestions,
}) => {
  const { showToast } = useToast();
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = pages && pages.length > 0 ? pages.length : 1;
  const [questions, setQuestions] = useState<ApiQuestion[]>(
    initialQuestions ?? []
  );
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [isCreatingQuestion, setIsCreatingQuestion] = useState(false);
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [newQuestionText, setNewQuestionText] = useState("");
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"upvote" | "latest">("upvote");
  const [upvotingQuestions, setUpvotingQuestions] = useState<Set<string>>(
    new Set()
  );
  const [userInfo, setUserInfo] = useState<{
    name: string;
    id: string;
    role: string;
  } | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const pdfContainerRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  // Prop으로 받은 질문 목록 동기화
  useEffect(() => {
    if (initialQuestions) {
      setQuestions(initialQuestions);
    }
  }, [initialQuestions]);

  // 사용자 정보 가져오기
  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const response = await getMyInfo();
        const userId =
          (response.user as typeof response.user & { _id?: string })._id ||
          response.user.id;
        setUserInfo({
          name: response.user.name,
          id: userId,
          role: response.user.user_type || "student",
        });
      } catch (error) {
        console.error("사용자 정보 조회 실패:", error);
      }
    };
    if (isOpen) {
      fetchUserInfo();
    }
  }, [isOpen]);

  // 질문 목록 가져오기 (모든 페이지의 질문)
  useEffect(() => {
    if (isOpen && lectureId && classId) {
      fetchQuestions();
    }
  }, [isOpen, lectureId, classId]);

  // Socket.io 연결 및 실시간 업데이트
  useEffect(() => {
    if (!isOpen || !lectureId || !classId || !userInfo) {
      return;
    }

    const token = localStorage.getItem("lecq.token");
    if (!token) {
      return;
    }

    const baseUrl = getBaseUrl();
    const socket = io(baseUrl, {
      transports: ["websocket", "polling"],
      withCredentials: true,
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });
    socketRef.current = socket;

    // 연결 성공 시 방 입장
    socket.on("connect", () => {
      socket.emit("live:join", {
        lecture_id: lectureId,
        class_id: classId,
        live_id: null, // 질문은 라이브와 무관
        role: userInfo.role,
        user_id: userInfo.id,
      });
    });

    // 새 질문 생성 시
    socket.on("question:new", (question: ApiQuestion) => {
      console.log("[LessonQuestionModal] question:new 이벤트 수신:", question);
      setQuestions((prev) => {
        // 중복 체크
        if (prev.some((q) => q._id === question._id)) {
          return prev;
        }
        return [question, ...prev];
      });
    });

    // 질문 업데이트 시 (답변 추가, 좋아요 등)
    socket.on("question:updated", (question: ApiQuestion) => {
      console.log(
        "[LessonQuestionModal] question:updated 이벤트 수신:",
        question
      );
      setQuestions((prev) =>
        prev.map((q) => (q._id === question._id ? question : q))
      );
    });

    // GPT 답변 생성 시
    socket.on(
      "question:answer",
      (data: {
        question_id: string;
        answer: string;
        question: ApiQuestion;
      }) => {
        console.log("[LessonQuestionModal] question:answer 이벤트 수신:", data);
        setQuestions((prev) => {
          const updated = prev.map((q) =>
            q._id === data.question_id ? data.question : q
          );
          // 질문이 목록에 없으면 추가
          if (!prev.some((q) => q._id === data.question_id)) {
            return [data.question, ...prev];
          }
          return updated;
        });
      }
    );

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [isOpen, lectureId, classId]);

  const fetchQuestions = async () => {
    if (!lectureId || !classId) return;
    setIsLoadingQuestions(true);
    try {
      // 모든 페이지의 질문을 가져오기 위해 page 파라미터를 전달하지 않음
      const response = await getClassQuestions(lectureId, classId);
      setQuestions(response.questions || []);
    } catch (error) {
      console.error("질문 목록 조회 실패:", error);
      showToast("질문 목록을 불러오는데 실패했습니다.", "error");
    } finally {
      setIsLoadingQuestions(false);
    }
  };

  // pages가 있으면 첫 페이지로 리셋
  useEffect(() => {
    if (pages && pages.length > 0) {
      setCurrentPage(1);
    }
  }, [pages]);

  const handlePageChange = (direction: "prev" | "next") => {
    if (direction === "prev" && currentPage > 1) {
      setCurrentPage(currentPage - 1);
    } else if (direction === "next" && currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handleCreateQuestion = async () => {
    if (!newQuestionText.trim()) {
      showToast("질문 내용을 입력해주세요.", "error");
      return;
    }

    if (!lectureId || !classId) {
      showToast("강좌 정보를 찾을 수 없습니다.", "error");
      return;
    }

    if (!userInfo) {
      showToast(
        "사용자 정보를 불러오는 중입니다. 잠시 후 다시 시도해주세요.",
        "error"
      );
      return;
    }

    setIsCreatingQuestion(true);
    try {
      // PDF 클릭 위치를 기본값으로 설정 (중앙)
      const position = { x: 0.5, y: 0.5 };

      const response = await createQuestion({
        lecture_id: lectureId,
        class_id: classId,
        page: currentPage,
        position,
        timestamp: new Date().toISOString(),
        type: "question",
        author: {
          id: userInfo.id,
          name: userInfo.name,
          role: userInfo.role,
        },
        text: newQuestionText.trim(),
        metadata: {
          source: "pdf_viewer",
          device: "web",
          language: "ko",
        },
      });

      // 생성된 질문을 즉시 목록에 추가
      if (response.question) {
        setQuestions((prev) => {
          // 중복 체크
          if (prev.some((q) => q._id === response.question._id)) {
            return prev;
          }
          return [response.question, ...prev];
        });
      }

      showToast("질문이 등록되었습니다. AI가 답변을 생성 중입니다.", "success");
      setNewQuestionText("");
      setShowQuestionForm(false);

      // GPT 답변 생성 대기 (폴링 방식으로 주기적으로 확인)
      const checkAnswer = async (questionId: string, retries = 10) => {
        if (retries <= 0) {
          // 일정 시간 내에 AI 답변이 생성되지 않은 경우
          showToast(
            "AI 답변을 생성하지 못했습니다. 나중에 다시 시도해주세요.",
            "error"
          );
          return;
        }

        setTimeout(async () => {
          try {
            // 모든 페이지의 질문을 가져옴 (page 파라미터 없음)
            const response = await getClassQuestions(lectureId!, classId!);
            const updatedQuestion = response.questions?.find(
              (q) => q._id === questionId
            );
            if (updatedQuestion?.answer) {
              setQuestions((prev) =>
                prev.map((q) => (q._id === questionId ? updatedQuestion : q))
              );
            } else {
              checkAnswer(questionId, retries - 1);
            }
          } catch (error) {
            console.error("답변 확인 실패:", error);
          }
        }, 2000); // 2초마다 확인
      };

      if (response.question._id) {
        checkAnswer(response.question._id);
      }
    } catch (error) {
      console.error("질문 생성 실패:", error);
      showToast("질문 등록에 실패했습니다.", "error");
    } finally {
      setIsCreatingQuestion(false);
    }
  };

  const handleSubmitReply = async (questionId: string) => {
    const text = replyText[questionId];
    if (!text || !text.trim()) {
      showToast("답변 내용을 입력해주세요.", "error");
      return;
    }

    try {
      await updateQuestionAnswer(questionId, text.trim());
      showToast("답변이 등록되었습니다.", "success");
      setReplyText((prev) => {
        const next = { ...prev };
        delete next[questionId];
        return next;
      });
      setReplyingTo(null);
      fetchQuestions();
    } catch (error) {
      console.error("답변 등록 실패:", error);
      showToast("답변 등록에 실패했습니다.", "error");
    }
  };

  const handleUpvote = async (questionId: string) => {
    if (upvotingQuestions.has(questionId)) return;

    setUpvotingQuestions((prev) => new Set(prev).add(questionId));
    try {
      await upvoteQuestion(questionId);
      fetchQuestions();
    } catch (error) {
      console.error("좋아요 실패:", error);
      showToast("좋아요 처리에 실패했습니다.", "error");
    } finally {
      setUpvotingQuestions((prev) => {
        const next = new Set(prev);
        next.delete(questionId);
        return next;
      });
    }
  };

  const sortedQuestions = [...questions].sort((a, b) => {
    if (sortBy === "upvote") {
      return (b.upvote_count || 0) - (a.upvote_count || 0);
    } else {
      const aTime = new Date(a.created_at || a.timestamp).getTime();
      const bTime = new Date(b.created_at || b.timestamp).getTime();
      return bTime - aTime;
    }
  });

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}일 전`;
    if (hours > 0) return `${hours}시간 전`;
    if (minutes > 0) return `${minutes}분 전`;
    return "방금 전";
  };

  const handleDownloadNotes = async () => {
    if (!lectureId || !classId) {
      showToast("강좌 정보를 찾을 수 없습니다.", "error");
      return;
    }

    if (isDownloading) return;

    setIsDownloading(true);
    try {
      const blob = await downloadNotes(lectureId, classId);
      
      // Blob을 다운로드 링크로 변환
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `필기본-${lessonTitle}-${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      showToast("필기본 다운로드가 시작되었습니다.", "success");
    } catch (error) {
      console.error("필기본 다운로드 실패:", error);
      const message = error instanceof Error ? error.message : "필기본 다운로드에 실패했습니다.";
      showToast(message, "error");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${lessonTitle} 교안`}
      showCloseButton={true}
      size="6xl"
    >
      <div className="space-y-4">
        {/* 파일 정보 및 다운로드 버튼 */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {fileName} [ {fileSize} ]
          </div>
          <button
            onClick={handleDownloadNotes}
            disabled={isDownloading || !lectureId || !classId}
            className={clsx(
              "px-4 py-2 bg-blue-600 text-white rounded-lg transition-colors duration-200 flex items-center space-x-2",
              {
                "hover:bg-blue-700": !isDownloading && lectureId && classId,
                "opacity-50 cursor-not-allowed": isDownloading || !lectureId || !classId,
              }
            )}
          >
            <Download className="w-4 h-4" />
            <span>{isDownloading ? "다운로드 중..." : "필기본 다운로드"}</span>
          </button>
        </div>

        <div className="flex gap-6">
          {/* 왼쪽: 교안 내용 */}
          <div className="flex-1 flex flex-col border border-gray-200 bg-white rounded-lg overflow-hidden">
            {/* 페이지네이션 */}
            {pages && pages.length > 0 && (
              <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-b border-gray-200">
                <button
                  onClick={() => handlePageChange("prev")}
                  disabled={currentPage === 1}
                  className={clsx(
                    "p-2 bg-white border border-gray-300 rounded",
                    {
                      "hover:bg-gray-100": currentPage > 1,
                      "opacity-50 cursor-not-allowed": currentPage === 1,
                    }
                  )}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm text-gray-600">
                  {currentPage} 페이지 / {totalPages}페이지
                </span>
                <button
                  onClick={() => handlePageChange("next")}
                  disabled={currentPage === totalPages}
                  className={clsx(
                    "p-2 bg-white border border-gray-300 rounded",
                    {
                      "hover:bg-gray-100": currentPage < totalPages,
                      "opacity-50 cursor-not-allowed":
                        currentPage === totalPages,
                    }
                  )}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* 교안 내용 - 페이지별 PDF 표시 */}
            <div
              ref={pdfContainerRef}
              className="flex-1 bg-gray-50 border-t border-gray-200"
            >
              {pages && pages.length > 0 ? (
                (() => {
                  const currentPageData = pages.find(
                    (p) => p.page_number === currentPage
                  );
                  
                  // 교안 및 질문 보기에서는 항상 원본 교안 PDF 사용
                  // original_pdf_path가 있으면 사용, 없으면 pdf_path 사용, 둘 다 없으면 전체 PDF 사용
                  const originalPdfUrl = currentPageData?.original_pdf_path || currentPageData?.pdf_path || pdfUrl;
                  
                  if (!originalPdfUrl) {
                    return (
                      <div className="w-full min-h-[600px] flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-8">
                        <p className="text-gray-400 text-lg font-medium">
                          페이지를 찾을 수 없습니다
                        </p>
                      </div>
                    );
                  }

                  // 원본 교안 PDF 표시 (필기 없이)
                  return (
                    <iframe
                      src={`${originalPdfUrl}#page=${currentPage}&zoom=page-fit&toolbar=0&navpanes=0&scrollbar=0`}
                      className="w-full h-full min-h-[600px] bg-white"
                      title={`PDF 페이지 ${currentPage}`}
                    />
                  );
                  const isImagePathPdf =
                    imageUrl && imageUrl.toLowerCase().endsWith(".pdf");
                  const actualImageUrl = isImagePathPdf ? null : imageUrl;
                  // pdf_path가 없으면 원본 PDF 사용
                  const actualPdfUrl = isImagePathPdf
                    ? imageUrl
                    : pdfUrlForPage || pdfUrl || null;

                  return (
                    <>
                      {actualImageUrl ? (
                        <div className="w-full min-h-[600px] flex items-center justify-center bg-white p-4">
                          <img
                            src={actualImageUrl}
                            alt={`페이지 ${currentPage}`}
                            className="max-w-full max-h-[600px] object-contain"
                          />
                        </div>
                      ) : actualPdfUrl ? (
                        <iframe
                          src={actualPdfUrl}
                          className="w-full h-full min-h-[600px] bg-white"
                          title={`PDF 페이지 ${currentPage}`}
                        />
                      ) : (
                        <div className="w-full min-h-[600px] flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-8">
                          <FileText className="w-10 h-10 text-gray-400 mb-4" />
                          <p className="text-gray-400 text-lg font-medium">
                            페이지 데이터를 불러올 수 없습니다
                          </p>
                        </div>
                      )}
                    </>
                  );
                })()
              ) : pdfUrl ? (
                <iframe
                  src={pdfUrl}
                  className="w-full h-full min-h-[600px] bg-white"
                  title="PDF Viewer"
                />
              ) : (
                <div className="w-full min-h-[600px] flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-8">
                  <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mb-4">
                    <FileText className="w-10 h-10 text-gray-400" />
                  </div>
                  <p className="text-gray-400 text-lg font-medium">
                    교안 미리보기
                  </p>
                  <p className="text-gray-400 text-sm mt-2">
                    PDF 파일이 업로드되면 여기에 표시됩니다
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* 오른쪽: 질문 및 답변 */}
          <div className="w-80 space-y-4 border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-semibold text-gray-900">
                질문 및 답변
              </h4>
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => setSortBy("upvote")}
                  className={clsx(
                    "px-2 py-1 text-xs border transition-colors duration-200",
                    {
                      "bg-blue-100 text-blue-700 border-blue-300":
                        sortBy === "upvote",
                      "text-gray-500 hover:bg-gray-100 border-gray-300":
                        sortBy !== "upvote",
                    }
                  )}
                >
                  UPVOTE순
                </button>
                <button
                  onClick={() => setSortBy("latest")}
                  className={clsx(
                    "px-2 py-1 text-xs border transition-colors duration-200",
                    {
                      "bg-blue-100 text-blue-700 border-blue-300":
                        sortBy === "latest",
                      "text-gray-500 hover:bg-gray-100 border-gray-300":
                        sortBy !== "latest",
                    }
                  )}
                >
                  최신순
                </button>
              </div>
            </div>

            {/* 질문 작성 버튼 */}
            {!showQuestionForm && (
              <button
                onClick={() => setShowQuestionForm(true)}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center justify-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>이 페이지에 대한 질문하기</span>
              </button>
            )}

            {/* 질문 작성 폼 */}
            {showQuestionForm && (
              <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                <textarea
                  value={newQuestionText}
                  onChange={(e) => setNewQuestionText(e.target.value)}
                  placeholder="질문 내용을 입력하세요..."
                  className="w-full p-2 border border-gray-300 rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
                <div className="flex justify-end space-x-2 mt-2">
                  <button
                    onClick={() => {
                      setShowQuestionForm(false);
                      setNewQuestionText("");
                    }}
                    className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleCreateQuestion}
                    disabled={!newQuestionText.trim() || isCreatingQuestion}
                    className={clsx(
                      "px-4 py-1 bg-blue-600 text-white text-sm rounded",
                      {
                        "opacity-50 cursor-not-allowed":
                          !newQuestionText.trim() || isCreatingQuestion,
                        "hover:bg-blue-700":
                          newQuestionText.trim() && !isCreatingQuestion,
                      }
                    )}
                  >
                    {isCreatingQuestion ? "등록 중..." : "등록"}
                  </button>
                </div>
              </div>
            )}

            {/* 질문 목록 */}
            <div className="max-h-96 overflow-y-auto space-y-3 pr-2">
              {isLoadingQuestions ? (
                <div className="text-center text-gray-500 py-4">
                  질문을 불러오는 중...
                </div>
              ) : sortedQuestions.length === 0 ? (
                <div className="text-center text-gray-500 py-4">
                  아직 질문이 없습니다.
                </div>
              ) : (
                sortedQuestions.map((question) => {
                  const isOpen = replyingTo === question._id;
                  const isUpvoted =
                    userInfo && question.upvoted_by?.includes(userInfo.id);
                  const meta = question.metadata as
                    | {
                        answer_by?: "ai" | "professor";
                        ai_answer?: string | null;
                        professor_answer?: string | null;
                      }
                    | undefined;

                  const hasProfessor = !!meta?.professor_answer;
                  // AI 답변: 메타에 저장돼 있으면 우선 사용,
                  // 아직 교수자 답변이 없다면, 기존 answer 를 AI 답변으로 간주
                  const aiAnswer: string | null =
                    (meta?.ai_answer as string | null) ??
                    (!hasProfessor ? (question.answer ?? null) : null);
                  // 교수자 답변: 메타에 있으면 사용
                  const professorAnswer: string | null =
                    (meta?.professor_answer as string | null) ?? null;

                  const hasAnyAnswer = !!aiAnswer || !!professorAnswer;

                  return (
                    <div
                      key={question._id}
                      className="border border-gray-200 bg-white rounded-lg"
                    >
                      <div className="p-3">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <span className="text-xs font-medium text-gray-700">
                                {question.author?.name || "익명"}
                              </span>
                              <span className="text-xs text-gray-500">
                                {formatTimeAgo(
                                  question.created_at || question.timestamp
                                )}
                              </span>
                              {question.page && (
                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                                  {question.page}페이지
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-900 mb-2">
                              Q. {question.text}
                            </p>
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => handleUpvote(question._id)}
                                disabled={upvotingQuestions.has(question._id)}
                                className={clsx(
                                  "flex items-center space-x-1 px-2 py-1 rounded text-xs transition-colors",
                                  {
                                    "bg-blue-100 text-blue-700": isUpvoted,
                                    "bg-gray-100 text-gray-600 hover:bg-gray-200":
                                      !isUpvoted,
                                  }
                                )}
                              >
                                <ThumbsUp className="w-3 h-3" />
                                <span>{question.upvote_count || 0}</span>
                              </button>
                              <button
                                onClick={() => {
                                  if (isOpen) {
                                    setReplyingTo(null);
                                    setReplyText((prev) => {
                                      const next = { ...prev };
                                      delete next[question._id];
                                      return next;
                                    });
                                  } else {
                                    setReplyingTo(question._id);
                                    setReplyText((prev) => ({
                                      ...prev,
                                      [question._id]: "",
                                    }));
                                  }
                                }}
                                className="flex items-center space-x-1 px-2 py-1 rounded text-xs bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                              >
                                <MessageSquare className="w-3 h-3" />
                                <span>답변</span>
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* 답변 영역 (AI / 교수자 모두 표시) */}
                        {hasAnyAnswer && (
                          <div className="mt-3 pt-3 border-t border-gray-200 space-y-3">
                            {/* 1) AI 레큐 답변 */}
                            {aiAnswer && (
                              <div className="flex items-start space-x-2">
                                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                                  <span className="text-xs font-medium text-blue-700">
                                    AI
                                  </span>
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center space-x-2 mb-1">
                                    <span className="text-xs font-medium text-gray-900">
                                      AI 레큐
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-700">
                                    A. {aiAnswer}
                                  </p>
                                </div>
                              </div>
                            )}

                            {/* 2) 교수자 직접 답변 */}
                            {professorAnswer && (
                              <div className="flex items-start space-x-2">
                                <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                                  <span className="text-xs font-medium text-green-700">
                                    교
                                  </span>
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center space-x-2 mb-1">
                                    <span className="text-xs font-medium text-gray-900">
                                      교수자
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-700">
                                    A. {professorAnswer}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* 답변 입력 폼 */}
                        {isOpen && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <textarea
                              value={replyText[question._id] || ""}
                              onChange={(e) =>
                                setReplyText((prev) => ({
                                  ...prev,
                                  [question._id]: e.target.value,
                                }))
                              }
                              placeholder="여기에 답변을 작성해 주세요."
                              className="w-full p-2 border border-gray-300 rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                              rows={3}
                            />
                            <div className="flex justify-end space-x-2 mt-2">
                              <button
                                onClick={() => {
                                  setReplyingTo(null);
                                  setReplyText((prev) => {
                                    const next = { ...prev };
                                    delete next[question._id];
                                    return next;
                                  });
                                }}
                                className="px-3 py-1 text-xs text-gray-600 hover:text-gray-800"
                              >
                                취소
                              </button>
                              <button
                                onClick={() => handleSubmitReply(question._id)}
                                disabled={!replyText[question._id]?.trim()}
                                className={clsx(
                                  "px-4 py-1 bg-blue-600 text-white text-xs rounded",
                                  {
                                    "opacity-50 cursor-not-allowed":
                                      !replyText[question._id]?.trim(),
                                    "hover:bg-blue-700":
                                      replyText[question._id]?.trim(),
                                  }
                                )}
                              >
                                답변 달기
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default LessonQuestionModal;
