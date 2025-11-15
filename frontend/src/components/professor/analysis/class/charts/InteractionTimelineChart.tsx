import React from "react";

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
  const maxValue = Math.max(
    ...data.map((d) => Math.max(d.curious, d.questions))
  );
  const chartHeight = 200;
  const chartWidth = 500;
  const padding = 40;

  const getY = (value: number) => {
    return chartHeight - padding - (value / maxValue) * (chartHeight - padding * 2);
  };

  const getX = (index: number) => {
    return padding + (index / (data.length - 1)) * (chartWidth - padding * 2);
  };

  // 라인 경로 생성
  const curiousPath = data
    .map((d, i) => {
      const x = getX(i);
      const y = getY(d.curious);
      return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
    })
    .join(" ");

  const questionsPath = data
    .map((d, i) => {
      const x = getX(i);
      const y = getY(d.questions);
      return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
    })
    .join(" ");

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">
        상호작용 타임라인
      </h2>
      <div className="overflow-x-auto">
        <svg width={chartWidth} height={chartHeight + 60} className="mx-auto">
          {/* 그리드 라인 */}
          {[0, 5, 10, 15, 20].map((value) => {
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
            d={curiousPath}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="2"
          />
          <path
            d={questionsPath}
            fill="none"
            stroke="#a855f7"
            strokeWidth="2"
          />

          {/* 데이터 포인트 */}
          {data.map((d, i) => {
            const x = getX(i);
            return (
              <g key={i}>
                <circle
                  cx={x}
                  cy={getY(d.curious)}
                  r="4"
                  fill="#3b82f6"
                />
                <circle
                  cx={x}
                  cy={getY(d.questions)}
                  r="4"
                  fill="#a855f7"
                />
              </g>
            );
          })}
        </svg>
      </div>

      <div className="flex items-center justify-center gap-4 mt-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
          <span className="text-xs text-gray-600">궁금해요</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
          <span className="text-xs text-gray-600">질문</span>
        </div>
      </div>

      <p className="text-sm text-gray-600 mt-4 text-center">{annotation}</p>
    </div>
  );
};

export default InteractionTimelineChart;

