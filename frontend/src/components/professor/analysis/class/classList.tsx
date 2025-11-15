import React from "react";
import Pagination from "../../../common/Pagination";
import type { ClassData } from "./types";

interface ClassListProps {
  Classs: ClassData[];
  currentPage: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
}

const ClassList: React.FC<ClassListProps> = ({
  Classs,
  currentPage,
  itemsPerPage,
  onPageChange,
}) => {
  const totalPages = Math.ceil(Classs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedClasss = Classs.slice(startIndex, endIndex);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">강의 리스트</h2>
      <div className="space-y-3">
        {paginatedClasss.map((Class, index) => (
          <div
            key={Class.id}
            className={`p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors ${
              index !== paginatedClasss.length - 1 ? "border-b" : ""
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="text-sm font-medium text-gray-900 mb-1">
                  {Class.title}
                </h3>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>{Class.date}</span>
                  <span>출석: {Class.attendance}명</span>
                  <span>질문: {Class.totalQuestions}개</span>
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

export default ClassList;
