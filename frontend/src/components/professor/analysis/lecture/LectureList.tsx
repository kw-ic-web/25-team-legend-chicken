import React from "react";
import { useNavigate } from "react-router-dom";
import Pagination from "../../../common/Pagination";
import type { LectureData } from "./types";

interface LectureListProps {
  lectures: LectureData[];
  currentPage: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
}

const LectureList: React.FC<LectureListProps> = ({
  lectures,
  currentPage,
  itemsPerPage,
  onPageChange,
}) => {
  const navigate = useNavigate();
  const totalPages = Math.ceil(lectures.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedLectures = lectures.slice(startIndex, endIndex);

  const handleLectureClick = (lectureId: number) => {
    navigate(`/professor/class-analysis/${lectureId}`);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">강좌 리스트</h2>
      <div className="space-y-3">
        {paginatedLectures.map((lecture, index) => (
          <div
            key={lecture.id}
            onClick={() => handleLectureClick(lecture.id)}
            className={`p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer ${
              index !== paginatedLectures.length - 1 ? "border-b" : ""
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="text-sm font-medium text-gray-900 mb-1">
                  {lecture.title}
                </h3>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>{lecture.date}</span>
                  <span>출석: {lecture.attendance}명</span>
                  <span>질문: {lecture.totalQuestions}개</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
          showFirstLast={true}
          maxVisiblePages={5}
        />
      )}
    </div>
  );
};

export default LectureList;
