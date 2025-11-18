import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  MessageCircle,
  BarChart3,
  Target,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";

const LandingPage: React.FC = () => {
  const sectionRefs = useRef<HTMLDivElement[]>([]);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const isAnimatingRef = useRef(false);
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const navigate = useNavigate();
  const { user, login } = useAuth();

  useEffect(() => {
    if (user) {
      const redirectPath =
        user.role === "professor"
          ? "/professor/dashboard"
          : "/student/dashboard";
      navigate(redirectPath, { replace: true });
      return;
    }

    const rawAuth = localStorage.getItem("lecq.auth");
    if (!rawAuth) return;

    try {
      const parsed = JSON.parse(rawAuth) as {
        id?: string;
        name?: string;
        role?: "student" | "professor";
      };
      if (parsed.id && parsed.name && parsed.role) {
        login({ id: parsed.id, name: parsed.name, role: parsed.role });
      }
    } catch (error) {
      console.warn("잘못된 인증 정보를 초기화합니다.", error);
      localStorage.removeItem("lecq.auth");
    }
  }, [login, navigate, user]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("animate-fade-in-up");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );

    sectionRefs.current.forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const setSectionRef = (index: number) => (el: HTMLDivElement | null) => {
    if (el) sectionRefs.current[index] = el;
  };

  const scrollToIndex = React.useCallback((idx: number) => {
    const max = sectionRefs.current.length - 1;
    const next = idx < 0 ? 0 : idx > max ? max : idx;
    const container = containerRef.current;
    const targetEl = sectionRefs.current[next];
    if (container && targetEl) {
      if (isAnimatingRef.current) return;
      isAnimatingRef.current = true;
      // 우선 스냅 대상 요소로 직접 스크롤 이동
      targetEl.scrollIntoView({
        behavior: "smooth",
        inline: "start",
        block: "nearest",
      });
      setCurrentIndex(next);
      window.setTimeout(() => {
        isAnimatingRef.current = false;
      }, 650);
    }
  }, []);

  const handlePrev = useCallback(() => {
    const target = currentIndex === 0 ? 2 : currentIndex - 1;
    scrollToIndex(target);
  }, [currentIndex, scrollToIndex]);
  const handleNext = useCallback(() => {
    const target = currentIndex === 2 ? 0 : currentIndex + 1;
    scrollToIndex(target);
  }, [currentIndex, scrollToIndex]);

  // 마우스 휠 / 터치 스와이프 핸들링
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    const onWheel = (e: WheelEvent) => {
      // 수평/수직 어느 방향이든 입력을 받아 좌우 이동
      const magnitude = Math.abs(e.deltaX) + Math.abs(e.deltaY);
      if (magnitude < 4) return;
      e.preventDefault();
      if (isAnimatingRef.current) return;
      if (e.deltaX > 0 || e.deltaY > 0) {
        handleNext();
      } else if (e.deltaX < 0 || e.deltaY < 0) {
        handlePrev();
      }
    };

    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0];
      touchStartXRef.current = t.clientX;
      touchStartYRef.current = t.clientY;
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (touchStartXRef.current === null || touchStartYRef.current === null)
        return;
      const t = e.changedTouches[0];
      const dx = t.clientX - touchStartXRef.current;
      const dy = t.clientY - touchStartYRef.current;
      touchStartXRef.current = null;
      touchStartYRef.current = null;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);
      if (absDx < 40 || absDx < absDy) return; // 수평 스와이프만 처리
      e.preventDefault();
      if (isAnimatingRef.current) return;
      if (dx < 0) {
        handleNext();
      } else if (dx > 0) {
        handlePrev();
      }
    };

    root.addEventListener("wheel", onWheel, { passive: false });
    root.addEventListener("touchstart", onTouchStart, { passive: true });
    root.addEventListener("touchend", onTouchEnd, { passive: false });

    return () => {
      root.removeEventListener("wheel", onWheel as EventListener);
      root.removeEventListener("touchstart", onTouchStart as EventListener);
      root.removeEventListener("touchend", onTouchEnd as EventListener);
    };
  }, [currentIndex, handleNext, handlePrev]);

  // 배경 명암에 따른 전역 컨트롤 스타일 (1번 슬라이드는 흰 배경)
  const isLightBackground = currentIndex === 1;
  const arrowContainerClass = isLightBackground
    ? "fixed z-[1000] p-3 rounded-full bg-black/20 hover:bg-black/30 transition-all duration-200 pointer-events-auto"
    : "fixed z-[1000] p-3 rounded-full bg-white/20 hover:bg-white/30 transition-all duration-200 pointer-events-auto";
  const arrowIconClass = isLightBackground
    ? "w-6 h-6 text-slate-900"
    : "w-6 h-6 text-white";
  const dotActiveClass = isLightBackground
    ? "bg-slate-900 border-slate-900"
    : "bg-white border-white";
  const dotInactiveClass = isLightBackground
    ? "border-slate-800/70 bg-transparent"
    : "border-white/80 bg-transparent";

  return (
    <div className="h-screen relative overflow-hidden">
      <div
        ref={containerRef}
        className="w-full h-full overflow-x-auto overflow-y-hidden snap-x snap-mandatory scrollbar-hide"
      >
        <div className="flex w-full h-full">
          {/* 히어로 섹션 */}
          <section
            className="relative opacity-0 will-change-transform w-screen h-screen flex-shrink-0 snap-start"
            ref={setSectionRef(0)}
          >
            {/* 남는 영역을 2FA7FE로 채움 */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ backgroundColor: "#2FA7FE" }}
            ></div>

            {/* 이미지 배경 (세로 높이 축소) */}
            <div
              className="relative bg-cover bg-center bg-no-repeat text-white overflow-hidden py-16"
              style={{ backgroundImage: "url( /landing/blue.svg)" }}
            >
              {/* 네비게이션 화살표 */}
              {/* 화살표는 전역 고정 컨트롤로 이동 */}

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
            </div>
          </section>

          {/* 히어로 하단 특징 4개 섹션 */}
          <section
            className="bg-white opacity-0 will-change-transform w-screen h-screen flex-shrink-0 snap-start"
            ref={setSectionRef(1)}
          >
            <div className="w-full h-full flex flex-col">
              {/* 위: 특징 4개 */}
              <div className="flex-1 flex items-center">
                <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
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
              </div>

              {/* 아래: 강의자 경험 */}
              <div className="flex-1 bg-white">
                <div className="w-full h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                  <h3 className="text-center text-2xl md:text-3xl font-extrabold text-gray-900">
                    강의자를 위한 새로운 수업 경험
                  </h3>
                  <p className="text-center text-gray-500 mt-3 text-base md:text-lg">
                    실시간 참여와 데이터 분석으로 강의가 더 스마트해집니다.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div
                        key={i}
                        className="bg-gray-200 rounded-md h-28 md:h-36"
                      ></div>
                    ))}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8 text-sm md:text-base text-gray-700">
                    <div>
                      <div className="font-bold mb-2 md:mb-3 text-lg">
                        현장 참여도 실시간 확인
                      </div>
                      <p className="text-gray-500 leading-relaxed">
                        학생들의 참여도와 이해도를 대시보드에서 즉시 확인할 수
                        있어요.
                      </p>
                    </div>
                    <div>
                      <div className="font-bold mb-2 md:mb-3 text-lg">
                        데이터 기반 강의 개선
                      </div>
                      <p className="text-gray-500 leading-relaxed">
                        질문 데이터와 피드백을 분석해 강의 품질을 지속적으로
                        향상시켜요.
                      </p>
                    </div>
                    <div>
                      <div className="font-bold mb-2 md:mb-3 text-lg">
                        소통 중심 강의 환경
                      </div>
                      <p className="text-gray-500 leading-relaxed">
                        학생 질문을 효율적으로 관리하고 실시간 응답으로 소통을
                        강화해요.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 학습 방법 섹션 */}
          <section
            className="relative opacity-0 will-change-transform w-screen h-screen flex-shrink-0 snap-start"
            ref={setSectionRef(2)}
          >
            {/* 남는 영역을 FF820C로 채움 */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ backgroundColor: "#FF820C" }}
            ></div>

            {/* 섹션 전체를 상/하로 분할: 위(학습 방법), 아래(푸터 결합) */}
            <div className="relative w-full h-full flex flex-col text-white">
              {/* 위쪽: 학습 방법 콘텐츠 */}
              <div className="flex-1">
                <div
                  className="relative bg-cover bg-center bg-no-repeat overflow-hidden py-12 md:py-16"
                  style={{ backgroundImage: "url(/landing/orange.svg)" }}
                >
                  <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 md:pt-20 lg:pt-40">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                      {/* 왼쪽: 이미지 자리 */}
                      <div className="h-64 md:h-80 flex items-center justify-center"></div>

                      {/* 오른쪽: 텍스트와 액션 */}
                      <div className="space-y-5 md:pl-6">
                        <div className="text-sm font-semibold text-white/80">
                          효율적으로 학습하는 법
                        </div>
                        <h2 className="text-3xl md:text-4xl font-bold leading-tight">
                          집중을 유지하고, 이해를 확장하세요.
                        </h2>
                        <p className="text-white/90 leading-relaxed">
                          실시간 질문, 자동 요약, 강의 집중도 분석까지. Lec-Q가
                          학습의 모든 순간을 도와드립니다.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3">
                          <Link
                            to="/login"
                            className="bg-white/95 hover:bg-white text-orange-600 font-bold py-4 px-8 text-lg md:text-xl rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 ring-2 ring-white/60"
                          >
                            Lec-Q 시작하기
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 아래쪽: 푸터 콘텐츠 결합 */}
              <div className="bg-gray-900 text-gray-300">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                  {/* 팀 정보 섹션 */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
                    {/* 왼쪽: 로고 및 프로젝트 정보 */}
                    <div className="text-center lg:text-left">
                      <div className="flex items-center justify-center lg:justify-start mb-4">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
                          <span className="text-white font-bold text-sm">
                            LQ
                          </span>
                        </div>
                        <span className="text-white font-bold text-xl">
                          Lec-Q
                        </span>
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
                  <div className="pt-8">
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
              </div>
            </div>
          </section>

          {/* 제거됨: 4/5/6번째 슬라이드 (푸터는 3번째에 통합) */}
        </div>
      </div>

      {/* 전역 고정 네비게이션 화살표 (독립 fixed 요소) */}
      <button
        onClick={handlePrev}
        className={`${arrowContainerClass} left-4 top-1/2 -translate-y-1/2 z-[9999]`}
        aria-label="이전 섹션"
      >
        <ChevronLeft className={arrowIconClass} />
      </button>
      <button
        onClick={handleNext}
        className={`${arrowContainerClass} right-4 top-1/2 -translate-y-1/2 z-[9999]`}
        aria-label="다음 섹션"
      >
        <ChevronRight className={arrowIconClass} />
      </button>

      {/* 전역 페이지네이션 점 (3개) - 독립 fixed 요소 */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex space-x-2 pointer-events-auto">
        {Array.from({ length: 3 }).map((_, i) => (
          <button
            key={i}
            onClick={() => scrollToIndex(i)}
            className={`w-2.5 h-2.5 rounded-full border transition-colors ${
              i === currentIndex ? dotActiveClass : dotInactiveClass
            }`}
            aria-label={`섹션 ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

export default LandingPage;
