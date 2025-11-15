import React from "react";

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
  const maxValue = Math.max(...data.map((d) => d.value));
  const chartHeight = 200;
  const chartWidth = 500;
  const padding = 40;

  const getY = (value: number) => {
    return chartHeight - padding - (value / maxValue) * (chartHeight - padding * 2);
  };

  const getX = (index: number) => {
    return padding + (index / (data.length - 1)) * (chartWidth - padding * 2);
  };

  const path = data
    .map((d, i) => {
      const x = getX(i);
      const y = getY(d.value);
      return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
    })
    .join(" ");

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">질문 트렌드</h2>
      <div className="overflow-x-auto">
        <svg width={chartWidth} height={chartHeight + 60} className="mx-auto">
          {/* 그리드 라인 */}
          {[0, 2, 4, 6, 8].map((value) => {
            const y = getY(value);
            return (
              <g key={value}>
                <line
                  x1={padding}
                  y1={y}
                  x2={chartWidth - padding}
                  y2={y}
                  stroke="#e5e7eb"
                  strokeWidth="1"
                />
                <text
                  x={padding - 10}
                  y={y + 4}
                  textAnchor="end"
                  className="text-xs fill-gray-500"
                >
                  {value}
                </text>
              </g>
            );
          })}

          {/* X축 라벨 */}
          {data.map((d, i) => {
            const x = getX(i);
            return (
              <text
                key={i}
                x={x}
                y={chartHeight - padding + 20}
                textAnchor="middle"
                className="text-xs fill-gray-500"
              >
                {d.time}
              </text>
            );
          })}

          {/* 라인 */}
          <path
            d={path}
            fill="none"
            stroke="#a855f7"
            strokeWidth="2"
          />

          {/* 데이터 포인트 */}
          {data.map((d, i) => {
            const x = getX(i);
            return (
              <circle
                key={i}
                cx={x}
                cy={getY(d.value)}
                r="4"
                fill="#a855f7"
              />
            );
          })}
        </svg>
      </div>

      <p className="text-sm text-gray-600 mt-4 text-center">{annotation}</p>
    </div>
  );
};

export default QuestionTrendChart;

