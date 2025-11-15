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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const customTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
          <p className="text-xs text-gray-500 mb-2">{payload[0].payload.time}</p>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm font-semibold" style={{ color: entry.color }}>
              {entry.name}: {entry.value}개
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
        상호작용 타임라인
      </h2>
      <ResponsiveContainer width="100%" height={320}>
        <LineChart
          data={chartData}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="time" stroke="#6b7280" />
          <YAxis stroke="#6b7280" />
          <Tooltip content={customTooltip} />
          <Legend
            wrapperStyle={{ paddingTop: "20px" }}
            iconType="line"
          />
          <Line
            type="monotone"
            dataKey="궁금해요"
            stroke="#3b82f6"
            strokeWidth={3}
            dot={{ fill: "#3b82f6", r: 5, strokeWidth: 2, stroke: "#fff" }}
            activeDot={{ r: 7 }}
          />
          <Line
            type="monotone"
            dataKey="질문"
            stroke="#a855f7"
            strokeWidth={3}
            dot={{ fill: "#a855f7", r: 5, strokeWidth: 2, stroke: "#fff" }}
            activeDot={{ r: 7 }}
          />
        </LineChart>
      </ResponsiveContainer>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
        <p className="text-sm text-gray-700 text-center font-medium">
          {annotation}
        </p>
      </div>
    </div>
  );
};

export default InteractionTimelineChart;

