import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Play, Users, Download, ChevronDown, ChevronUp } from "lucide-react";
import CommonSidebar from "../../components/layout/CommonSidebar";
import BroadcastAgreementModal from "../../components/modal/startBroadcast/BroadcastAgreementModal";
import LectureReservationModal from "../../components/modal/reserveBroadcast/LectureReservationModal";
import LessonQuestionModal from "../../components/modal/lessonQuestion/LessonQuestionModal";

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

  // mock: 강좌 정보 및 주차/자료
  const course = {
    id,
    title: "프로그래밍 시작하기: 파이썬 입문",
    instructor: "김철수",
    description:
      "이미 12명 이상이 학습하고 만족한 최고의 프로그래밍 입문 강의입니다.",
    participants: 12,
  };

  const weeks = Array.from({ length: 6 }).map((_, i) => ({
    week: i + 1,
    title: `${i + 1}주차. 파이썬 ${i === 0 ? "시작해봐요" : "완전 기초"}`,
    items: [
      {
        name: "파이썬 & 프로그래밍 소개 (1-1): 파이썬으로 많은 것을 할 수 있어요.pdf",
        size: "960.37 KB",
      },
      {
        name: "파이썬 & 프로그래밍 소개 (1-1): 파이썬으로 많은 것을 할 수 있어요.pdf",
        size: "960.37 KB",
      },
      {
        name: "파이썬 & 프로그래밍 소개 (1-1): 파이썬으로 많은 것을 할 수 있어요.pdf",
        size: "960.37 KB",
      },
    ],
  }));

  const latestQuestions = [
    { q: "과목에 대한 질문을 해도 되나요?", a: "네, 얼마든지요..." },
    { q: "실습 환경은 어떻게 구성하나요?", a: "Colab을 권장합니다." },
    { q: "과제 제출 형식이 궁금해요", a: "PDF 혹은 노트북 파일" },
  ];

  const handleStartBroadcast = () => {
    setIsModalOpen(true);
  };

  const handleAgree = (cameraRequired: boolean, files: File[]) => {
    // 실제 방송 시작 로직 (여기에 방송 시작 API 호출 등)
    console.log(
      "방송 시작 동의됨, 카메라 필수:",
      cameraRequired,
      "업로드된 파일:",
      files
    );
    setIsModalOpen(false);
  };

  const handleClose = () => {
    setIsModalOpen(false);
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

  const handleLessonQuestionModalOpen = (lesson: {
    title: string;
    fileName: string;
    fileSize: string;
  }) => {
    setSelectedLesson(lesson);
    setIsLessonQuestionModalOpen(true);
  };

  const handleLessonQuestionModalClose = () => {
    setIsLessonQuestionModalOpen(false);
    setSelectedLesson(null);
  };

  const handleAddAnswer = (questionId: number, answer: string) => {
    // 실제 답변 추가 로직 (여기에 API 호출 등)
    console.log("답변 추가됨:", { questionId, answer });
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
        showBroadcastControls={true}
        onStartBroadcast={handleStartBroadcast}
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
                  <span>{course.participants}+</span>
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
            {course.title}
          </h1>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleReservationModalOpen}
              className="px-4 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200 transition-colors duration-200"
            >
              강좌 예약
            </button>
            <Link to="#" className="px-4 py-2 bg-gray-100 rounded-lg text-sm">
              강좌 인원 관리
            </Link>
          </div>
        </div>

        <div className="space-y-3">
          {weeks.map((w) => (
            <details
              key={w.week}
              className="bg-white border border-gray-200 rounded-lg group"
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
                  <div className="text-sm text-gray-600">
                    {w.items.length}개
                  </div>
                  <button
                    className="flex items-center space-x-1 px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md text-sm transition-colors duration-200"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      // 전체 다운로드 로직 구현
                      console.log(`${w.title} 전체 다운로드`);
                    }}
                  >
                    <Download className="w-4 h-4" />
                    <span>전체 다운로드</span>
                  </button>
                </div>
              </summary>
              <div className="divide-y">
                {w.items.map((it, idx) => (
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
                          handleLessonQuestionModalOpen({
                            title: w.title,
                            fileName: it.name,
                            fileSize: it.size,
                          })
                        }
                        className="px-3 py-1 bg-gray-100 rounded text-sm hover:bg-gray-200 transition-colors duration-200"
                      >
                        교안 및 질문 보기
                      </button>
                      <button className="px-3 py-1 bg-gray-100 rounded text-sm hover:bg-gray-200 transition-colors duration-200">
                        다운로드
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </details>
          ))}
        </div>
      </section>

      {/* 실시간 방송 시작 모달 */}
      <BroadcastAgreementModal
        isOpen={isModalOpen}
        onClose={handleClose}
        onAgree={handleAgree}
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
    </div>
  );
};

export default ProfessorClass;
