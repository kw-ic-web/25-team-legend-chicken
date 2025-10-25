import { useEffect, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";

interface ToastProps {
  message: string;
  type: "success" | "error";
  onClose: () => void;
  duration?: number;
}

export default function Toast({
  message,
  type,
  onClose,
  duration = 3000,
}: ToastProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // fade-in
    setIsVisible(true);

    // fade-out 시작 시간
    const fadeOutTime = duration - 300; // 300ms는 fade-out 애니메이션 시간

    const fadeOutTimer = setTimeout(() => {
      setIsVisible(false);
    }, fadeOutTime);

    // 완전히 사라지는 시간
    const closeTimer = setTimeout(() => {
      onClose();
    }, duration);

    return () => {
      clearTimeout(fadeOutTimer);
      clearTimeout(closeTimer);
    };
  }, [duration, onClose]);

  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
      role="status"
      aria-live="polite"
    >
      <div
        className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl shadow-lg transition-all duration-300 flex-nowrap whitespace-nowrap backdrop-blur-xl border border-white/20 ring-1 ring-white/10 ${
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
        } bg-black/80 text-white`}
      >
        {type === "success" ? (
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
        ) : (
          <XCircle className="w-5 h-5 text-red-400" />
        )}
        <span className="whitespace-nowrap text-[13px] font-medium">
          {message}
        </span>
      </div>
    </div>
  );
}
