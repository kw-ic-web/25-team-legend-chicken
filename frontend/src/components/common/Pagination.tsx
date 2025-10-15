import React from "react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  showFirstLast?: boolean;
  maxVisiblePages?: number;
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  showFirstLast = true,
  maxVisiblePages = 5,
}) => {
  const getVisiblePages = () => {
    const pages: (number | string)[] = [];
    const halfVisible = Math.floor(maxVisiblePages / 2);

    let startPage = Math.max(1, currentPage - halfVisible);
    let endPage = Math.min(totalPages, currentPage + halfVisible);

    // 시작 페이지가 1에 가까우면 끝 페이지를 조정
    if (startPage <= 2) {
      endPage = Math.min(totalPages, maxVisiblePages);
    }

    // 끝 페이지가 마지막에 가까우면 시작 페이지를 조정
    if (endPage >= totalPages - 1) {
      startPage = Math.max(1, totalPages - maxVisiblePages + 1);
    }

    // 첫 페이지가 1이 아니면 1과 ... 추가
    if (startPage > 1) {
      pages.push(1);
      if (startPage > 2) {
        pages.push("...");
      }
    }

    // 중간 페이지들 추가
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    // 마지막 페이지가 끝이 아니면 ...과 마지막 페이지 추가
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        pages.push("...");
      }
      pages.push(totalPages);
    }

    return pages;
  };

  const handlePageClick = (page: number | string) => {
    if (typeof page === "number") {
      onPageChange(page);
    }
  };

  const handleFirstPage = () => {
    onPageChange(1);
  };

  const handleLastPage = () => {
    onPageChange(totalPages);
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="mt-8 flex justify-center">
      <div className="flex items-center space-x-2">
        {/* 첫 페이지로 */}
        {showFirstLast && (
          <button
            onClick={handleFirstPage}
            disabled={currentPage === 1}
            className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {"<<"}
          </button>
        )}

        {/* 이전 페이지 */}
        <button
          onClick={handlePrevPage}
          disabled={currentPage === 1}
          className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {"<"}
        </button>

        {/* 페이지 번호들 */}
        {getVisiblePages().map((page, index) => (
          <React.Fragment key={index}>
            {typeof page === "number" ? (
              <button
                onClick={() => handlePageClick(page)}
                className={`px-3 py-2 text-sm rounded transition-colors ${
                  page === currentPage
                    ? "bg-blue-600 text-white"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                }`}
              >
                {page}
              </button>
            ) : (
              <span className="px-3 py-2 text-sm text-gray-500">...</span>
            )}
          </React.Fragment>
        ))}

        {/* 다음 페이지 */}
        <button
          onClick={handleNextPage}
          disabled={currentPage === totalPages}
          className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {">"}
        </button>

        {/* 마지막 페이지로 */}
        {showFirstLast && (
          <button
            onClick={handleLastPage}
            disabled={currentPage === totalPages}
            className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {">>"}
          </button>
        )}
      </div>
    </div>
  );
};

export default Pagination;
