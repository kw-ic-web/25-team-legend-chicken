import React, { useEffect } from "react";
import { X } from "lucide-react";
import clsx from "clsx";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  showCloseButton?: boolean;
  showHeader?: boolean;
  size?:
    | "sm"
    | "md"
    | "lg"
    | "xl"
    | "2xl"
    | "3xl"
    | "4xl"
    | "5xl"
    | "6xl"
    | "7xl"
    | "full";
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  showCloseButton = true,
  showHeader = true,
  size = "md",
}) => {
  // ESC 키로 모달 닫기
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      // 모달이 열릴 때 body 스크롤 방지
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 배경 오버레이 */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* 모달 컨테이너 */}
      <div
        className={clsx(
          "relative bg-white rounded-lg shadow-xl w-full mx-4 max-h-[90vh] overflow-y-auto",
          {
            "max-w-sm": size === "sm",
            "max-w-md": size === "md",
            "max-w-lg": size === "lg",
            "max-w-xl": size === "xl",
            "max-w-2xl": size === "2xl",
            "max-w-3xl": size === "3xl",
            "max-w-4xl": size === "4xl",
            "max-w-5xl": size === "5xl",
            "max-w-6xl": size === "6xl",
            "max-w-7xl": size === "7xl",
            "max-w-full": size === "full",
          }
        )}
      >
        {/* 헤더 */}
        {showHeader && (
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            {title && (
              <h2 className="text-xl font-bold text-gray-900">{title}</h2>
            )}
            {showCloseButton && (
              <button
                onClick={onClose}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors duration-200"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            )}
          </div>
        )}

        {/* 컨텐츠 */}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

export default Modal;
