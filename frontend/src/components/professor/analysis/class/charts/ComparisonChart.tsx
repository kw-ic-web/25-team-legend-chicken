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

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">
        지난 강의와 비교
      </h2>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={chartData}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="category" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="이번" fill="#9333ea" />
          <Bar dataKey="지난" fill="#c4b5fd" />
        </BarChart>
      </ResponsiveContainer>

      <p className="text-sm text-gray-600 mt-4 text-center">{summary}</p>
    </div>
  );
};

export default ComparisonChart;

