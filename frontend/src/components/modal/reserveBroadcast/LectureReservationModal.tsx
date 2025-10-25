import React, { useState } from "react";
import Modal from "../../common/Modal";

interface LectureReservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReserve: (reservationData: {
    title: string;
    date: string;
    time: string;
    participants: string;
  }) => void;
}

const LectureReservationModal: React.FC<LectureReservationModalProps> = ({
  isOpen,
  onClose,
  onReserve,
}) => {
  const [isAgreed, setIsAgreed] = useState(false);
  const [reservationData, setReservationData] = useState({
    title: "",
    date: "",
    time: "",
    participants: "수강생 전용",
  });

  const handleReserve = () => {
    if (
      isAgreed &&
      reservationData.title &&
      reservationData.date &&
      reservationData.time
    ) {
      onReserve(reservationData);
      onClose();
      // 폼 리셋
      setReservationData({
        title: "",
        date: "",
        time: "",
        participants: "수강생 전용",
      });
      setIsAgreed(false);
    }
  };

  const handleCancel = () => {
    onClose();
    setIsAgreed(false);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="강의 예약 전, 꼭 확인하세요!"
      size="lg"
    >
      <div className="space-y-6">
        {/* 안내 문구 */}
        <div className="text-sm text-gray-600">
          Lec-Q의 모든 실시간 강의는 학생 개인정보 보호와 공정한 학습 환경
          유지를 위해 아래 운영 가이드를 반드시 준수해야 합니다. '동의' 후
          강의를 예약하실 수 있습니다.
        </div>

        {/* 강의 예약 유의사항 */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            강의 예약 유의사항
          </h3>
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start space-x-2">
                <span className="text-blue-600 font-medium">•</span>
                <span>
                  예약은 강의 제목, 날짜, 시간, 참여 대상 정보를 모두 입력해야
                  완료됩니다.
                </span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-blue-600 font-medium">•</span>
                <span>
                  예약 완료 후에는 자동으로 학생 공지 및 알림이 발송됩니다.
                </span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-blue-600 font-medium">•</span>
                <span>
                  예약 변경 또는 취소는 강의 시작 24시간 전까지만 가능합니다.
                </span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-blue-600 font-medium">•</span>
                <span>
                  안정적인 진행을 위해 예약된 시간 10분 전 접속을 권장합니다.
                </span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-blue-600 font-medium">•</span>
                <span>
                  부득이한 사정으로 강의가 취소될 경우, 반드시 사유를 등록해
                  주세요.
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* 강의 예약 정보 입력 */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            강의 예약 정보
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                강의 제목 *
              </label>
              <input
                type="text"
                value={reservationData.title}
                onChange={(e) =>
                  setReservationData((prev) => ({
                    ...prev,
                    title: e.target.value,
                  }))
                }
                placeholder="강의 제목을 입력하세요"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  강의 날짜 *
                </label>
                <input
                  type="date"
                  value={reservationData.date}
                  onChange={(e) =>
                    setReservationData((prev) => ({
                      ...prev,
                      date: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  강의 시간 *
                </label>
                <input
                  type="time"
                  value={reservationData.time}
                  onChange={(e) =>
                    setReservationData((prev) => ({
                      ...prev,
                      time: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                참여 대상
              </label>
              <select
                value={reservationData.participants}
                onChange={(e) =>
                  setReservationData((prev) => ({
                    ...prev,
                    participants: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="수강생 전용">수강생 전용</option>
                <option value="공개">공개</option>
                <option value="링크가 있는 사용자">링크가 있는 사용자</option>
              </select>
            </div>
          </div>
        </div>

        {/* 동의 체크박스 */}
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

        {/* 하단 버튼 */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <button
            onClick={handleCancel}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors duration-200"
          >
            취소
          </button>
          <button
            onClick={handleReserve}
            disabled={
              !isAgreed ||
              !reservationData.title ||
              !reservationData.date ||
              !reservationData.time
            }
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-md transition-colors duration-200"
          >
            동의
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default LectureReservationModal;
