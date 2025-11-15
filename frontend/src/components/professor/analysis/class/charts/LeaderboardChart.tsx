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

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">리더보드</h2>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" />
          <YAxis dataKey="name" type="category" width={80} />
          <Tooltip />
          <Legend />
          <Bar dataKey="궁금해요" fill="#3b82f6" />
          <Bar dataKey="질문" fill="#a855f7" />
        </BarChart>
      </ResponsiveContainer>

      <p className="text-sm text-gray-600 mt-4 text-center">{description}</p>
    </div>
  );
};

export default LeaderboardChart;

