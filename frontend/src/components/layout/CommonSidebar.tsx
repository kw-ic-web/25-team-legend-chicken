import React from "react";
import { Link } from "react-router-dom";
import { Users, Clock, BookOpen, Play } from "lucide-react";

interface CommonSidebarProps {
  userType: "student" | "professor";
  userInfo: {
    name: string;
    title: string;
    affiliation: string;
    currentLectures?: number;
  };
  showBroadcastControls?: boolean;
  upcomingLectures?: Array<{
    title: string;
    time: string;
    countdown: string;
  }>;
  myLectures?: Array<{
    title: string;
    participants: number;
  }>;
  additionalContent?: React.ReactNode;
  onStartBroadcast?: () => void;
}

const CommonSidebar: React.FC<CommonSidebarProps> = ({
  userType,
  userInfo,
  showBroadcastControls = true,
  upcomingLectures = [],
  myLectures = [],
  additionalContent,
  onStartBroadcast,
}) => {
  // 병합된 강의 개수 계산 (중복 제거 후)
  const mergedCount = React.useMemo(() => {
    const seen = new Set<string>();
    for (const up of upcomingLectures) seen.add(up.title);
    for (const mine of myLectures) seen.add(mine.title);
    return seen.size;
  }, [upcomingLectures, myLectures]);
  return (
    <div className="w-80 bg-white shadow-lg h-[calc(100vh-4rem)] overflow-y-auto flex flex-col">
      {/* 사용자 프로필 섹션 */}
      <div className="pt-10 p-6 border-b border-gray-200">
        <div className="flex items-center space-x-4 mb-4">
          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
            <Users className="w-8 h-8 text-gray-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">{userInfo.name}</h2>
            <p className="text-sm text-gray-600">{userInfo.title}</p>
            <p className="text-xs text-gray-500">{userInfo.affiliation}</p>
            {userInfo.currentLectures && (
              <p className="text-xs text-gray-500">
                현재 진행 강의: {userInfo.currentLectures}개
              </p>
            )}
          </div>
        </div>
        {/* 내 정보 버튼 (교수 전용) */}
        {userType === "professor" && (
          <Link
            to="/professor/profile"
            className="w-full bg-[#1F3A93] hover:bg-[#1b327f] text-white font-medium py-2 px-6 rounded-lg transition-colors duration-200 block text-center"
          >
            내 정보
          </Link>
        )}
      </div>

      {/* 내 강의 + 곧 다가올 강의 병합 섹션 (교수만) */}
      {userType === "professor" &&
        (upcomingLectures.length > 0 || myLectures.length > 0) && (
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">
              내 강의
            </h3>
            <div
              className={`space-y-3 ${mergedCount > 3 ? "max-h-32 overflow-y-auto" : ""}`}
            >
              {(() => {
                // 1) 두 리스트 병합 (중복 제목 제거, 곧 다가올 강의 우선)
                const merged: Array<{
                  title: string;
                  countdown?: string;
                  time?: string;
                  participants?: number;
                }> = [];
                const indexByTitle = new Map<string, number>();
                for (const up of upcomingLectures) {
                  if (indexByTitle.has(up.title)) continue;
                  merged.push({
                    title: up.title,
                    countdown: up.countdown,
                    time: up.time,
                  });
                  indexByTitle.set(up.title, merged.length - 1);
                }
                for (const mine of myLectures) {
                  if (indexByTitle.has(mine.title)) {
                    const idx = indexByTitle.get(mine.title)!;
                    merged[idx] = {
                      ...merged[idx],
                      participants: mine.participants,
                    };
                  } else {
                    merged.push({
                      title: mine.title,
                      participants: mine.participants,
                    });
                    indexByTitle.set(mine.title, merged.length - 1);
                  }
                }
                // 2) 렌더링
                return merged.map((item, idx) => (
                  <div key={`${item.title}-${idx}`} className="">
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
                            {item.participants}+
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
                  </div>
                ));
              })()}
            </div>
          </div>
        )}

      {/* 실시간 방송 시작하기 버튼 (교수만) */}
      {userType === "professor" && showBroadcastControls && (
        <div className="px-6 pt-6 pb-3">
          {upcomingLectures && upcomingLectures.length > 0 && (
            <div className="mb-2 text-center">
              {(() => {
                const toNum = (d: string) => {
                  const m = d.match(/\d+/);
                  return m ? parseInt(m[0], 10) : Number.MAX_SAFE_INTEGER;
                };
                const sorted = [...upcomingLectures].sort((a, b) => {
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
                      “{next.title}”
                    </div>
                  </>
                );
              })()}
            </div>
          )}
          {onStartBroadcast ? (
            <button
              onClick={onStartBroadcast}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
            >
              <Play className="w-5 h-5" />
              <span>
                {upcomingLectures && upcomingLectures.length > 0
                  ? "방송 시작하기"
                  : "실시간 방송 시작하기"}
              </span>
            </button>
          ) : (
            <Link
              to="/professor/realtime-dashboard"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
            >
              <Play className="w-5 h-5" />
              <span>
                {upcomingLectures && upcomingLectures.length > 0
                  ? "방송 시작하기"
                  : "실시간 방송 시작하기"}
              </span>
            </Link>
          )}
        </div>
      )}

      {/* 학생용 액션 버튼들 */}
      {userType === "student" && (
        <div className="p-6 space-y-3">
          <Link
            to="/student/participate"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
          >
            <BookOpen className="w-5 h-5" />
            <span>강의 참여하기</span>
          </Link>
          <Link
            to="/student/questions"
            className="w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
          >
            <Clock className="w-5 h-5" />
            <span>내 질문 보기</span>
          </Link>
        </div>
      )}

      {/* 추가 콘텐츠 */}
      {additionalContent}
    </div>
  );
};

export default CommonSidebar;
