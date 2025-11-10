import React, { useState } from "react";
import { X } from "lucide-react";
import Modal from "../../common/Modal";
import Toast from "../../common/Toast";
import { inviteStudent } from "../../../api/professor";

interface IdInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  lectureId: string;
  onInvite?: (studentEmail: string) => void;
  onSwitchToLink?: () => void;
}

const IdInviteModal: React.FC<IdInviteModalProps> = ({
  isOpen,
  onClose,
  lectureId,
  onInvite,
  onSwitchToLink,
}) => {
  const [studentEmail, setStudentEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!studentEmail.trim()) {
      setToast({ message: "학생 이메일을 입력해주세요.", type: "error" });
      return;
    }

    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(studentEmail.trim())) {
      setToast({
        message: "올바른 이메일 형식을 입력해주세요.",
        type: "error",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await inviteStudent(lectureId, {
        student_email: studentEmail.trim(),
      });

      setToast({
        message: response.message || "초대가 성공적으로 전송되었습니다!",
        type: "success",
      });
      setStudentEmail("");

      if (onInvite) {
        onInvite(studentEmail.trim());
      }

      // 성공 후 잠시 후 모달 닫기 (선택사항)
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "초대 전송 중 오류가 발생했습니다.";
      setToast({ message: errorMessage, type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} showHeader={false} size="md">
      <div className="space-y-4">
        {/* 탭 헤더와 X 버튼 */}
        <div className="flex items-center justify-between">
          <div className="flex border-b border-gray-200">
            <button
              onClick={onSwitchToLink}
              className="px-4 py-2 text-sm font-medium border-b-2 border-transparent text-gray-500 hover:text-gray-700 transition-colors duration-200"
            >
              링크 공유
            </button>
            <button className="px-4 py-2 text-sm font-medium border-b-2 border-blue-500 text-blue-600">
              이메일 초대
            </button>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors duration-200"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* 탭 컨텐츠 */}
        <div className="relative overflow-hidden">
          {/* 이메일 초대 탭 */}
          <div className="transition-all duration-300 ease-in-out opacity-100 translate-x-0">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  이메일 초대
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  학생 이메일로 초대를 보내면 자동으로 등록됩니다.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
                <input
                  type="email"
                  value={studentEmail}
                  onChange={(e) => setStudentEmail(e.target.value)}
                  placeholder="학생의 이메일을 입력하세요."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  disabled={isLoading}
                />

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? "전송 중..." : "초대 보내기"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </Modal>
  );
};

export default IdInviteModal;
