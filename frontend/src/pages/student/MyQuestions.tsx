import React, { useState } from 'react';

interface Question {
  id: number;
  lectureName: string;
  question: string;
  timestamp: string;
  status: 'pending' | 'answered' | 'rejected';
  answer?: string;
}

const MyQuestions: React.FC = () => {
  const [questions] = useState<Question[]>([
    {
      id: 1,
      lectureName: '데이터베이스 개론',
      question: '정규화가 무엇인지 설명해주세요.',
      timestamp: '2024-01-15 14:30',
      status: 'answered',
      answer: '정규화는 데이터베이스의 중복을 제거하고 데이터의 일관성을 보장하는 과정입니다.'
    },
    {
      id: 2,
      lectureName: '웹 프로그래밍',
      question: 'React와 Vue의 차이점은 무엇인가요?',
      timestamp: '2024-01-14 16:45',
      status: 'pending'
    }
  ]);

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return '대기중';
      case 'answered': return '답변완료';
      case 'rejected': return '거부됨';
      default: return status;
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'pending': return 'status-pending';
      case 'answered': return 'status-answered';
      case 'rejected': return 'status-rejected';
      default: return '';
    }
  };

  return (
    <div className="my-questions">
      <h1>내 질문 내역</h1>
      <div className="questions-list">
        {questions.length === 0 ? (
          <p>질문 내역이 없습니다.</p>
        ) : (
          <div className="questions-container">
            {questions.map((q) => (
              <div key={q.id} className="question-item">
                <div className="question-header">
                  <h3>{q.lectureName}</h3>
                  <span className={`status ${getStatusClass(q.status)}`}>
                    {getStatusText(q.status)}
                  </span>
                </div>
                <div className="question-content">
                  <p><strong>질문:</strong> {q.question}</p>
                  <p><strong>등록시간:</strong> {q.timestamp}</p>
                  {q.answer && (
                    <div className="answer">
                      <p><strong>답변:</strong> {q.answer}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyQuestions;

