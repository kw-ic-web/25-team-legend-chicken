import React from "react";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  icon: LucideIcon;
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
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div
            className={`w-10 h-10 ${iconBgColor} rounded flex items-center justify-center mb-3`}
          >
            <Icon className={`w-5 h-5 ${iconColor}`} />
          </div>
          <h3 className="text-sm font-medium text-gray-600 mb-2">{title}</h3>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
};

export default StatCard;

