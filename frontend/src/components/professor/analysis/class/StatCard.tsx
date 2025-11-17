import React from "react";

interface StatCardProps {
  icon: React.ComponentType<{ className?: string }>;
  iconBgColor: string;
  iconColor: string;
  title: string;
  value: string | number;
}

const StatCard: React.FC<StatCardProps> = ({
  icon: Icon,
  iconBgColor,
  iconColor,
  title,
  value,
}) => {
  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div
            className={`w-12 h-12 ${iconBgColor} rounded-xl flex items-center justify-center mb-4 shadow-sm`}
          >
            <Icon className={`w-6 h-6 ${iconColor}`} />
          </div>
          <h3 className="text-sm font-medium text-gray-600 mb-2">{title}</h3>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
};

export default StatCard;
