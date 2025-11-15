import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface TrendData {
  time: string;
  value: number;
}

interface QuestionTrendChartProps {
  data: TrendData[];
  annotation: string;
}

const QuestionTrendChart: React.FC<QuestionTrendChartProps> = ({
  data,
  annotation,
}) => {
  const chartData = data.map((item) => ({
    time: item.time,
    질문수: item.value,
  }));

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">질문 트렌드</h2>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart
          data={chartData}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="time" />
          <YAxis />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="질문수"
            stroke="#a855f7"
            strokeWidth={2}
            dot={{ fill: "#a855f7", r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>

      <p className="text-sm text-gray-600 mt-4 text-center">{annotation}</p>
    </div>
  );
};

export default QuestionTrendChart;

