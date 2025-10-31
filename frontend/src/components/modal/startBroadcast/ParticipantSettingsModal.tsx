import React, { useState } from "react";
import Modal from "../../common/Modal";
import LectureMaterialUploadModal from "./LectureMaterialUploadModal";

interface ParticipantSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBack: () => void;
  onNext: (cameraRequired: boolean, files: File[]) => void;
}

const ParticipantSettingsModal: React.FC<ParticipantSettingsModalProps> = ({
  isOpen,
  onClose,
  onBack,
  onNext,
}) => {
  const [cameraRequired, setCameraRequired] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);

  const handleNext = () => {
    onClose(); // 참여자 설정 모달 닫기
    setShowUploadModal(true);
  };

  const handleUploadNext = (files: File[]) => {
    onNext(cameraRequired, files);
    setShowUploadModal(false);
  };

  const handleUploadBack = () => {
    setShowUploadModal(false);
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="참여자 설정" size="lg">
        <div className="space-y-6">
          <p className="text-gray-700 text-sm">
            실시간 강의 중 학생의 카메라 사용 방식을 선택하세요. 해당 설정은
            강의 시작 후에 변경할 수 없습니다.
          </p>

          <div className="space-y-4">
            {/* 카메라 참여 필수 옵션 */}
            <div className="flex items-start space-x-3">
              <input
                type="radio"
                id="camera-required"
                name="camera-setting"
                checked={cameraRequired}
                onChange={() => setCameraRequired(true)}
                className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 mt-1"
              />
              <div className="flex-1">
                <label
                  htmlFor="camera-required"
                  className="block font-medium text-gray-900"
                >
                  카메라 참여 필수
                </label>
                <p className="text-sm text-gray-600 mt-1">
                  실시간 토론 및 질의응답의 원활한 진행을 위해 카메라를 켭니다.
                </p>
              </div>
            </div>

            {/* 선택적 사용 옵션 */}
            <div className="flex items-start space-x-3">
              <input
                type="radio"
                id="camera-optional"
                name="camera-setting"
                checked={!cameraRequired}
                onChange={() => setCameraRequired(false)}
                className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 mt-1"
              />
              <div className="flex-1">
                <label
                  htmlFor="camera-optional"
                  className="block font-medium text-gray-900"
                >
                  선택적 사용
                </label>
                <p className="text-sm text-gray-600 mt-1">
                  학생이 원할 경우에만 카메라를 켤 수 있습니다.
                </p>
              </div>
            </div>
          </div>

          {/* 개인정보 보호 안내 */}
          <div className="flex items-start space-x-3">
            <p className="text-sm text-blue-800">
              개인정보 보호를 위해 얼굴 영상은 녹화·분석에 사용되지 않으며, AI
              분석은 오직 강의 내용과 질문 데이터에 한정됩니다.
            </p>
          </div>

          {/* 버튼 */}
          <div className="flex justify-end space-x-3">
            <button
              onClick={onBack}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors duration-200"
            >
              뒤로 가기
            </button>
            <button
              onClick={handleNext}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors duration-200"
            >
              다음
            </button>
          </div>
        </div>
      </Modal>

      {/* 교안 업로드 모달 */}
      <LectureMaterialUploadModal
        isOpen={showUploadModal}
        onClose={onClose}
        onBack={handleUploadBack}
        onNext={handleUploadNext}
        cameraRequired={cameraRequired}
      />
    </>
  );
};

export default ParticipantSettingsModal;
