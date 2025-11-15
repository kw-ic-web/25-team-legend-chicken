import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface ComparisonData {
  category: string;
  current: number;
  previous: number;
}

interface ComparisonChartProps {
  data: ComparisonData[];
  summary: string;
}

const ComparisonChart: React.FC<ComparisonChartProps> = ({
  data,
  summary,
}) => {
  const chartData = data.map((item) => ({
    category: item.category,
    이번: item.current,
    지난: item.previous,
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const customTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm font-semibold" style={{ color: entry.color }}>
              {entry.name}: {entry.value}점
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 hover:shadow-lg transition-shadow duration-300">
      <h2 className="text-xl font-bold text-gray-900 mb-6">
        지난 강의와 비교
      </h2>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart
          data={chartData}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="category" stroke="#6b7280" />
          <YAxis stroke="#6b7280" />
          <Tooltip content={customTooltip} />
          <Legend
            wrapperStyle={{ paddingTop: "20px" }}
            iconType="circle"
          />
          <Bar dataKey="이번" fill="#9333ea" radius={[8, 8, 0, 0]} />
          <Bar dataKey="지난" fill="#c4b5fd" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-100">
        <p className="text-sm text-gray-700 text-center font-medium">
          {summary}
        </p>
      </div>
    </div>
  );
};

export default ComparisonChart;

