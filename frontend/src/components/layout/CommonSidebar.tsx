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
  upcomingLectures?: Array<{
    title: string;
    time: string;
    countdown: string;
  }>;
  myLectures?: Array<{
    title: string;
    participants: number;
  }>;
}

const CommonSidebar: React.FC<CommonSidebarProps> = ({
  userType,
  userInfo,
  upcomingLectures = [],
  myLectures = [],
}) => {
  return (
    <div className="w-80 bg-white shadow-lg h-full overflow-y-auto">
      {/* 사용자 프로필 섹션 */}
      <div className="p-6 border-b border-gray-200">
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
      </div>

      {/* 곧 다가올 강의 (교수만) */}
      {userType === "professor" && upcomingLectures.length > 0 && (
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            곧 다가올 강의
          </h3>
          <div className="space-y-3">
            {upcomingLectures.map((lecture, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {lecture.title}
                  </p>
                  <p className="text-xs text-gray-500">{lecture.time}</p>
                </div>
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                  {lecture.countdown}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 내 강의 목록 */}
      {myLectures.length > 0 && (
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            내 강의 목록
          </h3>
          <div className="space-y-3 max-h-48 overflow-y-auto">
            {myLectures.map((lecture, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {lecture.title}
                  </p>
                </div>
                <div className="flex items-center space-x-1">
                  <Users className="w-4 h-4 text-gray-400" />
                  <span className="text-xs text-gray-500">
                    {lecture.participants}+
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 실시간 방송 시작하기 버튼 (교수만) */}
      {userType === "professor" && (
        <div className="p-6">
          <Link
            to="/professor/realtime-dashboard"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
          >
            <Play className="w-5 h-5" />
            <span>실시간 방송 시작하기</span>
          </Link>
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
    </div>
  );
};

export default CommonSidebar;
