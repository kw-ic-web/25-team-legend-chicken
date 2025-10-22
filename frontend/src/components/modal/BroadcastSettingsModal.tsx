import React from "react";
import { Edit, Play } from "lucide-react";
import Modal from "../common/Modal";

interface BroadcastSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBack: () => void;
  onStart: () => void;
  cameraRequired: boolean;
  files: File[];
}

const BroadcastSettingsModal: React.FC<BroadcastSettingsModalProps> = ({
  isOpen,
  onClose,
  onBack,
  onStart,
  cameraRequired,
  files,
}) => {
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getFileDisplayText = () => {
    if (files.length === 0) return "없음";
    if (files.length === 1) {
      return `${files[0].name} [${formatFileSize(files[0].size)}]`;
    }
    return `${files[0].name} [${formatFileSize(files[0].size)}] 외 ${files.length - 1}개`;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="방송 설정">
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 왼쪽: 비디오 미리보기 영역 */}
          <div className="space-y-4">
            <div className="bg-gray-800 rounded-lg aspect-video flex items-center justify-center relative">
              <div className="text-white text-lg font-medium">
                카메라 없이 강의하기
              </div>
              <div className="absolute top-4 right-4 w-3 h-3 bg-orange-500 rounded"></div>
            </div>
            <div className="space-y-2 text-sm text-gray-600">
              <p>실시간 강의가 시작되면 모든 설정이 잠금됩니다.</p>
              <p>강의 자료와 환경을 다시 한 번 확인해주세요.</p>
            </div>
          </div>

          {/* 오른쪽: 방송 정보 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">방송 정보</h3>
              <button className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 text-sm">
                <Edit className="w-4 h-4" />
                <span>수정</span>
              </button>
            </div>

            <div className="space-y-3">
              {/* 강의명 */}
              <div className="border-b border-dashed border-gray-200 pb-3">
                <div className="text-sm text-gray-500 mb-1">강의명</div>
                <div className="text-sm font-medium text-gray-900">
                  웹서비스 설계 및 실습
                </div>
              </div>

              {/* 공개 범위 */}
              <div className="border-b border-dashed border-gray-200 pb-3">
                <div className="text-sm text-gray-500 mb-1">공개 범위</div>
                <div className="text-sm font-medium text-gray-900">
                  수강생 전용 (비공개)
                </div>
              </div>

              {/* 강의 시간 */}
              <div className="border-b border-dashed border-gray-200 pb-3">
                <div className="text-sm text-gray-500 mb-1">강의 시간</div>
                <div className="text-sm font-medium text-gray-900">
                  예약되지 않음
                </div>
              </div>

              {/* AI 자동 기록 */}
              <div className="border-b border-dashed border-gray-200 pb-3">
                <div className="text-sm text-gray-500 mb-1">AI 자동 기록</div>
                <div className="text-sm font-medium text-gray-900">
                  활성화됨
                </div>
              </div>

              {/* 학생 카메라 설정 */}
              <div className="border-b border-dashed border-gray-200 pb-3">
                <div className="text-sm text-gray-500 mb-1">
                  학생 카메라 설정
                </div>
                <div className="text-sm font-medium text-gray-900">
                  {cameraRequired ? "카메라 참여 필수" : "선택적 사용"}
                </div>
              </div>

              {/* 교안 */}
              <div className="border-b border-dashed border-gray-200 pb-3">
                <div className="text-sm text-gray-500 mb-1">교안</div>
                <div className="text-sm font-medium text-gray-900">
                  {getFileDisplayText()}
                </div>
              </div>
            </div>
          </div>
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
            onClick={onStart}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors duration-200 flex items-center space-x-2"
          >
            <Play className="w-4 h-4" />
            <span>시작하기</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default BroadcastSettingsModal;
