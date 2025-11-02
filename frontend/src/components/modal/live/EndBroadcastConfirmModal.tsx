import React from "react";
import Modal from "../../common/Modal";

interface EndBroadcastConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const EndBroadcastConfirmModal: React.FC<EndBroadcastConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="방송 종료" size="sm">
      <div className="space-y-4">
        <p className="text-sm text-gray-700">정말 방송을 종료하시겠어요?</p>
        <div className="flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700"
          >
            종료
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default EndBroadcastConfirmModal;


