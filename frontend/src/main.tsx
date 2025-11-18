import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { ToastProvider } from "./contexts/ToastContext";

// 전역 에러 핸들러: 외부 스크립트(브라우저 확장 프로그램 등)의 에러를 안전하게 처리
window.addEventListener("error", (event) => {
  // animalese.js와 같은 외부 스크립트의 에러는 무시
  if (
    event.filename &&
    (event.filename.includes("animalese.js") ||
      event.filename.includes("extension://") ||
      event.filename.includes("chrome-extension://") ||
      event.filename.includes("moz-extension://"))
  ) {
    event.preventDefault();
    console.warn("외부 스크립트 에러 무시:", event.message, event.filename);
    return false;
  }
  return true;
});

// Promise rejection 핸들러
window.addEventListener("unhandledrejection", (event) => {
  // 외부 스크립트의 Promise rejection도 무시
  const errorMessage = event.reason?.message || String(event.reason || "");
  if (
    errorMessage.includes("animalese") ||
    errorMessage.includes("extension")
  ) {
    event.preventDefault();
    console.warn("외부 스크립트 Promise rejection 무시:", errorMessage);
    return false;
  }
  return true;
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </StrictMode>
);
