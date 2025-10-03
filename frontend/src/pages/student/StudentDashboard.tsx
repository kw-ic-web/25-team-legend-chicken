import React from 'react';

const StudentDashboard: React.FC = () => {
  return (
    <div className="student-dashboard">
      <h1>학생 대시보드</h1>
      <div className="dashboard-content">
        <div className="quick-actions">
          <h2>빠른 액션</h2>
          <a href="/student/participate">실시간 참여</a>
          <a href="/student/questions">내 질문 내역</a>
          <a href="/student/reports">강의 요약 리포트</a>
        </div>
        <div className="recent-lectures">
          <h2>최근 강의</h2>
          <p>참여한 강의 목록이 여기에 표시됩니다.</p>
        </div>
        <div className="notifications">
          <h2>알림</h2>
          <p>새로운 알림이 여기에 표시됩니다.</p>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;

