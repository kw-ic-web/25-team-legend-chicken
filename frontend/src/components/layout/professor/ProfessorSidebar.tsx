import React from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import CommonSidebar from "../CommonSidebar";

const ProfessorSidebar: React.FC = () => {
  // 교수 정보
  const professorInfo = {
    name: "김철수",
    title: "강의자",
    affiliation: "광운대학교 정보융합학부",
    currentLectures: 13,
  };

  // 곧 다가올 강의
  const upcomingLectures = [
    {
      title: "프로그래밍 시작하기: 파이썬 입문",
      time: "14:00",
      countdown: "D-1",
    },
    { title: "웹 개발 기초", time: "15:00", countdown: "D-3" },
    { title: "데이터베이스 설계", time: "16:00", countdown: "D-5" },
  ];

  // 내 강의 목록
  const myLectures = [
    { title: "프로그래밍 시작하기: 파이썬 입문", participants: 30 },
    { title: "웹 개발 기초", participants: 20 },
    { title: "데이터베이스 설계", participants: 12 },
    { title: "머신러닝 입문", participants: 25 },
  ];

  return (
    <CommonSidebar
      userType="professor"
      userInfo={professorInfo}
      upcomingLectures={upcomingLectures}
      myLectures={myLectures}
      additionalContent={
        <div className="px-6 pt-3 pb-6">
          <Link
            to="/professor/create-lecture"
            className="w-full border-2 border-[#3A6EFF] text-[#3A6EFF] font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2 hover:bg-[#3A6EFF] hover:text-white"
          >
            <Plus className="w-5 h-5" />
            <span>새로운 강좌 만들기</span>
          </Link>
        </div>
      }
    />
  );
};

export default ProfessorSidebar;
