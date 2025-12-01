import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Users, Clock } from "lucide-react";

interface UserInfo {
  id?: string;
  name: string;
  title: string;
  affiliation: string;
  currentLectures?: number;
  profileImage?: string;
}

interface CommonSidebarProps {
  userType: "student" | "professor";
  userInfo: UserInfo;
  upcomingLectures?: Array<{
    title: string;
    time: string;
    countdown: string;
    lectureId?: string;
    classDate?: Date;
  }>;
  myLectures?: Array<{
    title: string;
    participants?: number;
    subtitle?: string;
    meta?: string;
    lectureId?: string;
  }>;
  additionalContent?: React.ReactNode;
}

const CommonSidebar: React.FC<CommonSidebarProps> = ({
  userType,
  userInfo,
  upcomingLectures = [],
  myLectures = [],
  additionalContent,
}) => {
  // 실시간 카운트다운을 위한 현재 시간 상태
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    // 1초마다 현재 시간 업데이트 (실시간 카운트다운)
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);
  // 병합된 강의 개수 계산 (중복 제거 후)
  const mergedCount = React.useMemo(() => {
    const seen = new Set<string>();
    for (const up of upcomingLectures) seen.add(up.title);
    for (const mine of myLectures) seen.add(mine.title);
    return seen.size;
  }, [upcomingLectures, myLectures]);
  const profilePath =
    userType === "professor"
      ? `/professor/profile${userInfo.id ? `/${userInfo.id}` : ""}`
      : `/student/profile${userInfo.id ? `/${userInfo.id}` : ""}`;

  return (
    <div className="fixed top-20 left-0 w-80 bg-white shadow-lg h-[calc(100vh-5rem)] flex flex-col z-10 overflow-y-auto">
      {/* 사용자 프로필 섹션 */}
      <div className="pt-6 pb-4 px-4 md:pt-10 md:px-6 md:pb-6 border-b border-gray-200">
        <div className="flex items-center space-x-3 md:space-x-4 mb-3 md:mb-4">
          <div className="w-12 h-12 md:w-16 md:h-16 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
            {userInfo.profileImage ? (
              <img
                src={userInfo.profileImage}
                alt={userInfo.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <Users className="w-8 h-8 text-gray-600" />
            )}
          </div>
          <div className="min-w-0">
            <h2 className="text-base md:text-lg font-bold text-gray-900 truncate">
              {userInfo.name}
            </h2>
            <p className="text-xs md:text-sm text-gray-600 truncate">
              {userInfo.title}
            </p>
            <p className="text-[10px] md:text-xs text-gray-500 truncate">
              {userInfo.affiliation}
            </p>
            {userInfo.currentLectures && (
              <p className="text-[10px] md:text-xs text-gray-500">
                현재 진행 강의: {userInfo.currentLectures}개
              </p>
            )}
          </div>
        </div>
        {/* 내 정보 버튼 */}
        <Link
          to={profilePath}
          className="w-full bg-[#1F3A93] hover:bg-[#1b327f] text-white font-medium py-1.5 md:py-2 px-4 md:px-6 rounded-lg transition-colors duration-200 block text-center text-sm md:text-base"
        >
          내 정보
        </Link>
      </div>

      {/* 내 강의 + 곧 다가올 강의 병합 섹션 (교수만) */}
      {userType === "professor" &&
        (upcomingLectures.length > 0 || myLectures.length > 0) && (
          <div className="px-4 py-4 md:p-6 border-b border-gray-200">
            <h3 className="text-xs md:text-sm font-semibold text-gray-900 mb-3 md:mb-4">
              내 강의
            </h3>
            <div
              className={`space-y-3 ${mergedCount > 4 ? "max-h-64 overflow-y-auto pr-2" : ""}`}
            >
              {(() => {
                // 1) 두 리스트 병합 (중복 제목 제거, 곧 다가올 강의 우선)
                const merged: Array<{
                  title: string;
                  countdown?: string;
                  time?: string;
                  participants?: number;
                  lectureId?: string;
                }> = [];
                const indexByTitle = new Map<string, number>();
                for (const up of upcomingLectures) {
                  if (indexByTitle.has(up.title)) continue;
                  merged.push({
                    title: up.title,
                    countdown: up.countdown,
                    time: up.time,
                    lectureId: up.lectureId,
                  });
                  indexByTitle.set(up.title, merged.length - 1);
                }
                for (const mine of myLectures) {
                  if (indexByTitle.has(mine.title)) {
                    const idx = indexByTitle.get(mine.title)!;
                    merged[idx] = {
                      ...merged[idx],
                      participants: mine.participants,
                      lectureId: mine.lectureId || merged[idx].lectureId,
                    };
                  } else {
                    merged.push({
                      title: mine.title,
                      participants: mine.participants,
                      lectureId: mine.lectureId,
                    });
                    indexByTitle.set(mine.title, merged.length - 1);
                  }
                }
                // 2) 렌더링
                return merged.map((item, idx) => {
                  const lectureId = item.lectureId;
                  const content = (
                    <>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 min-w-0">
                          {(item.countdown && item.time) ||
                          typeof item.participants !== "number" ? (
                            <Clock className="w-4 h-4 text-gray-400" />
                          ) : (
                            <Users className="w-4 h-4 text-gray-400" />
                          )}
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {item.title}
                          </p>
                        </div>
                        {typeof item.participants === "number" && (
                          <div className="flex items-center space-x-1">
                            <Users className="w-4 h-4 text-gray-400" />
                            <span className="text-xs text-gray-500">
                              {item.participants}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-500 mt-0.5">
                        <span>
                          {item.countdown && item.time
                            ? `${item.countdown}  ${item.time}`
                            : ""}
                        </span>
                      </div>
                    </>
                  );

                  return lectureId ? (
                    <Link
                      key={`${item.title}-${idx}`}
                      to={`/professor/courses/${lectureId}`}
                      className="block hover:bg-gray-50 rounded-lg p-2 -m-2 transition-colors cursor-pointer"
                    >
                      {content}
                    </Link>
                  ) : (
                    <div key={`${item.title}-${idx}`} className="">
                      {content}
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        )}

      {/* 학생 내 강의 섹션 */}
      {userType === "student" && myLectures.length > 0 && (
        <div className="px-4 py-4 md:p-6 border-b border-gray-200">
          <h3 className="text-xs md:text-sm font-semibold text-gray-900 mb-3 md:mb-4">
            내 강의
          </h3>
          <div className="space-y-3 max-h-40 overflow-y-auto pr-2">
            {myLectures.map((lecture, idx) => {
              const lectureId = lecture.lectureId;
              const content = (
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 min-w-0">
                      <Users className="w-4 h-4 text-gray-400" />
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {lecture.title}
                      </p>
                    </div>
                    {typeof lecture.participants === "number" && (
                      <div className="flex items-center space-x-1">
                        <Users className="w-4 h-4 text-gray-400" />
                        <span className="text-xs text-gray-500">
                          {lecture.participants}
                        </span>
                      </div>
                    )}
                  </div>
                  {lecture.subtitle && (
                    <div className="flex items-center justify-between text-xs text-gray-500 mt-0.5">
                      <span className="truncate">{lecture.subtitle}</span>
                    </div>
                  )}
                </>
              );

              return lectureId ? (
                <Link
                  key={`${lecture.title}-${idx}`}
                  to={`/student/courses/${lectureId}`}
                  className="block hover:bg-gray-50 rounded-lg p-2 -m-2 transition-colors cursor-pointer"
                >
                  {content}
                </Link>
              ) : (
                <div key={`${lecture.title}-${idx}`} className="">
                  {content}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 학생용 "가장 임박한 강의" 표시 */}
      {userType === "student" &&
        upcomingLectures &&
        upcomingLectures.length > 0 && (
          <div className="px-4 pt-4 pb-3 md:px-6 md:pt-6 border-b border-gray-200">
            <div className="mb-2 text-center">
              {(() => {
                // 실시간으로 가장 가까운 강의 계산
                const now = currentTime;
                const validLectures = upcomingLectures
                  .map((lecture) => {
                    const classDate = lecture.classDate;
                    if (!classDate) {
                      // classDate가 없으면 기존 countdown 사용
                      return lecture;
                    }

                    if (classDate <= now) {
                      return null; // 지난 강의는 제외
                    }

                    // 날짜만 비교하여 정확한 일수 계산
                    const nowDate = new Date(
                      now.getFullYear(),
                      now.getMonth(),
                      now.getDate()
                    );
                    const classDateOnly = new Date(
                      classDate.getFullYear(),
                      classDate.getMonth(),
                      classDate.getDate()
                    );
                    const diffDays = Math.ceil(
                      (classDateOnly.getTime() - nowDate.getTime()) /
                        (1000 * 60 * 60 * 24)
                    );

                    if (diffDays < 0 || diffDays > 7) {
                      return null; // 지난 강의나 7일 넘어가면 제외
                    }

                    const hours = classDate.getHours();
                    const minutes = classDate.getMinutes();
                    const timeStr = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;

                    return {
                      ...lecture,
                      countdown: `D-${diffDays}`,
                      time: timeStr,
                      classDate: classDate,
                    };
                  })
                  .filter(
                    (lecture): lecture is NonNullable<typeof lecture> =>
                      lecture !== null
                  );

                if (validLectures.length === 0) {
                  return null;
                }

                // 날짜 순으로 정렬
                const sorted = validLectures.sort((a, b) => {
                  if (a.classDate && b.classDate) {
                    return a.classDate.getTime() - b.classDate.getTime();
                  }
                  // fallback
                  const toNum = (d: string) => {
                    const m = d.match(/\d+/);
                    return m ? parseInt(m[0], 10) : Number.MAX_SAFE_INTEGER;
                  };
                  const dn = toNum(a.countdown) - toNum(b.countdown);
                  if (dn !== 0) return dn;
                  return a.time.localeCompare(b.time);
                });

                const next = sorted[0];
                return (
                  <>
                    <div className="text-[11px] text-red-700 font-semibold mb-0.5">
                      가장 임박한 강의
                    </div>
                    <div className="text-xs text-gray-600">
                      {next.countdown} · {next.time}
                    </div>
                    <div className="text-sm font-semibold text-gray-900 truncate">
                      "{next.title}"
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        )}

      {/* 학생용 액션 버튼들 */}
      {userType === "student" && (
        <div className="px-4 py-4 md:p-6 space-y-3">
          <Link
            to="/student/questions"
            className="w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-3 md:py-3 md:px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2 text-sm md:text-base"
          >
            <Clock className="w-4 h-4 md:w-5 md:h-5" />
            <span>내 질문 보기</span>
          </Link>
        </div>
      )}

      {/* 추가 콘텐츠 */}
      {userType === "student" && additionalContent ? (
        <div className="flex-1 min-h-0 overflow-hidden">
          {additionalContent}
        </div>
      ) : (
        additionalContent
      )}
    </div>
  );
};

export default CommonSidebar;
