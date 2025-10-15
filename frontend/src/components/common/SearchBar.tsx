import React from "react";
import { Search } from "lucide-react";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  className?: string;
}

const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  onSubmit,
  placeholder = "검색어를 입력하세요",
  className,
}) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && onSubmit) {
      onSubmit();
    }
  };

  return (
    <div className={`flex items-center space-x-2 ${className ?? ""}`}>
      <div className="relative">
        <input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-[560px] px-4 py-3 border border-gray-300 rounded-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
      <button
        className="bg-[#607CA3] hover:bg-blue-700 text-white p-3 rounded-none transition-colors h-[48px] w-[48px] flex items-center justify-center"
        onClick={onSubmit}
        aria-label="검색"
      >
        <Search className="w-5 h-5" />
      </button>
    </div>
  );
};

export default SearchBar;
