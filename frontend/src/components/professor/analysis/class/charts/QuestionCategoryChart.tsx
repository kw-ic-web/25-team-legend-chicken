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

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="mb-4">
        <p className="text-sm text-gray-600 mb-2">
          현재 수강 중인 학생들의 질문 수와 궁금해요 수, 참여 비율을 분석했습니다.
        </p>
        <h2 className="text-lg font-semibold text-gray-900">질문 카테고리</h2>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Tooltip />
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderCustomLabel}
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>

      <p className="text-sm text-gray-600 mt-4 text-center">{totalText}</p>
    </div>
  );
};

export default QuestionCategoryChart;

