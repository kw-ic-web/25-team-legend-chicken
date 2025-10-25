import React, { useState } from "react";
import Modal from "../../common/Modal";
import LinkShareModal from "./LinkShareModal";
import IdInviteModal from "./IdInviteModal";

interface Student {
  id: number;
  name: string;
  email: string;
}

interface LecturePersonnelModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  onInviteByLink?: () => void;
  onInviteById?: (studentId: string) => void;
}

const LecturePersonnelModal: React.FC<LecturePersonnelModalProps> = ({
  isOpen,
  onClose,
  students,
  onInviteByLink,
  onInviteById,
}) => {
  const [showLinkShareModal, setShowLinkShareModal] = useState(false);
  const [showIdInviteModal, setShowIdInviteModal] = useState(false);

  const handleLinkInvite = () => {
    setShowLinkShareModal(true);
    if (onInviteByLink) {
      onInviteByLink();
    }
  };

  const handleIdInvite = () => {
    setShowIdInviteModal(true);
  };

  const handleIdInviteSubmit = (studentId: string) => {
    if (onInviteById) {
      onInviteById(studentId);
    }
    setShowIdInviteModal(false);
  };

  const handleSwitchToLink = () => {
    setShowIdInviteModal(false);
    setShowLinkShareModal(true);
  };

  const handleSwitchToId = () => {
    setShowLinkShareModal(false);
    setShowIdInviteModal(true);
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="강좌 인원 관리" size="lg">
        <div className="space-y-4">
          {/* 헤더 정보 */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mt-1">
                <b>현재 강좌 인원:</b> {students.length}명
              </p>
              <p className="text-sm text-gray-500 mt-1">
                아래에서 등록된 수강생을 확인하고 관리할 수 있습니다.
              </p>
            </div>
          </div>

          {/* 수강생 목록 */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
              <div className="grid grid-cols-2 gap-4 text-sm font-medium text-gray-700">
                <div>이름</div>
                <div>이메일</div>
              </div>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {students.map((student) => (
                <div
                  key={student.id}
                  className="px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors duration-200"
                >
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="font-medium text-gray-900">
                      {student.name}
                    </div>
                    <div className="text-gray-600">{student.email}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 액션 버튼 */}
          <div className="flex space-x-3">
            <button
              onClick={handleLinkInvite}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors duration-200"
            >
              링크 초대
            </button>
            <button
              onClick={handleIdInvite}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors duration-200"
            >
              아이디 초대
            </button>
          </div>
        </div>
      </Modal>

      {/* 링크 공유 모달 */}
      <LinkShareModal
        isOpen={showLinkShareModal}
        onClose={() => setShowLinkShareModal(false)}
        onSwitchToId={handleSwitchToId}
      />

      {/* 아이디 초대 모달 */}
      <IdInviteModal
        isOpen={showIdInviteModal}
        onClose={() => setShowIdInviteModal(false)}
        onInvite={handleIdInviteSubmit}
        onSwitchToLink={handleSwitchToLink}
      />
    </>
  );
};

export default LecturePersonnelModal;
