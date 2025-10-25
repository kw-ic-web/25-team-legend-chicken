import React, { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  ChevronDown,
  ChevronUp,
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

interface LessonQuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  lessonTitle: string;
  fileName: string;
  fileSize: string;
  questions: Question[];
  onAddAnswer?: (questionId: number, answer: string) => void;
}

const LessonQuestionModal: React.FC<LessonQuestionModalProps> = ({
  isOpen,
  onClose,
  lessonTitle,
  fileName,
  fileSize,
  questions,
  onAddAnswer,
}) => {
  const [currentPage, setCurrentPage] = useState(3);
  const [totalPages] = useState(12);
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
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => handlePageChange("prev")}
                disabled={currentPage === 1}
                className={clsx("p-2 bg-white border border-gray-300", {
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
                className={clsx("p-2 bg-white border border-gray-300", {
                  "hover:bg-gray-100": currentPage < totalPages,
                  "opacity-50 cursor-not-allowed": currentPage === totalPages,
                })}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* 챕터 제목 */}
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Chapter 1-1. 파이썬 & 프로그래밍 소개
            </h3>

            {/* 교안 내용 */}
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-sm"></div>
                  <span className="font-medium text-gray-900">
                    프로그래밍 기초
                  </span>
                </div>
                <ul className="ml-5 space-y-1">
                  <li className="text-sm text-gray-700">• 프로그래밍이란?</li>
                  <li className="text-sm text-gray-700">• 코딩 공부 하는 법</li>
                  <li className="text-sm text-gray-700">
                    • 좋은 프로그램이란?
                  </li>
                </ul>
              </div>

              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-sm"></div>
                  <span className="font-medium text-gray-900">
                    파이썬 배우는 이유
                  </span>
                </div>
                <ul className="ml-5 space-y-1">
                  <li className="text-sm text-gray-700">• 파이썬 장점</li>
                  <li className="text-sm text-gray-700">• 파이썬 활용 분야</li>
                  <li className="text-sm text-gray-700">• 파이썬 언어 특징</li>
                </ul>
              </div>
            </div>

            {/* 썸네일 미리보기 */}
            <div className="flex space-x-2 mt-6">
              <div className="w-16 h-12 bg-gray-200 border border-gray-300"></div>
              <div className="w-16 h-12 bg-gray-200 border border-gray-300 flex items-center justify-center">
                <div className="w-6 h-6 bg-white flex items-center justify-center">
                  <div className="w-2 h-2 bg-gray-600"></div>
                </div>
              </div>
              <div className="w-16 h-12 bg-gray-200 border border-gray-300"></div>
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
