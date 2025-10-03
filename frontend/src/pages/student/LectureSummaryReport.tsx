import React, { useState } from 'react';

interface LectureReport {
  id: number;
  lectureName: string;
  professor: string;
  date: string;
  summary: string;
  keyPoints: string[];
  questions: string[];
  attendance: boolean;
}

const LectureSummaryReport: React.FC = () => {
  const [reports] = useState<LectureReport[]>([
    {
      id: 1,
      lectureName: '데이터베이스 개론',
      professor: '김교수',
      date: '2024-01-15',
      summary: '데이터베이스의 기본 개념과 정규화에 대해 학습했습니다.',
      keyPoints: [
        '데이터베이스의 정의와 특징',
        '정규화의 목적과 과정',
        'ER 모델링의 기본 개념'
      ],
      questions: [
        '정규화가 무엇인지 설명해주세요.',
        '1NF, 2NF, 3NF의 차이점은 무엇인가요?'
      ],
      attendance: true
    },
    {
      id: 2,
      lectureName: '웹 프로그래밍',
      professor: '이교수',
      date: '2024-01-14',
      summary: 'React의 기본 개념과 컴포넌트 구조에 대해 학습했습니다.',
      keyPoints: [
        'React의 가상 DOM 개념',
        '컴포넌트 기반 개발',
        'Props와 State의 차이점'
      ],
      questions: [
        'React와 Vue의 차이점은 무엇인가요?'
      ],
      attendance: true
    }
  ]);

  return (
    <div className="lecture-summary-report">
      <h1>강의 요약 리포트</h1>
      <div className="reports-list">
        {reports.length === 0 ? (
          <p>리포트가 없습니다.</p>
        ) : (
          <div className="reports-container">
            {reports.map((report) => (
              <div key={report.id} className="report-item">
                <div className="report-header">
                  <h3>{report.lectureName}</h3>
                  <div className="report-meta">
                    <span>교수: {report.professor}</span>
                    <span>날짜: {report.date}</span>
                    <span className={`attendance ${report.attendance ? 'present' : 'absent'}`}>
                      {report.attendance ? '출석' : '결석'}
                    </span>
                  </div>
                </div>
                
                <div className="report-content">
                  <div className="summary-section">
                    <h4>강의 요약</h4>
                    <p>{report.summary}</p>
                  </div>
                  
                  <div className="key-points-section">
                    <h4>핵심 포인트</h4>
                    <ul>
                      {report.keyPoints.map((point, index) => (
                        <li key={index}>{point}</li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className="questions-section">
                    <h4>질문 내역</h4>
                    {report.questions.length === 0 ? (
                      <p>질문이 없습니다.</p>
                    ) : (
                      <ul>
                        {report.questions.map((question, index) => (
                          <li key={index}>{question}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LectureSummaryReport;

