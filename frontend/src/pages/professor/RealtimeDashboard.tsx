import React, { useState, useEffect } from 'react';

interface Question {
  id: number;
  studentName: string;
  question: string;
  timestamp: string;
  status: 'pending' | 'answered' | 'dismissed';
}

interface LectureStats {
  totalStudents: number;
  activeStudents: number;
  totalQuestions: number;
  pendingQuestions: number;
}

const RealtimeDashboard: React.FC = () => {
  const [currentLecture] = useState({
    title: '데이터베이스 개론',
    professor: '김교수',
    startTime: '09:00',
    endTime: '10:30'
  });

  const [stats, setStats] = useState<LectureStats>({
    totalStudents: 45,
    activeStudents: 42,
    totalQuestions: 8,
    pendingQuestions: 3
  });

  const [questions, setQuestions] = useState<Question[]>([
    {
      id: 1,
      studentName: '김학생',
      question: '정규화가 무엇인지 설명해주세요.',
      timestamp: '09:15',
      status: 'pending'
    },
    {
      id: 2,
      studentName: '이학생',
      question: '1NF와 2NF의 차이점은 무엇인가요?',
      timestamp: '09:20',
      status: 'answered'
    },
    {
      id: 3,
      studentName: '박학생',
      question: 'ER 모델에서 관계의 종류는?',
      timestamp: '09:25',
      status: 'pending'
    }
  ]);

  const handleAnswerQuestion = (questionId: number) => {
    setQuestions(questions.map(q => 
      q.id === questionId ? { ...q, status: 'answered' as const } : q
    ));
    setStats(prev => ({
      ...prev,
      pendingQuestions: prev.pendingQuestions - 1
    }));
  };

  const handleDismissQuestion = (questionId: number) => {
    setQuestions(questions.map(q => 
      q.id === questionId ? { ...q, status: 'dismissed' as const } : q
    ));
    setStats(prev => ({
      ...prev,
      pendingQuestions: prev.pendingQuestions - 1
    }));
  };

  // 실시간 업데이트 시뮬레이션
  useEffect(() => {
    const interval = setInterval(() => {
      // 실제로는 WebSocket이나 API 호출로 실시간 데이터를 받아옴
      console.log('실시간 데이터 업데이트');
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="realtime-dashboard">
      <h1>실시간 대시보드</h1>
      
      <div className="lecture-info">
        <h2>현재 강의</h2>
        <div className="lecture-details">
          <p><strong>강의명:</strong> {currentLecture.title}</p>
          <p><strong>교수:</strong> {currentLecture.professor}</p>
          <p><strong>시간:</strong> {currentLecture.startTime} ~ {currentLecture.endTime}</p>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <h3>총 수강생</h3>
          <span className="stat-number">{stats.totalStudents}</span>
        </div>
        <div className="stat-card">
          <h3>활성 수강생</h3>
          <span className="stat-number">{stats.activeStudents}</span>
        </div>
        <div className="stat-card">
          <h3>총 질문 수</h3>
          <span className="stat-number">{stats.totalQuestions}</span>
        </div>
        <div className="stat-card">
          <h3>대기 중인 질문</h3>
          <span className="stat-number pending">{stats.pendingQuestions}</span>
        </div>
      </div>

      <div className="questions-section">
        <h2>실시간 질문</h2>
        <div className="questions-list">
          {questions.filter(q => q.status === 'pending').length === 0 ? (
            <p>대기 중인 질문이 없습니다.</p>
          ) : (
            <div className="questions-container">
              {questions
                .filter(q => q.status === 'pending')
                .map((question) => (
                  <div key={question.id} className="question-item">
                    <div className="question-header">
                      <span className="student-name">{question.studentName}</span>
                      <span className="timestamp">{question.timestamp}</span>
                    </div>
                    <div className="question-content">
                      <p>{question.question}</p>
                    </div>
                    <div className="question-actions">
                      <button 
                        onClick={() => handleAnswerQuestion(question.id)}
                        className="btn-primary"
                      >
                        답변하기
                      </button>
                      <button 
                        onClick={() => handleDismissQuestion(question.id)}
                        className="btn-secondary"
                      >
                        답변 생략
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      <div className="answered-questions">
        <h2>답변 완료된 질문</h2>
        <div className="questions-list">
          {questions
            .filter(q => q.status === 'answered')
            .map((question) => (
              <div key={question.id} className="question-item answered">
                <div className="question-header">
                  <span className="student-name">{question.studentName}</span>
                  <span className="timestamp">{question.timestamp}</span>
                  <span className="status">답변완료</span>
                </div>
                <div className="question-content">
                  <p>{question.question}</p>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default RealtimeDashboard;

