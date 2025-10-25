import React from "react";

type TabOption = {
  label: string;
  value: string;
};

interface FilterTabsProps {
  tabs: TabOption[];
  activeValue: string;
  onChange: (value: string) => void;
  className?: string;
}

const FilterTabs: React.FC<FilterTabsProps> = ({
  tabs,
  activeValue,
  onChange,
  className,
}) => {
  return (
    <div className={`flex space-x-1 ${className ?? ""}`}>
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={`px-6 py-3 text-sm font-medium rounded-none transition-colors min-w-[170px] ${
            activeValue === tab.value
              ? "bg-blue-600 text-white"
              : "bg-white text-gray-600 hover:text-gray-800 border border-gray-200"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
};

export default FilterTabs;
