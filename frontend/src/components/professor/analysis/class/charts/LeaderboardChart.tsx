import React from "react";

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
  const maxValue = Math.max(
    ...data.map((d) => Math.max(d.curious, d.questions))
  );
  const maxBarWidth = 60;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">리더보드</h2>
      <div className="space-y-4">
        {data.map((participant, index) => (
          <div key={index} className="flex items-center gap-4">
            <div className="w-20 text-sm text-gray-700 text-right">
              {participant.name}
            </div>
            <div className="flex-1 flex items-center gap-2">
              <div className="flex-1 relative h-8 bg-gray-100 rounded">
                <div
                  className="h-full bg-blue-500 rounded flex items-center justify-end pr-2"
                  style={{
                    width: `${(participant.curious / maxValue) * 100}%`,
                  }}
                >
                  {participant.curious > 5 && (
                    <span className="text-xs text-white font-medium">
                      {participant.curious}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex-1 relative h-8 bg-gray-100 rounded">
                <div
                  className="h-full bg-purple-500 rounded flex items-center justify-end pr-2"
                  style={{
                    width: `${(participant.questions / maxValue) * 100}%`,
                  }}
                >
                  {participant.questions > 5 && (
                    <span className="text-xs text-white font-medium">
                      {participant.questions}
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
          <div className="w-4 h-4 bg-blue-500 rounded"></div>
          <span className="text-xs text-gray-600">궁금해요</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-purple-500 rounded"></div>
          <span className="text-xs text-gray-600">질문</span>
        </div>
      </div>

      <p className="text-sm text-gray-600 mt-4 text-center">{description}</p>
    </div>
  );
};

export default LeaderboardChart;

