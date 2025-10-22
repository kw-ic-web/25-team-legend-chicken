import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Play, Users, Download } from "lucide-react";
import CommonSidebar from "../../components/layout/CommonSidebar";
import Modal from "../../components/common/Modal";

const ProfessorClass: React.FC = () => {
  const { id } = useParams();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAgreed, setIsAgreed] = useState(false);

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

  const handleAgree = () => {
    if (isAgreed) {
      // 실제 방송 시작 로직
      window.location.href = "/professor/realtime-dashboard";
    }
  };

  const handleCancel = () => {
    setIsModalOpen(false);
    setIsAgreed(false);
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
            <Link to="#" className="px-4 py-2 bg-gray-100 rounded-lg text-sm">
              강좌 예약
            </Link>
            <Link to="#" className="px-4 py-2 bg-gray-100 rounded-lg text-sm">
              강좌 인원 관리
            </Link>
          </div>
        </div>

        <div className="space-y-3">
          {weeks.map((w) => (
            <details
              key={w.week}
              className="bg-white border border-gray-200 rounded-lg"
            >
              <summary className="list-none cursor-pointer select-none px-4 py-3 flex items-center justify-between">
                <div className="font-semibold">{w.title}</div>
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
                      <button className="px-3 py-1 bg-gray-100 rounded text-sm">
                        교안 및 질문 보기
                      </button>
                      <button className="px-3 py-1 bg-gray-100 rounded text-sm">
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
      <Modal
        isOpen={isModalOpen}
        onClose={handleCancel}
        title="강의 시작 전, 꼭 확인하세요!"
      >
        <div className="space-y-6">
          <p className="text-gray-700">
            Lec-Q의 모든 실시간 강의는 학생 개인정보 보호와 공정한 학습 환경
            유지를 위해 아래 운영 가이드를 반드시 준수해야 합니다. '동의' 후
            강의를 시작하실 수 있습니다.
          </p>

          <div>
            <h3 className="font-semibold text-gray-900 mb-3">
              실시간 강의 운영 유의사항
            </h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start">
                <span className="w-2 h-2 bg-gray-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                <span>수업 목적 이외의 화면 공유, 녹화, 캡처를 금합니다.</span>
              </li>
              <li className="flex items-start">
                <span className="w-2 h-2 bg-gray-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                <span>
                  타인의 질문이나 발언을 무단으로 복제, 인용, 배포하지 않습니다.
                </span>
              </li>
              <li className="flex items-start">
                <span className="w-2 h-2 bg-gray-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                <span>
                  교안, 질문, 채팅 내용은 AI 자동 기록 시스템에 의해
                  저장·분석됩니다.
                </span>
              </li>
              <li className="flex items-start">
                <span className="w-2 h-2 bg-gray-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                <span>
                  부적절한 언행, 비방, 외부 홍보 및 무단 링크 공유를 금합니다.
                </span>
              </li>
              <li className="flex items-start">
                <span className="w-2 h-2 bg-gray-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                <span>
                  네트워크 불안정 시 강의 품질이 저하될 수 있으므로 사전 점검을
                  권장합니다.
                </span>
              </li>
              <li className="flex items-start">
                <span className="w-2 h-2 bg-gray-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                <span>
                  시스템 목적에 맞지 않게 실시간 강의를 이용할 경우 이용이
                  제한될 수 있습니다.
                </span>
              </li>
            </ul>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="agreement"
              checked={isAgreed}
              onChange={(e) => setIsAgreed(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="agreement" className="text-sm text-gray-700">
              위 내용에 동의합니다.
            </label>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              onClick={handleCancel}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors duration-200"
            >
              취소
            </button>
            <button
              onClick={handleAgree}
              disabled={!isAgreed}
              className={`px-4 py-2 rounded-md transition-colors duration-200 ${
                isAgreed
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }`}
            >
              동의
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ProfessorClass;
