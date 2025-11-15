import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface TimelineData {
  time: number;
  curious: number;
  questions: number;
}

interface InteractionTimelineChartProps {
  data: TimelineData[];
  annotation: string;
}

const InteractionTimelineChart: React.FC<InteractionTimelineChartProps> = ({
  data,
  annotation,
}) => {
  const chartData = data.map((item) => ({
    time: `${item.time}분`,
    궁금해요: item.curious,
    질문: item.questions,
  }));

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">
        상호작용 타임라인
      </h2>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart
          data={chartData}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="time" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line
            type="monotone"
            dataKey="궁금해요"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ fill: "#3b82f6", r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="질문"
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

export default InteractionTimelineChart;

