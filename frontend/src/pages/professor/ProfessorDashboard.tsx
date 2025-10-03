import React from 'react';

const ProfessorDashboard: React.FC = () => {
  return (
    <div className="professor-dashboard">
      <h1>교수자 대시보드</h1>
      <div className="dashboard-content">
        <div className="quick-actions">
          <h2>빠른 액션</h2>
          <a href="/professor/create-lecture">강의 개설</a>
          <a href="/professor/manage-lectures">강의 관리</a>
          <a href="/professor/realtime-dashboard">실시간 대시보드</a>
          <a href="/professor/analysis">강의 분석 및 리포트</a>
        </div>
        
        <div className="lecture-stats">
          <h2>강의 통계</h2>
          <div className="stats-grid">
            <div className="stat-item">
              <h3>진행중인 강의</h3>
              <span className="stat-number">3</span>
            </div>
            <div className="stat-item">
              <h3>총 강의 수</h3>
              <span className="stat-number">12</span>
            </div>
            <div className="stat-item">
              <h3>총 학생 수</h3>
              <span className="stat-number">156</span>
            </div>
            <div className="stat-item">
              <h3>오늘 질문 수</h3>
              <span className="stat-number">8</span>
            </div>
          </div>
        </div>
        
        <div className="recent-activity">
          <h2>최근 활동</h2>
          <p>최근 강의 활동이 여기에 표시됩니다.</p>
        </div>
      </div>
    </div>
  );
};

export default ProfessorDashboard;

