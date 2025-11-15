import React from "react";
import type { DifficultyFeedback } from "./types";

interface DifficultyFeedbackListProps {
  feedbacks: DifficultyFeedback[];
}

const DifficultyFeedbackList: React.FC<DifficultyFeedbackListProps> = ({
  feedbacks,
}) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        너우 어려워요 Top1
      </h2>
      <div className="space-y-6">
        {feedbacks.map((feedback) => (
          <div key={feedback.id} className="border-b border-gray-200 last:border-b-0 pb-6 last:pb-0">
            <h3 className="text-base font-semibold text-gray-900 mb-2">
              {feedback.id}) {feedback.title}
            </h3>
            <div className="space-y-2 text-sm text-gray-700">
              {feedback.details.map((detail, index) => (
                <p key={index} className="leading-relaxed">
                  {detail}
                </p>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DifficultyFeedbackList;

