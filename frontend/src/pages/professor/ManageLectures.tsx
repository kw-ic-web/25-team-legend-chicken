import React, { useState } from 'react';

interface Lecture {
  id: number;
  title: string;
  subject: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  maxStudents: number;
  currentStudents: number;
  status: 'upcoming' | 'ongoing' | 'completed';
}

const ManageLectures: React.FC = () => {
  const [lectures] = useState<Lecture[]>([
    {
      id: 1,
      title: '데이터베이스 개론',
      subject: '컴퓨터과학',
      startDate: '2024-01-15',
      endDate: '2024-06-15',
      startTime: '09:00',
      endTime: '10:30',
      maxStudents: 50,
      currentStudents: 45,
      status: 'ongoing'
    },
    {
      id: 2,
      title: '웹 프로그래밍',
      subject: '컴퓨터과학',
      startDate: '2024-02-01',
      endDate: '2024-07-01',
      startTime: '14:00',
      endTime: '15:30',
      maxStudents: 40,
      currentStudents: 38,
      status: 'upcoming'
    },
    {
      id: 3,
      title: '선형대수학',
      subject: '수학',
      startDate: '2023-09-01',
      endDate: '2023-12-15',
      startTime: '11:00',
      endTime: '12:30',
      maxStudents: 60,
      currentStudents: 58,
      status: 'completed'
    }
  ]);

  const getStatusText = (status: string) => {
    switch (status) {
      case 'upcoming': return '예정';
      case 'ongoing': return '진행중';
      case 'completed': return '완료';
      default: return status;
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'upcoming': return 'status-upcoming';
      case 'ongoing': return 'status-ongoing';
      case 'completed': return 'status-completed';
      default: return '';
    }
  };

  const handleEditLecture = (lectureId: number) => {
    console.log('강의 편집:', lectureId);
  };

  const handleDeleteLecture = (lectureId: number) => {
    console.log('강의 삭제:', lectureId);
  };

  const handleViewStudents = (lectureId: number) => {
    console.log('수강생 목록 보기:', lectureId);
  };

  return (
    <div className="manage-lectures">
      <h1>강의 관리</h1>
      <div className="lectures-list">
        {lectures.length === 0 ? (
          <p>등록된 강의가 없습니다.</p>
        ) : (
          <div className="lectures-container">
            {lectures.map((lecture) => (
              <div key={lecture.id} className="lecture-item">
                <div className="lecture-header">
                  <h3>{lecture.title}</h3>
                  <span className={`status ${getStatusClass(lecture.status)}`}>
                    {getStatusText(lecture.status)}
                  </span>
                </div>
                
                <div className="lecture-info">
                  <div className="info-row">
                    <span><strong>과목:</strong> {lecture.subject}</span>
                    <span><strong>기간:</strong> {lecture.startDate} ~ {lecture.endDate}</span>
                  </div>
                  <div className="info-row">
                    <span><strong>시간:</strong> {lecture.startTime} ~ {lecture.endTime}</span>
                    <span><strong>수강생:</strong> {lecture.currentStudents}/{lecture.maxStudents}</span>
                  </div>
                </div>
                
                <div className="lecture-actions">
                  <button 
                    onClick={() => handleViewStudents(lecture.id)}
                    className="btn-primary"
                  >
                    수강생 목록
                  </button>
                  <button 
                    onClick={() => handleEditLecture(lecture.id)}
                    className="btn-secondary"
                  >
                    편집
                  </button>
                  <button 
                    onClick={() => handleDeleteLecture(lecture.id)}
                    className="btn-danger"
                  >
                    삭제
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ManageLectures;

