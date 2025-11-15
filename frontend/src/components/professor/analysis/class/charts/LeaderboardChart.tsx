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

interface ParticipantData {
  name: string;
  curious: number;
  questions: number;
}

interface LeaderboardChartProps {
  data: ParticipantData[];
  description: string;
}

const LeaderboardChart: React.FC<LeaderboardChartProps> = ({
  data,
  description,
}) => {
  const chartData = data.map((item) => ({
    name: item.name,
    궁금해요: item.curious,
    질문: item.questions,
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const customTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
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
      <h2 className="text-xl font-bold text-gray-900 mb-6">리더보드</h2>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis type="number" stroke="#6b7280" />
          <YAxis dataKey="name" type="category" width={90} stroke="#6b7280" />
          <Tooltip content={customTooltip} />
          <Legend
            wrapperStyle={{ paddingTop: "20px" }}
            iconType="circle"
          />
          <Bar
            dataKey="궁금해요"
            fill="#3b82f6"
            radius={[0, 8, 8, 0]}
          />
          <Bar
            dataKey="질문"
            fill="#a855f7"
            radius={[0, 8, 8, 0]}
          />
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-6 p-4 bg-purple-50 rounded-lg border border-purple-100">
        <p className="text-sm text-gray-700 text-center font-medium">
          {description}
        </p>
      </div>
    </div>
  );
};

export default LeaderboardChart;

