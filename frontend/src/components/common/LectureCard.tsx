import React from "react";
import { Link } from "react-router-dom";
import { Users, BookOpenText } from "lucide-react";

interface LectureCardProps {
  id: number | string;
  title: string;
  instructor: string;
  participants: number;
  status: "broadcasting" | "scheduled" | "completed";
  newQuestions?: number;
  subject?: string;
  image?: string;
  userType?: "student" | "professor";
}

const LectureCard: React.FC<LectureCardProps> = ({
  id,
  title,
  instructor,
  participants,
  status,
  newQuestions = 0,
  image,
  userType = "professor",
}) => {
  const [imageError, setImageError] = React.useState(false);
  const [imageLoaded, setImageLoaded] = React.useState(false);

  // 이미지 prop이 변경되면 상태 리셋
  React.useEffect(() => {
    setImageError(false);
    setImageLoaded(false);
  }, [image]);

  const handleImageError = () => {
    setImageError(true);
    setImageLoaded(false);
  };

  const handleImageLoad = () => {
    setImageLoaded(true);
    setImageError(false);
  };
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
    // 현재는 과목 구분 없이 공통 강의 아이콘만 사용
    return <BookOpenText className="w-8 h-8 text-black-600" />;
  };

  const linkPath =
    userType === "student"
      ? `/student/courses/${id}`
      : `/professor/courses/${id}`;

  return (
    <Link
      to={linkPath}
      className="block bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
    >
      {/* 상단 섹션 - 강의 이미지 영역 */}
      <div className="relative h-48 bg-gray-100 flex items-center justify-center overflow-hidden">
        {image && !imageError ? (
          <>
            <img
              src={image}
              alt={title}
              className={`absolute inset-0 w-full h-full object-cover ${
                imageLoaded ? "opacity-100" : "opacity-0"
              } transition-opacity duration-300`}
              onError={handleImageError}
              onLoad={handleImageLoad}
            />
            {!imageLoaded && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600"></div>
              </div>
            )}
          </>
        ) : (
          // 이미지가 없으면 간단하게 강의 아이콘만 표시
          <div className="relative z-10 flex items-center justify-center">
            <div className="w-16 h-16 flex items-center justify-center">
              {getSubjectIcon()}
            </div>
          </div>
        )}
        {/* 상태 태그 */}
        {getStatusTag()}
      </div>

      {/* 하단 섹션 - 강의 정보 */}
      <div className="p-4 ">
        <h4 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">
          {title}
        </h4>
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">{instructor}</p>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1">
              <Users className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-500">{participants}</span>
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
