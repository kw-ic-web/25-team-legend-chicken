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
      <label className="text-sm font-semibold text-gray-700 whitespace-nowrap">
        주차 선택:
      </label>
      <div className="relative">
        <select
          value={selectedWeek === null ? "all" : selectedWeek}
          onChange={(e) => {
            const value = e.target.value;
            onWeekChange(value === "all" ? null : Number(value));
          }}
          className="appearance-none bg-white border-2 border-gray-300 rounded-xl px-5 py-2.5 pr-10 text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer hover:border-blue-400 transition-all duration-200 min-w-[160px] shadow-sm hover:shadow-md"
        >
          <option value="all">전체</option>
          {weeks.map((week) => (
            <option key={week} value={week}>
              {week}주차
            </option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <ChevronDown className="w-5 h-5 text-gray-500" />
        </div>
      </div>
    </div>
  );
};

export default WeekFilter;
