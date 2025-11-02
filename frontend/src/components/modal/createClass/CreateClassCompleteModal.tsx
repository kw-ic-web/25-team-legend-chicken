import React from "react";
import { Check } from "lucide-react";
import Modal from "../../common/Modal";

interface CreateClassCompleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  capacity: number;
  startDate: string;
  endDate: string;
  onEdit?: () => void;
  onGoDashboard?: () => void;
}

const CreateClassCompleteModal: React.FC<CreateClassCompleteModalProps> = ({
  isOpen,
  onClose,
  title,
  capacity,
  startDate,
  endDate,
  onEdit,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="강좌 개설 완료" size="lg">
      <div className="space-y-6">
        {/* 상단 아이콘 */}
        <div className="w-full flex items-center justify-center">
          <div className="h-12 w-12 rounded-full bg-blue-600 flex items-center justify-center shadow-sm">
            <Check className="w-7 h-7 text-white" />
          </div>
        </div>

        {/* 타이틀 */}
        <h2 className="text-center text-xl font-extrabold text-gray-900">
          강좌 개설이 완료되었습니다
        </h2>

        <div className="border rounded-lg p-5 bg-white">
          <h1 className="text-center text-lg md:text-xl font-semibold text-gray-900 mb-2">
            {title}
          </h1>
          <p className="text-center text-sm text-blue-600">
            수강인원: {String(capacity).padStart(2, "0")}명 / 날짜: {startDate}{" "}
            - {endDate}
          </p>
        </div>

        <div className="flex items-center justify-end space-x-2">
          {onEdit && (
            <button
              onClick={onEdit}
              className="px-4 py-2 rounded border border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              수정하기
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
          >
            완료
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default CreateClassCompleteModal;
