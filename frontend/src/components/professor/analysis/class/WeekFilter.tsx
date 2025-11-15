import React from "react";
import { ChevronDown } from "lucide-react";

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
    <div className="flex items-center gap-3">
      <label className="text-sm font-medium text-gray-700">주차 선택:</label>
      <div className="relative">
        <select
          value={selectedWeek === null ? "all" : selectedWeek}
          onChange={(e) => {
            const value = e.target.value;
            onWeekChange(value === "all" ? null : Number(value));
          }}
          className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-10 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer hover:border-gray-400 transition-colors min-w-[150px]"
        >
          <option value="all">전체</option>
          {weeks.map((week) => (
            <option key={week} value={week}>
              {week}주차
            </option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <ChevronDown className="w-4 h-4 text-gray-500" />
        </div>
      </div>
    </div>
  );
};

export default WeekFilter;
