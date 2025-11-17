import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface CategoryData {
  name: string;
  value: number;
  color: string;
  percentage: number;
}

interface QuestionCategoryChartProps {
  data: CategoryData[];
  totalText: string;
}

const QuestionCategoryChart: React.FC<QuestionCategoryChartProps> = ({
  data,
  totalText,
}) => {
  const chartData = data.map((item) => ({
    name: item.name,
    value: item.value,
    fill: item.color,
  }));

  const renderCustomLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    value,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? "start" : "end"}
        dominantBaseline="central"
        className="text-sm font-semibold"
      >
        {value}
      </text>
    );
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const customTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const total = chartData.reduce((sum, item) => sum + item.value, 0);
      const percentage = ((data.value / total) * 100).toFixed(1);
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
          <p className="font-semibold text-gray-900">{data.name}</p>
          <p className="text-sm text-gray-600">
            {data.value}개 ({percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 hover:shadow-lg transition-shadow duration-300">
      <div className="mb-6">
        <p className="text-sm text-gray-600 mb-3 leading-relaxed">
          현재 수강 중인 학생들의 질문 수와 궁금해요 수, 참여 비율을
          분석했습니다.
        </p>
        <h2 className="text-xl font-bold text-gray-900">질문 카테고리</h2>
      </div>

      <ResponsiveContainer width="100%" height={320}>
        <PieChart>
          <Tooltip content={customTooltip} />
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderCustomLabel}
            outerRadius={110}
            fill="#8884d8"
            dataKey="value"
            stroke="#fff"
            strokeWidth={3}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
        <p className="text-sm text-gray-700 text-center font-medium">
          {totalText}
        </p>
      </div>
    </div>
  );
};

export default QuestionCategoryChart;
