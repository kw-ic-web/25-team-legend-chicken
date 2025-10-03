import React, { useState } from "react";

interface LectureData {
  id: number;
  title: string;
  date: string;
  attendance: number;
  totalQuestions: number;
  avgEngagement: number;
  keyTopics: string[];
}

interface AnalysisChart {
  type: "attendance" | "questions" | "engagement";
  data: { label: string; value: number }[];
}

const LectureAnalysis: React.FC = () => {
  const [selectedLecture, setSelectedLecture] = useState<number | null>(null);

  const [lectures] = useState<LectureData[]>([
    {
      id: 1,
      title: "데이터베이스 개론 - 1주차",
      date: "2024-01-15",
      attendance: 45,
      totalQuestions: 12,
      avgEngagement: 8.5,
      keyTopics: ["정규화", "ER 모델", "SQL 기초"],
    },
    {
      id: 2,
      title: "데이터베이스 개론 - 2주차",
      date: "2024-01-22",
      attendance: 43,
      totalQuestions: 8,
      avgEngagement: 7.2,
      keyTopics: ["인덱싱", "트랜잭션", "동시성 제어"],
    },
    {
      id: 3,
      title: "웹 프로그래밍 - 1주차",
      date: "2024-02-01",
      attendance: 38,
      totalQuestions: 15,
      avgEngagement: 9.1,
      keyTopics: ["HTML/CSS", "JavaScript", "DOM 조작"],
    },
  ]);

  const [charts] = useState<AnalysisChart[]>([
    {
      type: "attendance",
      data: [
        { label: "1주차", value: 45 },
        { label: "2주차", value: 43 },
        { label: "3주차", value: 41 },
        { label: "4주차", value: 44 },
      ],
    },
    {
      type: "questions",
      data: [
        { label: "1주차", value: 12 },
        { label: "2주차", value: 8 },
        { label: "3주차", value: 15 },
        { label: "4주차", value: 11 },
      ],
    },
    {
      type: "engagement",
      data: [
        { label: "1주차", value: 8.5 },
        { label: "2주차", value: 7.2 },
        { label: "3주차", value: 9.1 },
        { label: "4주차", value: 8.8 },
      ],
    },
  ]);

  const selectedLectureData = lectures.find(
    (lecture) => lecture.id === selectedLecture
  );

  return (
    <div className="lecture-analysis">
      <h1>강의 분석 및 리포트</h1>

      <div className="analysis-content">
        <div className="lecture-selector">
          <h2>강의 선택</h2>
          <select
            value={selectedLecture || ""}
            onChange={(e) => setSelectedLecture(Number(e.target.value))}
            className="lecture-select"
          >
            <option value="">강의를 선택하세요</option>
            {lectures.map((lecture) => (
              <option key={lecture.id} value={lecture.id}>
                {lecture.title}
              </option>
            ))}
          </select>
        </div>

        {selectedLectureData && (
          <div className="analysis-details">
            <div className="lecture-overview">
              <h2>강의 개요</h2>
              <div className="overview-grid">
                <div className="overview-item">
                  <h3>강의명</h3>
                  <p>{selectedLectureData.title}</p>
                </div>
                <div className="overview-item">
                  <h3>날짜</h3>
                  <p>{selectedLectureData.date}</p>
                </div>
                <div className="overview-item">
                  <h3>출석률</h3>
                  <p>{selectedLectureData.attendance}명</p>
                </div>
                <div className="overview-item">
                  <h3>총 질문 수</h3>
                  <p>{selectedLectureData.totalQuestions}개</p>
                </div>
                <div className="overview-item">
                  <h3>평균 참여도</h3>
                  <p>{selectedLectureData.avgEngagement}/10</p>
                </div>
              </div>
            </div>

            <div className="key-topics">
              <h2>핵심 주제</h2>
              <div className="topics-list">
                {selectedLectureData.keyTopics.map((topic, index) => (
                  <span key={index} className="topic-tag">
                    {topic}
                  </span>
                ))}
              </div>
            </div>

            <div className="charts-section">
              <h2>분석 차트</h2>
              <div className="charts-grid">
                {charts.map((chart, index) => (
                  <div key={index} className="chart-container">
                    <h3>
                      {chart.type === "attendance" && "출석률"}
                      {chart.type === "questions" && "질문 수"}
                      {chart.type === "engagement" && "참여도"}
                    </h3>
                    <div className="chart-placeholder">
                      <p>차트 데이터: {chart.data.length}개 항목</p>
                      <div className="chart-bars">
                        {chart.data.map((item, i) => (
                          <div
                            key={i}
                            className="chart-bar"
                            style={{
                              height: `${(item.value / Math.max(...chart.data.map((d) => d.value))) * 100}%`,
                            }}
                          >
                            <span className="bar-value">{item.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="recommendations">
              <h2>개선 제안</h2>
              <div className="recommendation-list">
                <div className="recommendation-item">
                  <h4>참여도 향상</h4>
                  <p>
                    학생들의 질문 수가 평균보다 낮습니다. 더 많은 상호작용을
                    유도하는 방법을 고려해보세요.
                  </p>
                </div>
                <div className="recommendation-item">
                  <h4>주제별 집중도</h4>
                  <p>
                    특정 주제에서 질문이 집중되고 있습니다. 다른 주제들에 대한
                    설명을 보강해보세요.
                  </p>
                </div>
                <div className="recommendation-item">
                  <h4>출석률 관리</h4>
                  <p>
                    출석률이 안정적으로 유지되고 있습니다. 현재 수준을
                    유지하세요.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {!selectedLecture && (
          <div className="no-selection">
            <p>분석할 강의를 선택해주세요.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LectureAnalysis;
