import React, { useState } from 'react';

const RealTimeParticipation: React.FC = () => {
  const [question, setQuestion] = useState('');
  const [questions, setQuestions] = useState<string[]>([]);

  const handleSubmitQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (question.trim()) {
      setQuestions([...questions, question]);
      setQuestion('');
    }
  };

  return (
    <div className="real-time-participation">
      <h1>실시간 참여</h1>
      <div className="participation-content">
        <div className="lecture-info">
          <h2>현재 강의 정보</h2>
          <p>강의명: [강의명]</p>
          <p>교수: [교수명]</p>
          <p>시간: [강의 시간]</p>
        </div>
        
        <div className="question-section">
          <h2>질문하기</h2>
          <form onSubmit={handleSubmitQuestion}>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="강의에 대한 질문을 입력하세요..."
              rows={4}
            />
            <button type="submit">질문 등록</button>
          </form>
        </div>

        <div className="questions-list">
          <h2>내 질문 목록</h2>
          {questions.length === 0 ? (
            <p>아직 질문이 없습니다.</p>
          ) : (
            <ul>
              {questions.map((q, index) => (
                <li key={index}>{q}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default RealTimeParticipation;

