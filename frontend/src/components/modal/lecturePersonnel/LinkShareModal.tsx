import React, { useState, useEffect } from "react";
import { Copy, X } from "lucide-react";
import Modal from "../../common/Modal";
import Toast from "../../common/Toast";
import { getMembers } from "../../../api/professor";
import { getBaseUrl } from "../../../api/auth/client";

interface LinkShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  lectureId: string;
  onSwitchToId?: () => void;
}

const LinkShareModal: React.FC<LinkShareModalProps> = ({
  isOpen,
  onClose,
  lectureId,
  onSwitchToId,
}) => {
  const [activeTab, setActiveTab] = useState<"link" | "id">("link");
  const [inviteLink, setInviteLink] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  // 초대 링크 가져오기
  useEffect(() => {
    if (isOpen && lectureId) {
      const fetchInviteLink = async () => {
        setIsLoading(true);
        try {
          const response = await getMembers(lectureId);
          let link = response.invite_link;
          
          // 링크가 상대 경로인 경우 전체 URL로 변환
          if (link && !link.startsWith("http")) {
            const baseUrl = getBaseUrl();
            if (link.startsWith("/")) {
              link = `${baseUrl}${link}`;
            } else {
              link = `${baseUrl}/${link}`;
            }
          }
          
          setInviteLink(link || "");
        } catch (error) {
          console.error("초대 링크 가져오기 실패:", error);
          setToast({
            message: "초대 링크를 가져오는데 실패했습니다.",
            type: "error",
          });
        } finally {
          setIsLoading(false);
        }
      };

      fetchInviteLink();
    }
  }, [isOpen, lectureId]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setToast({ message: "링크가 복사되었습니다!", type: "success" });
    } catch (error) {
      console.error("링크 복사 실패:", error);
      setToast({ message: "링크 복사에 실패했습니다.", type: "error" });
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} showHeader={false} size="md">
      <div className="space-y-4">
        {/* 탭 헤더와 X 버튼 */}
        <div className="flex items-center justify-between">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab("link")}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors duration-200 ${
                activeTab === "link"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              링크 공유
            </button>
            <button
              onClick={onSwitchToId}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors duration-200 ${
                activeTab === "id"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              아이디 초대
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
          {/* 링크 공유 탭 */}
          <div
            className={`transition-all duration-300 ease-in-out ${
              activeTab === "link"
                ? "opacity-100 translate-x-0"
                : "opacity-0 translate-x-full absolute inset-0"
            }`}
          >
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  초대 링크 공유
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  학생에게 공유할 강의 전용 링크입니다.
                </p>
              </div>

              <div className="space-y-3">
                {isLoading ? (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <div className="text-sm text-gray-500">링크를 불러오는 중...</div>
                  </div>
                ) : inviteLink ? (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <div className="text-sm text-gray-600 break-all">
                      {inviteLink}
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <div className="text-sm text-gray-500">링크를 불러올 수 없습니다.</div>
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    onClick={handleCopyLink}
                    disabled={!inviteLink || isLoading}
                    className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Copy className="w-4 h-4" />
                    <span>URL 복사</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 아이디 초대 탭 */}
          <div
            className={`transition-all duration-300 ease-in-out ${
              activeTab === "id"
                ? "opacity-100 translate-x-0"
                : "opacity-0 translate-x-full absolute inset-0"
            }`}
          >
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  아이디 초대
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  학생이 수락하면 자동으로 등록됩니다.
                </p>
              </div>

              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="학생의 아이디를 입력하세요."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />

                <div className="flex justify-end">
                  <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors duration-200">
                    초대 보내기
                  </button>
                </div>
              </div>
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

export default LinkShareModal;
