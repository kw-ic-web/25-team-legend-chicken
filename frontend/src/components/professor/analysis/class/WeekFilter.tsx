import React from "react";

interface WeekFilterProps {
  weeks: number[];
  selectedWeek: number | null;
  onWeekChange: (week: number | null) => void;
}

const WeekFilter: React.FC<WeekFilterProps> = ({
  weeks,
  selectedWeek,
  onWeekChange,
}) => {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-sm font-medium text-gray-700">주차 필터:</span>
      <button
        onClick={() => onWeekChange(null)}
        className={`px-4 py-2 text-sm rounded-lg transition-colors ${
          selectedWeek === null
            ? "bg-blue-600 text-white"
            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
        }`}
      >
        전체
      </button>
      {weeks.map((week) => (
        <button
          key={week}
          onClick={() => onWeekChange(week)}
          className={`px-4 py-2 text-sm rounded-lg transition-colors ${
            selectedWeek === week
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          {week}주차
        </button>
      ))}
    </div>
  );
};

export default WeekFilter;

