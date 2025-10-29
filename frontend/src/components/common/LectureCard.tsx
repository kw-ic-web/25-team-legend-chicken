import React from "react";
import { Link } from "react-router-dom";
import {
  Users,
  BookOpen,
  Code,
  Database,
  Globe,
  Brain,
  Calculator,
} from "lucide-react";

interface LectureCardProps {
  id: number;
  title: string;
  instructor: string;
  participants: number;
  status: "broadcasting" | "scheduled" | "completed";
  newQuestions?: number;
  level?: string;
  subject?: string;
  image?: string;
}

const LectureCard: React.FC<LectureCardProps> = ({
  id,
  title,
  instructor,
  participants,
  status,
  newQuestions = 0,
  level = "Level. 1",
  subject = "Python",
}) => {
  const getStatusTag = () => {
    switch (status) {
      case "broadcasting":
        return (
          <span className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded">
            방송중
          </span>
        );
      case "scheduled":
        return (
          <span className="absolute top-2 right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded">
            방송예정
          </span>
        );
      case "completed":
        return (
          <span className="absolute top-2 right-2 bg-gray-500 text-white text-xs px-2 py-1 rounded">
            종료된 강좌
          </span>
        );
      default:
        return null;
    }
  };

  const getSubjectIcon = () => {
    const iconMap: { [key: string]: React.ReactNode } = {
      Python: (
        <div className="w-16 h-16 flex items-center justify-center">
          <svg
            viewBox="0 0 24 24"
            className="w-12 h-12"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
              fill="#3776ab"
            />
            <path
              d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
              fill="#ffd43b"
            />
          </svg>
        </div>
      ),
      Web: <Globe className="w-8 h-8 text-blue-600" />,
      Database: <Database className="w-8 h-8 text-green-600" />,
      ML: <Brain className="w-8 h-8 text-purple-600" />,
      Algorithm: <Calculator className="w-8 h-8 text-orange-600" />,
      SE: <Code className="w-8 h-8 text-red-600" />,
    };

    return iconMap[subject] || <BookOpen className="w-8 h-8 text-blue-600" />;
  };

  return (
    <Link
      to={`/professor/courses/${id}`}
      className="block bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
    >
      {/* 상단 섹션 - 강의 이미지 영역 */}
      <div className="relative h-48 bg-gray-100 flex items-center justify-center">
        {/* 그리드 패턴 배경 */}
        <div className="absolute inset-0 opacity-10">
          <div
            className="w-full h-full"
            style={{
              backgroundImage: `radial-gradient(circle, #000 1px, transparent 1px)`,
              backgroundSize: "20px 20px",
            }}
          />
        </div>

        {/* 강의 아이콘 */}
        <div className="relative z-10 flex flex-col items-center space-y-3">
          <div className="w-16 h-16 flex items-center justify-center">
            {getSubjectIcon()}
          </div>
          <div className="text-center">
            <h3 className="text-lg font-bold text-gray-900">{subject}</h3>
            <span className="text-xs bg-yellow-200 text-gray-800 px-2 py-1 rounded">
              {level}
            </span>
          </div>
        </div>

        {/* 상태 태그 */}
        {getStatusTag()}
      </div>

      {/* 하단 섹션 - 강의 정보 */}
      <div className="p-4 bg-gray-50">
        <h4 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">
          {title}
        </h4>
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">{instructor}</p>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1">
              <Users className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-500">{participants}+</span>
            </div>
            {newQuestions > 0 && (
              <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded">
                새로운 질문 {newQuestions}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
};

export default LectureCard;
