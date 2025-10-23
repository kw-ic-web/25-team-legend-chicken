import React from "react";
import CommonSidebar from "../CommonSidebar";

const StudentSidebar: React.FC = () => {
  // 학생 정보
  const studentInfo = {
    name: "이학생",
    title: "학생",
    affiliation: "광운대학교 정보융합학부",
  };

  // 참여 중인 강의
  const myLectures = [
    { title: "프로그래밍 시작하기: 파이썬 입문", participants: 30 },
    { title: "웹 개발 기초", participants: 20 },
    { title: "데이터베이스 설계", participants: 12 },
  ];

  return (
    <CommonSidebar
      userType="student"
      userInfo={studentInfo}
      myLectures={myLectures}
    />
  );
};

export default StudentSidebar;
