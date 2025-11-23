import React, { useState, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  ChevronDown,
  ChevronUp,
  FileText,
} from "lucide-react";
import clsx from "clsx";
import Modal from "../../common/Modal";

interface Question {
  id: number;
  question: string;
  answer?: string;
  isOpen: boolean;
  isReplying?: boolean;
}

interface WhiteboardPage {
  page_number: number;
  image_path: string;
  pdf_path: string;
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
  questions: Question[];
  onAddAnswer?: (questionId: number, answer: string) => void;
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
  questions,
  onAddAnswer,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = pages && pages.length > 0 ? pages.length : 1;
  
  // pages가 있으면 첫 페이지로 리셋
  React.useEffect(() => {
    if (pages && pages.length > 0) {
      setCurrentPage(1);
    }
  }, [pages]);
  const [localQuestions, setLocalQuestions] = useState<Question[]>(questions);
  const [replyText, setReplyText] = useState("");
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<"upvote" | "latest">("upvote");

  const handlePageChange = (direction: "prev" | "next") => {
    if (direction === "prev" && currentPage > 1) {
      setCurrentPage(currentPage - 1);
    } else if (direction === "next" && currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const toggleQuestion = (questionId: number) => {
    setLocalQuestions((prev) =>
      prev.map((q) => (q.id === questionId ? { ...q, isOpen: !q.isOpen } : q))
    );
  };

  const handleReplyTextChange = (questionId: number, text: string) => {
    setReplyText(text);
    if (text.trim() && !replyingTo) {
      setReplyingTo(questionId);
    } else if (!text.trim() && replyingTo === questionId) {
      setReplyingTo(null);
    }
  };

  const handleCancelReply = () => {
    setReplyingTo(null);
    setReplyText("");
  };

  const handleSubmitReply = () => {
    if (replyText.trim() && replyingTo && onAddAnswer) {
      onAddAnswer(replyingTo, replyText.trim());
      setLocalQuestions((prev) =>
        prev.map((q) =>
          q.id === replyingTo
            ? { ...q, answer: replyText.trim(), isOpen: true }
            : q
        )
      );
      setReplyingTo(null);
      setReplyText("");
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
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center space-x-2">
            <Download className="w-4 h-4" />
            <span>필기본 다운로드</span>
          </button>
        </div>

        <div className="flex gap-6">
          {/* 왼쪽: 교안 내용 */}
          <div className="flex-1 bg-gray-50 p-6 border border-gray-200">
            {/* 페이지네이션 */}
            {(pages && pages.length > 0) && (
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => handlePageChange("prev")}
                  disabled={currentPage === 1}
                  className={clsx("p-2 bg-white border border-gray-300 rounded", {
                    "hover:bg-gray-100": currentPage > 1,
                    "opacity-50 cursor-not-allowed": currentPage === 1,
                  })}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm text-gray-600">
                  {currentPage} 페이지 / {totalPages}페이지
                </span>
                <button
                  onClick={() => handlePageChange("next")}
                  disabled={currentPage === totalPages}
                  className={clsx("p-2 bg-white border border-gray-300 rounded", {
                    "hover:bg-gray-100": currentPage < totalPages,
                    "opacity-50 cursor-not-allowed": currentPage === totalPages,
                  })}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* 교안 내용 - 페이지별 PDF 표시 */}
            {(() => {
              console.log("[DEBUG] LessonQuestionModal 렌더링:", {
                hasPages: !!pages,
                pagesLength: pages?.length,
                currentPage,
                totalPages,
                pdfUrl,
                pages: pages,
              });
              
              if (pages && pages.length > 0) {
                const currentPageData = pages.find(p => p.page_number === currentPage);
                console.log("[DEBUG] 현재 페이지 데이터:", {
                  currentPage,
                  currentPageData,
                  allPages: pages.map(p => ({ page_number: p.page_number, hasImage: !!p.image_path, hasPdf: !!p.pdf_path })),
                });
                
                if (!currentPageData) {
                  console.warn("[DEBUG] 현재 페이지 데이터를 찾을 수 없음:", { currentPage, pages });
                  return (
                    <div className="flex flex-col items-center justify-center min-h-[600px] bg-gray-50 border border-gray-200 p-8">
                      <p className="text-gray-400 text-lg font-medium">페이지를 찾을 수 없습니다</p>
                      <p className="text-gray-400 text-sm mt-2">현재 페이지: {currentPage} / 전체: {totalPages}</p>
                    </div>
                  );
                }
                
                // image_path가 있으면 이미지로, 없으면 pdf_path로 표시
                // 백엔드에서 이미 절대 URL로 변환되어 옴
                const imageUrl = currentPageData.image_path || null;
                const pdfUrlForPage = currentPageData.pdf_path || null;
                
                // image_path가 PDF 파일인지 확인 (.pdf 확장자)
                const isImagePathPdf = imageUrl && imageUrl.toLowerCase().endsWith('.pdf');
                const actualImageUrl = isImagePathPdf ? null : imageUrl;
                const actualPdfUrl = isImagePathPdf ? imageUrl : (pdfUrlForPage || null);
                
                console.log("[DEBUG] 페이지 URL:", {
                  imageUrl,
                  pdfUrlForPage,
                  isImagePathPdf,
                  actualImageUrl,
                  actualPdfUrl,
                  pageNumber: currentPageData.page_number,
                });
                
                return (
                  <div className="w-full min-h-[600px] bg-white border border-gray-200 flex items-center justify-center">
                    {actualImageUrl ? (
                      <div className="w-full h-full flex items-center justify-center">
                        <img
                          src={actualImageUrl}
                          alt={`페이지 ${currentPage}`}
                          className="max-w-full max-h-[600px] object-contain"
                          onLoad={() => console.log("[DEBUG] 이미지 로드 성공:", actualImageUrl)}
                          onError={(e) => {
                            console.error("[DEBUG] 이미지 로드 실패:", {
                              actualImageUrl,
                              error: e,
                              target: e.currentTarget,
                            });
                          }}
                        />
                      </div>
                    ) : actualPdfUrl ? (
                      <div className="w-full h-full">
                        <iframe
                          src={actualPdfUrl}
                          className="w-full h-full min-h-[600px] bg-white"
                          title={`PDF 페이지 ${currentPage}`}
                          onLoad={() => console.log("[DEBUG] PDF iframe 로드 성공:", actualPdfUrl)}
                          onError={(e) => {
                            console.error("[DEBUG] PDF iframe 로드 실패:", {
                              actualPdfUrl,
                              error: e,
                            });
                          }}
                        />
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center p-8">
                        <FileText className="w-10 h-10 text-gray-400 mb-4" />
                        <p className="text-gray-400 text-lg font-medium">페이지 데이터를 불러올 수 없습니다</p>
                        <p className="text-gray-400 text-xs mt-2">image_path: {currentPageData.image_path || "없음"}</p>
                        <p className="text-gray-400 text-xs">pdf_path: {currentPageData.pdf_path || "없음"}</p>
                      </div>
                    )}
                  </div>
                );
              }
              
              if (pdfUrl) {
                console.log("[DEBUG] 전체 PDF 표시 (fallback):", pdfUrl);
                return (
                  <div className="w-full h-full min-h-[600px]">
                    <iframe
                      src={pdfUrl}
                      className="w-full h-full min-h-[600px] bg-white border border-gray-200"
                      title="PDF Viewer"
                    />
                  </div>
                );
              }
              
              console.log("[DEBUG] PDF 없음 - 빈 화면 표시");
              return (
                <div className="flex flex-col items-center justify-center min-h-[600px] bg-gray-50 border border-gray-200 p-8">
                  <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mb-4">
                    <FileText className="w-10 h-10 text-gray-400" />
                  </div>
                  <p className="text-gray-400 text-lg font-medium">교안 미리보기</p>
                  <p className="text-gray-400 text-sm mt-2">
                    PDF 파일이 업로드되면 여기에 표시됩니다
                  </p>
                  <div className="mt-4 text-xs text-gray-500">
                    <p>디버그 정보:</p>
                    <p>pages: {pages ? `${pages.length}개` : "없음"}</p>
                    <p>pdfUrl: {pdfUrl || "없음"}</p>
                  </div>
                </div>
              );
            })()}
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

            <div className="max-h-96 overflow-y-auto space-y-3 pr-2">
              {localQuestions.map((question) => (
                <div
                  key={question.id}
                  className="border border-gray-200 bg-white"
                >
                  <button
                    onClick={() => toggleQuestion(question.id)}
                    className="w-full p-4 text-left flex items-center justify-between hover:bg-gray-50"
                  >
                    <span className="text-sm font-medium text-gray-900">
                      Q. {question.question}
                    </span>
                    {question.isOpen ? (
                      <ChevronUp className="w-4 h-4 text-gray-500" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-500" />
                    )}
                  </button>

                  {question.isOpen && (
                    <div className="px-4 pb-4">
                      {question.answer ? (
                        <div className="space-y-3">
                          {/* 기존 답변들 */}
                          <div className="space-y-3">
                            <div className="flex items-start space-x-3">
                              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                <span className="text-xs font-medium text-blue-700">
                                  AI
                                </span>
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-1">
                                  <span className="text-sm font-medium text-gray-900">
                                    AI 레큐
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    2시간 전
                                  </span>
                                </div>
                                <div className="text-sm text-gray-700">
                                  A. {question.answer}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-start space-x-3">
                              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                                <span className="text-xs font-medium text-gray-700">
                                  김
                                </span>
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-1">
                                  <span className="text-sm font-medium text-gray-900">
                                    김철수
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    1시간 전
                                  </span>
                                </div>
                                <div className="text-sm text-gray-700">
                                  A. 네, 파이썬은 웹 개발, 데이터 분석, 인공지능
                                  등 다양한 분야에서 활용될 수 있습니다. 특히
                                  초보자에게 친화적인 문법과 풍부한 라이브러리로
                                  인해 많은 개발자들이 선호하는 언어입니다.
                                </div>
                              </div>
                            </div>

                            {/* 답변 달기 입력창 */}
                            <div className="mt-3">
                              <textarea
                                value={replyText}
                                onChange={(e) =>
                                  handleReplyTextChange(
                                    question.id,
                                    e.target.value
                                  )
                                }
                                placeholder="여기에 답변을 작성해 주세요."
                                className="w-full p-3 border border-gray-300 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                rows={3}
                              />
                              {replyingTo === question.id && (
                                <div className="flex justify-end space-x-2 mt-2">
                                  <button
                                    onClick={handleCancelReply}
                                    className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 transition-colors duration-200"
                                  >
                                    취소
                                  </button>
                                  <button
                                    onClick={handleSubmitReply}
                                    disabled={!replyText.trim()}
                                    className={clsx(
                                      "px-4 py-1 bg-blue-600 text-white text-sm transition-colors duration-200",
                                      {
                                        "hover:bg-blue-700": replyText.trim(),
                                        "opacity-50 cursor-not-allowed":
                                          !replyText.trim(),
                                      }
                                    )}
                                  >
                                    답변 달기
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="text-sm text-gray-500">
                            아직 답변이 없습니다.
                          </div>
                          <div className="mt-3">
                            <textarea
                              value={replyText}
                              onChange={(e) =>
                                handleReplyTextChange(
                                  question.id,
                                  e.target.value
                                )
                              }
                              placeholder="여기에 답변을 작성해 주세요."
                              className="w-full p-3 border border-gray-300 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              rows={3}
                            />
                            {replyingTo === question.id && (
                              <div className="flex justify-end space-x-2 mt-2">
                                <button
                                  onClick={handleCancelReply}
                                  className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 transition-colors duration-200"
                                >
                                  취소
                                </button>
                                <button
                                  onClick={handleSubmitReply}
                                  disabled={!replyText.trim()}
                                  className={clsx(
                                    "px-4 py-1 bg-blue-600 text-white text-sm transition-colors duration-200",
                                    {
                                      "hover:bg-blue-700": replyText.trim(),
                                      "opacity-50 cursor-not-allowed":
                                        !replyText.trim(),
                                    }
                                  )}
                                >
                                  답변 달기
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default LessonQuestionModal;
