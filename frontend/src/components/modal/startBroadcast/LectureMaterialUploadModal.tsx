import React, { useState, useRef } from "react";
import { Upload, X, Download } from "lucide-react";
import Modal from "../../common/Modal";
import BroadcastSettingsModal from "./BroadcastSettingsModal";

interface LectureMaterialUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBack: () => void;
  onNext: (files: File[], cameraRequired: boolean) => void;
  cameraRequired: boolean;
}

const LectureMaterialUploadModal: React.FC<LectureMaterialUploadModalProps> = ({
  isOpen,
  onClose,
  onBack,
  onNext,
  cameraRequired,
}) => {
  const [files, setFiles] = useState<File[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showBroadcastSettings, setShowBroadcastSettings] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const maxFiles = 5;

  const handleFileSelect = (selectedFiles: FileList | null) => {
    if (!selectedFiles) return;

    const newFiles = Array.from(selectedFiles);
    const remainingSlots = maxFiles - files.length;
    const filesToAdd = newFiles.slice(0, remainingSlots);

    setFiles((prev) => [...prev, ...filesToAdd]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const clearAllFiles = () => {
    setFiles([]);
  };

  const handleNext = () => {
    onClose(); // 교안 업로드 모달 닫기
    setShowBroadcastSettings(true);
  };

  const handleBroadcastStart = () => {
    onNext(files, cameraRequired);
    setShowBroadcastSettings(false);
  };

  const handleBroadcastBack = () => {
    setShowBroadcastSettings(false);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="교안 업로드" size="lg">
        <div className="space-y-6">
          <div className="space-y-2">
            <p className="text-gray-700 text-sm">
              Lec-Q는 강의 교안을 기반으로 실시간 질문 인식 및 AI 분석을
              수행합니다.
            </p>
            <p className="text-gray-700 text-sm">
              교안을 업로드하면 주요 키워드와 페이지별 정보가 자동으로
              연결됩니다.
            </p>
          </div>

          {/* 파일 업로드 영역 */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors duration-200 ${
              isDragOver
                ? "border-blue-400 bg-blue-50"
                : "border-gray-300 hover:border-gray-400"
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">
              첨부한 파일을 여기에 끌어다 놓거나, 파일 선택 버튼을 직접
              선택해주세요.
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200"
            >
              <Download className="w-4 h-4" />
              <span>파일 선택</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.ppt,.pptx"
              onChange={(e) => handleFileSelect(e.target.files)}
              className="hidden"
            />
          </div>

          {/* 파일 상태 및 관리 */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">
              {files.length}개 / {maxFiles}개
            </span>
            {files.length > 0 && (
              <button
                onClick={clearAllFiles}
                className="text-sm text-red-600 hover:text-red-700 flex items-center space-x-1"
              >
                <span>전체 파일 삭제</span>
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* 업로드된 파일 목록 */}
          {files.length > 0 && (
            <div className="space-y-2">
              {files.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      [ {formatFileSize(file.size)} ]
                    </p>
                  </div>
                  <button
                    onClick={() => removeFile(index)}
                    className="ml-2 p-1 text-gray-400 hover:text-red-500 transition-colors duration-200 flex items-center space-x-1"
                  >
                    <span>삭제</span>
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

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

      {/* 방송 설정 모달 */}
      <BroadcastSettingsModal
        isOpen={showBroadcastSettings}
        onClose={onClose}
        onBack={handleBroadcastBack}
        onStart={handleBroadcastStart}
        cameraRequired={cameraRequired}
        files={files}
      />
    </>
  );
};

export default LectureMaterialUploadModal;
