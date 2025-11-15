import React from "react";
import type { QuestionRanking } from "./types";

interface QuestionRankingsProps {
  rankings: QuestionRanking[];
  maxItems?: number;
}

const QuestionRankings: React.FC<QuestionRankingsProps> = ({
  rankings,
  maxItems = 5,
}) => {
  const displayRankings = rankings.slice(0, maxItems);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        강좌 질문 순위
      </h2>
      <div className="space-y-4">
        {displayRankings.map((ranking) => (
          <div
            key={ranking.id}
            className="p-4 rounded-lg border border-gray-200 bg-gray-50"
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-sm font-semibold">
                {ranking.rank}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-500">
                    {ranking.rank}순위
                  </span>
                  <span className="text-xs text-gray-500">
                    👍 {ranking.upvotes}
                  </span>
                </div>
                <p className="text-sm text-gray-900 line-clamp-2">
                  {ranking.question}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default QuestionRankings;
