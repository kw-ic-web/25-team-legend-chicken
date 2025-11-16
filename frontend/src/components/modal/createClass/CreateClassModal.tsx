import React, { useMemo, useState } from "react";
import Modal from "../../common/Modal";

interface CreateClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    title: string;
    description: string;
    capacity: number;
    startDate: string;
    endDate: string;
    thumbnailFile?: File | null;
  }) => void | Promise<void>;
}

const CreateClassModal: React.FC<CreateClassModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const DESCRIPTION_MAX = 200;
  const descriptionCount = useMemo(() => description.length, [description]);
  const [capacity, setCapacity] = useState<string>("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setThumbnailFile(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedCapacity = Number(capacity) || 0;
    onSubmit({
      title,
      description,
      capacity: parsedCapacity,
      startDate,
      endDate,
      thumbnailFile,
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="강좌 개설" size="3xl">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* 썸네일 업로드 */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
          <p className="text-sm text-gray-600 mb-3">
            썸네일 이미지는 강좌 목록과 상세 페이지에 표시됩니다. (16:9 권장)
          </p>
          <label className="inline-flex items-center px-4 py-2 bg-blue-50 text-blue-700 rounded cursor-pointer hover:bg-blue-100">
            <span>이미지 업로드</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </label>
          {thumbnailFile && (
            <p className="mt-2 text-xs text-gray-500">{thumbnailFile.name}</p>
          )}
        </div>

        {/* 강좌명 */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">
            강좌명
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="강좌명을 입력해 주세요."
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        {/* 강좌 설명 */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">
            강좌 설명
          </label>
          <div className="relative">
            <textarea
              value={description}
              onChange={(e) =>
                setDescription(e.target.value.slice(0, DESCRIPTION_MAX))
              }
              placeholder="강좌에 대한 간단한 소개와 학습 목표를 작성해 주세요."
              rows={5}
              className="w-full min-h-24 resize-y border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400"
            />
            <div className="absolute -bottom-6 right-0 text-xs text-gray-400">
              {descriptionCount}/{DESCRIPTION_MAX}
            </div>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            • 강좌 목록과 상세 페이지에 노출됩니다. 간결하고 핵심만 작성해
            주세요.
          </p>
        </div>

        {/* 수강인원 */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">
            수강인원
          </label>
          <div className="flex items-center">
            <input
              type="number"
              min={0}
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              placeholder="0"
              className="w-32 border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="ml-2 text-gray-600">명</span>
          </div>
        </div>

        {/* 강좌 기간 */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">
            강좌 기간
          </label>
          <div className="flex items-center space-x-3">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <span className="text-gray-500">-</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
        </div>

        <div className="flex items-center justify-end space-x-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            취소
          </button>
          <button
            type="submit"
            className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
          >
            완료
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateClassModal;
