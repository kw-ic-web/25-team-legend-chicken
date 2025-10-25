import React, { useState } from "react";
import Modal from "../../common/Modal";
import ParticipantSettingsModal from "./ParticipantSettingsModal";

interface BroadcastAgreementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAgree: (cameraRequired: boolean, files: File[]) => void;
}

const BroadcastAgreementModal: React.FC<BroadcastAgreementModalProps> = ({
  isOpen,
  onClose,
  onAgree,
}) => {
  const [isAgreed, setIsAgreed] = useState(false);
  const [showParticipantModal, setShowParticipantModal] = useState(false);

  const handleAgree = () => {
    if (isAgreed) {
      onClose(); // 동의 모달 닫기
      setShowParticipantModal(true);
    }
  };

  const handleParticipantNext = (cameraRequired: boolean, files: File[]) => {
    onAgree(cameraRequired, files);
    setShowParticipantModal(false);
    setIsAgreed(false);
  };

  const handleParticipantBack = () => {
    setShowParticipantModal(false);
  };

  const handleCancel = () => {
    onClose();
    setIsAgreed(false);
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleCancel}
        title="강의 시작 전, 꼭 확인하세요!"
        size="lg"
      >
        <div className="space-y-6">
          <p className="text-gray-700">
            Lec-Q의 모든 실시간 강의는 학생 개인정보 보호와 공정한 학습 환경
            유지를 위해 아래 운영 가이드를 반드시 준수해야 합니다. '동의' 후
            강의를 시작하실 수 있습니다.
          </p>

          <div>
            <h3 className="font-semibold text-gray-900 mb-3">
              실시간 강의 운영 유의사항
            </h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start">
                <span className="w-2 h-2 bg-gray-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                <span>수업 목적 이외의 화면 공유, 녹화, 캡처를 금합니다.</span>
              </li>
              <li className="flex items-start">
                <span className="w-2 h-2 bg-gray-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                <span>
                  타인의 질문이나 발언을 무단으로 복제, 인용, 배포하지 않습니다.
                </span>
              </li>
              <li className="flex items-start">
                <span className="w-2 h-2 bg-gray-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                <span>
                  교안, 질문, 채팅 내용은 AI 자동 기록 시스템에 의해
                  저장·분석됩니다.
                </span>
              </li>
              <li className="flex items-start">
                <span className="w-2 h-2 bg-gray-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                <span>
                  부적절한 언행, 비방, 외부 홍보 및 무단 링크 공유를 금합니다.
                </span>
              </li>
              <li className="flex items-start">
                <span className="w-2 h-2 bg-gray-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                <span>
                  네트워크 불안정 시 강의 품질이 저하될 수 있으므로 사전 점검을
                  권장합니다.
                </span>
              </li>
              <li className="flex items-start">
                <span className="w-2 h-2 bg-gray-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                <span>
                  시스템 목적에 맞지 않게 실시간 강의를 이용할 경우 이용이
                  제한될 수 있습니다.
                </span>
              </li>
            </ul>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="agreement"
              checked={isAgreed}
              onChange={(e) => setIsAgreed(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="agreement" className="text-sm text-gray-700">
              위 내용에 동의합니다.
            </label>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              onClick={handleCancel}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors duration-200"
            >
              취소
            </button>
            <button
              onClick={handleAgree}
              disabled={!isAgreed}
              className={`px-4 py-2 rounded-md transition-colors duration-200 ${
                isAgreed
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }`}
            >
              동의
            </button>
          </div>
        </div>
      </Modal>

      {/* 참여자 설정 모달 */}
      <ParticipantSettingsModal
        isOpen={showParticipantModal}
        onClose={handleCancel}
        onBack={handleParticipantBack}
        onNext={handleParticipantNext}
      />
    </>
  );
};

export default BroadcastAgreementModal;
