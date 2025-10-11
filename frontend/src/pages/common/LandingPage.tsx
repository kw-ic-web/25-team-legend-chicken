import React from "react";
import { Link } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  MessageCircle,
  BarChart3,
  Target,
} from "lucide-react";

const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen">
      {/* 히어로 섹션 */}
      <section className="relative">
        {/* 남는 영역을 2FA7FE로 채움 */}
        <div
          className="absolute inset-0"
          style={{ backgroundColor: "#2FA7FE" }}
        ></div>

        {/* 이미지 배경 (세로 높이 축소) */}
        <div
          className="relative bg-cover bg-center bg-no-repeat text-white overflow-hidden py-16"
          style={{ backgroundImage: "url( /landing/blue.svg)" }}
        >
          {/* 네비게이션 화살표 */}
          <button className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full p-3 transition-all duration-200">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full p-3 transition-all duration-200">
            <ChevronRight className="w-6 h-6" />
          </button>

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="flex flex-col lg:flex-row items-start lg:items-center min-h-[600px]">
              {/* 왼쪽 - 텍스트 콘텐츠 */}
              <div className="flex-1 space-y-6 lg:pr-12">
                {/* 상단 제목 */}
                <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white">
                  새로워진 AI 학습 보조 플랫폼,{" "}
                  <span className="text-white">Lec-Q</span>
                </h1>

                {/* 메인 헤드라인 */}
                <div className="space-y-2">
                  <div className="text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-tight">
                    강의 집중과
                  </div>
                  <div className="text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-tight">
                    이해가 쑥쑥!
                  </div>
                </div>

                {/* 설명 */}
                <div className="space-y-1 text-lg text-white">
                  <p>필기 부담은 줄이고, 강의 몰입도는 높이고</p>
                  <p>실시간 질문과 AI 답변으로 이해를 확장하는</p>
                  <p>스마트 학습 플랫폼, Lec-Q입니다.</p>
                </div>

                {/* CTA 버튼들 */}
                <div className="mt-6 space-x-4">
                  <Link
                    to="/login"
                    className="inline-block bg-white/90 hover:bg-white text-blue-700 font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
                  >
                    로그인
                  </Link>
                  <Link
                    to="/register"
                    className="inline-block bg-transparent hover:bg-white/10 text-white font-semibold py-3 px-6 rounded-lg border border-white/70 transition-colors duration-200"
                  >
                    회원가입
                  </Link>
                </div>
              </div>

              {/* 오른쪽 - 사람 이미지 자리 */}
              <div className="flex-shrink-0 mt-8 lg:mt-0"></div>
            </div>
          </div>

          {/* 페이지네이션 점들 */}
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex space-x-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full ${i === 3 ? "bg-white" : "border border-white"}`}
              ></div>
            ))}
          </div>
        </div>
      </section>

      {/* 히어로 하단 특징 4개 섹션 */}
      <section className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              {
                title: "자동 필기 요약",
                desc: "강의 내용을 AI로 요약",
                icon: FileText,
              },
              {
                title: "실시간 질문·AI 답변",
                desc: "모르는 건 바로 해결",
                icon: MessageCircle,
              },
              {
                title: "데이터 기반 학습 분석",
                desc: "학습 패턴 시각화",
                icon: BarChart3,
              },
              {
                title: "강의자 대시보드 지원",
                desc: "진행도와 이슈 관리",
                icon: Target,
              },
            ].map((item, idx) => {
              const IconComponent = item.icon;
              return (
                <div
                  key={idx}
                  className="flex items-start md:items-center md:flex-col gap-4 md:gap-3"
                >
                  <div className="shrink-0 w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mx-auto md:mx-auto">
                    <IconComponent className="w-6 h-6" />
                  </div>
                  <div className="text-left md:text-center">
                    <div className="text-base font-semibold text-gray-900 mb-2">
                      {item.title}
                    </div>
                    <div className="text-sm text-gray-500 leading-relaxed">
                      {item.desc}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 학습 방법 섹션 */}
      <section className="relative">
        {/* 남는 영역을 FF820C로 채움 */}
        <div
          className="absolute inset-0"
          style={{ backgroundColor: "#FF820C" }}
        ></div>

        {/* 2컬럼 콘텐츠가 있는 이미지 배경 */}
        <div
          className="relative bg-cover bg-center bg-no-repeat text-white overflow-hidden py-16"
          style={{ backgroundImage: "url(/landing/orange.svg)" }}
        >
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
              {/* 왼쪽: 이미지 자리 */}
              <div className="h-72 md:h-96  flex items-center justify-center"></div>

              {/* 오른쪽: 텍스트와 액션 */}
              <div className="space-y-5 md:pl-6">
                <div className="text-sm font-semibold text-white/80">
                  효율적으로 학습하는 법
                </div>
                <h2 className="text-3xl md:text-4xl font-bold leading-tight">
                  집중을 유지하고, 이해를 확장하세요.
                </h2>
                <p className="text-white/90 leading-relaxed">
                  실시간 질문, 자동 요약, 강의 집중도 분석까지. Lec-Q가 학습의
                  모든 순간을 도와드립니다.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Link
                    to="/student/realtime"
                    className="bg-white/90 hover:bg-white text-orange-600 font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
                  >
                    실시간 참여 시작
                  </Link>
                  <Link
                    to="/professor/lectures/create"
                    className="bg-transparent hover:bg-white/10 text-white font-semibold py-3 px-6 rounded-lg border border-white/70 transition-colors duration-200"
                  >
                    강의 개설하기
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 강의자를 위한 새로운 수업 경험 섹션 */}
      <section className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <h3 className="text-center text-2xl md:text-3xl font-extrabold text-gray-900">
            강의자를 위한 새로운 수업 경험
          </h3>
          <p className="text-center text-gray-500 mt-4 text-lg">
            실시간 참여와 데이터 분석으로 강의가 더 스마트해집니다.
          </p>

          {/* 이미지 플레이스홀더 3개 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-gray-200 rounded-md h-36"></div>
            ))}
          </div>

          {/* 설명 텍스트 3개 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mt-10 text-base text-gray-700">
            <div>
              <div className="font-bold mb-3 text-lg">
                현장 참여도 실시간 확인
              </div>
              <p className="text-gray-500 leading-relaxed">
                학생들의 참여도와 이해도를 대시보드에서 즉시 확인할 수 있어요.
              </p>
            </div>
            <div>
              <div className="font-bold mb-3 text-lg">
                데이터 기반 강의 개선
              </div>
              <p className="text-gray-500 leading-relaxed">
                질문 데이터와 피드백을 분석해 강의 품질을 지속적으로 향상시켜요.
              </p>
            </div>
            <div>
              <div className="font-bold mb-3 text-lg">소통 중심 강의 환경</div>
              <p className="text-gray-500 leading-relaxed">
                학생 질문을 효율적으로 관리하고 실시간 응답으로 소통을 강화해요.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 공부 습관 섹션 (큰 미디어) */}
      <section className="bg-blue-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <h3 className="text-center text-xl md:text-2xl font-extrabold">
            공부 습관이 달라지면, 성과도 달라집니다
          </h3>
          <p className="text-center text-white/80 mt-2">
            개인 기록과 데이터를 분석으로 학습 루틴을 최적화하세요.
          </p>
          {/* 큰 미디어 플레이스홀더 */}
          <div className="mt-8 flex justify-center">
            <div className="w-full md:w-3/4 aspect-video bg-gray-300 rounded-md flex items-center justify-center">
              <span className="text-gray-600">
                여기에 미디어(차트/영상) 영역
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 푸터 */}
      <footer className="bg-gray-900 text-gray-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* 팀 정보 섹션 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
            {/* 왼쪽: 로고 및 프로젝트 정보 */}
            <div className="text-center lg:text-left">
              <div className="flex items-center justify-center lg:justify-start mb-4">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
                  <span className="text-white font-bold text-sm">LQ</span>
                </div>
                <span className="text-white font-bold text-xl">Lec-Q</span>
              </div>
              <h4 className="text-white font-semibold text-lg mb-2">
                웹서비스설계및실습
              </h4>
              <p className="text-gray-400 text-sm">
                AI 기반 스마트 학습 플랫폼 개발 프로젝트
              </p>
            </div>

            {/* 중간: 프론트엔드 팀 */}
            <div className="text-center">
              <h5 className="text-white font-medium mb-4">Frontend</h5>
              <div className="space-y-2">
                <div className="text-gray-300">천성윤</div>
                <div className="text-gray-300">유아름</div>
              </div>
            </div>

            {/* 오른쪽: 백엔드 팀 */}
            <div className="text-center">
              <h5 className="text-white font-medium mb-4">Backend</h5>
              <div className="space-y-2">
                <div className="text-gray-300">박현우</div>
                <div className="text-gray-300">지민서</div>
              </div>
            </div>
          </div>

          {/* 하단 구분선 및 저작권 */}
          <div className=" pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="text-gray-400 text-sm">
                © 2025 Lec-Q. All rights reserved.
              </div>
              <div className="flex space-x-6 mt-4 md:mt-0">
                <a
                  href="#"
                  className="text-gray-400 hover:text-white text-sm transition-colors"
                >
                  개인정보처리방침
                </a>
                <a
                  href="#"
                  className="text-gray-400 hover:text-white text-sm transition-colors"
                >
                  이용약관
                </a>
                <a
                  href="#"
                  className="text-gray-400 hover:text-white text-sm transition-colors"
                >
                  쿠키 정책
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
