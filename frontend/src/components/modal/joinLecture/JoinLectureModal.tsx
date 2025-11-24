import React, { useState } from "react";
import Modal from "../../common/Modal";
import { joinLecture } from "../../../api/student";
import { BookOpen, Loader2 } from "lucide-react";

interface JoinLectureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const JoinLectureModal: React.FC<JoinLectureModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [lectureId, setLectureId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!lectureId.trim()) {
      setError("강좌 ID를 입력해주세요.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await joinLecture(lectureId.trim());
      setSuccessMessage(
        `강좌에 성공적으로 참가했습니다!\n강좌명: ${response.lecture.name}\n교수: ${response.lecture.professor_name}`
      );
      
      // 성공 후 2초 뒤에 모달 닫기 및 콜백 실행
      setTimeout(() => {
        setLectureId("");
        setError(null);
        setSuccessMessage(null);
        onClose();
        if (onSuccess) {
          onSuccess();
        }
      }, 2000);
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "강좌 참가에 실패했습니다. 다시 시도해주세요.";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setLectureId("");
      setError(null);
      setSuccessMessage(null);
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="강좌 참가"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="lectureId"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            강좌 ID
          </label>
          <div className="relative">
            <BookOpen className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              id="lectureId"
              type="text"
              value={lectureId}
              onChange={(e) => setLectureId(e.target.value)}
              placeholder="예: LEC-D1897635"
              disabled={isLoading}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>
          <p className="mt-1 text-xs text-gray-500">
            강좌 참가 링크에서 받은 강좌 ID를 입력하세요.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {successMessage && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-600 whitespace-pre-line">
              {successMessage}
            </p>
          </div>
        )}

        <div className="flex space-x-3 pt-2">
          <button
            type="button"
            onClick={handleClose}
            disabled={isLoading}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={isLoading || !lectureId.trim()}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>참가 중...</span>
              </>
            ) : (
              <span>참가하기</span>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default JoinLectureModal;


