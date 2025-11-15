import React from "react";

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
  // 파이 차트 계산
  let currentAngle = -90; // 시작 각도 (12시 방향)
  const radius = 80;
  const centerX = 120;
  const centerY = 120;

  const total = data.reduce((sum, item) => sum + item.value, 0);

  const paths = data.map((item, index) => {
    const percentage = (item.value / total) * 100;
    const angle = (item.value / total) * 360;

    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;

    const x1 = centerX + radius * Math.cos((startAngle * Math.PI) / 180);
    const y1 = centerY + radius * Math.sin((startAngle * Math.PI) / 180);
    const x2 = centerX + radius * Math.cos((endAngle * Math.PI) / 180);
    const y2 = centerY + radius * Math.sin((endAngle * Math.PI) / 180);

    const largeArcFlag = angle > 180 ? 1 : 0;

    const pathData = [
      `M ${centerX} ${centerY}`,
      `L ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
      "Z",
    ].join(" ");

    // 레이블 위치 계산
    const labelAngle = (startAngle + endAngle) / 2;
    const labelRadius = radius + 20;
    const labelX = centerX + labelRadius * Math.cos((labelAngle * Math.PI) / 180);
    const labelY = centerY + labelRadius * Math.sin((labelAngle * Math.PI) / 180);

    currentAngle = endAngle;

    return {
      path: pathData,
      color: item.color,
      value: item.value,
      labelX,
      labelY,
      name: item.name,
      percentage,
    };
  });

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="mb-4">
        <p className="text-sm text-gray-600 mb-2">
          현재 수강 중인 학생들의 질문 수와 궁금해요 수, 참여 비율을 분석했습니다.
        </p>
        <h2 className="text-lg font-semibold text-gray-900">질문 카테고리</h2>
      </div>

      <div className="flex items-center justify-center">
        <svg width="240" height="240" className="mx-auto">
          {paths.map((path, index) => (
            <g key={index}>
              <path
                d={path.path}
                fill={path.color}
                stroke="white"
                strokeWidth="2"
              />
              <text
                x={path.labelX}
                y={path.labelY}
                textAnchor="middle"
                dominantBaseline="middle"
                className="text-sm font-semibold fill-gray-900"
              >
                {path.value}
              </text>
            </g>
          ))}
        </svg>
      </div>

      <p className="text-sm text-gray-600 mt-4 text-center">{totalText}</p>
    </div>
  );
};

export default QuestionCategoryChart;

