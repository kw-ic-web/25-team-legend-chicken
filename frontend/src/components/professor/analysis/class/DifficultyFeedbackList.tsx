import React from "react";
import { AlertCircle } from "lucide-react";
import type { DifficultyFeedback } from "./types";

interface DifficultyFeedbackListProps {
  feedbacks: DifficultyFeedback[];
}

const DifficultyFeedbackList: React.FC<DifficultyFeedbackListProps> = ({
  feedbacks,
}) => {
  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow duration-300">
      {/* 헤더 */}
      <div className="bg-gradient-to-r from-orange-50 to-red-50 px-6 py-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
            <AlertCircle className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              너우 어려워요 Top1
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              학생들이 가장 어려워하는 부분
            </p>
          </div>
        </div>
      </div>

      {/* 피드백 리스트 */}
      <div className="p-6 space-y-6">
        {feedbacks.map((feedback, index) => (
          <div
            key={feedback.id}
            className={`pb-6 ${
              index !== feedbacks.length - 1
                ? "border-b border-gray-100"
                : ""
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-orange-100 text-orange-700 rounded-full flex items-center justify-center text-sm font-bold">
                {feedback.id}
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold text-gray-900 mb-3">
                  {feedback.title}
                </h3>
                <div className="space-y-2 text-sm text-gray-600 leading-relaxed">
                  {feedback.details.map((detail, detailIndex) => (
                    <p key={detailIndex} className="pl-4 border-l-2 border-orange-200">
                      {detail}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DifficultyFeedbackList;

