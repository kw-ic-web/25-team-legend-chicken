import React from "react";

interface ComparisonData {
  category: string;
  current: number;
  previous: number;
}

interface ComparisonChartProps {
  data: ComparisonData[];
  summary: string;
}

const ComparisonChart: React.FC<ComparisonChartProps> = ({
  data,
  summary,
}) => {
  const maxValue = Math.max(
    ...data.map((d) => Math.max(d.current, d.previous))
  );

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">
        지난 강의와 비교
      </h2>
      <div className="space-y-6">
        {data.map((item, index) => (
          <div key={index}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                {item.category}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex-1 relative h-8 bg-gray-100 rounded">
                <div
                  className="h-full bg-purple-600 rounded flex items-center justify-end pr-2"
                  style={{
                    width: `${(item.current / maxValue) * 100}%`,
                  }}
                >
                  {item.current > 10 && (
                    <span className="text-xs text-white font-medium">
                      {item.current}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex-1 relative h-8 bg-gray-100 rounded">
                <div
                  className="h-full bg-purple-300 rounded flex items-center justify-end pr-2"
                  style={{
                    width: `${(item.previous / maxValue) * 100}%`,
                  }}
                >
                  {item.previous > 10 && (
                    <span className="text-xs text-gray-700 font-medium">
                      {item.previous}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-center gap-4 mt-6">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-purple-600 rounded"></div>
          <span className="text-xs text-gray-600">이번</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-purple-300 rounded"></div>
          <span className="text-xs text-gray-600">지난</span>
        </div>
      </div>

      <p className="text-sm text-gray-600 mt-4 text-center">{summary}</p>
    </div>
  );
};

export default ComparisonChart;

