import React, { useRef, useEffect, useCallback, useState } from "react";
import { Socket } from "socket.io-client";

interface StudentPdfViewerProps {
  pdfUrl: string;
  pdfName: string;
  socket?: Socket | null;
}

const StudentPdfViewer: React.FC<StudentPdfViewerProps> = ({
  pdfUrl,
  pdfName,
  socket,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pdfIframeRef = useRef<HTMLIFrameElement>(null);
  const currentPageRef = useRef<number>(1);
  const isDrawingRef = useRef<boolean>(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  // 페이지별 캔버스 상태 저장 (페이지 번호 -> ImageData)
  const pageCanvasDataRef = useRef<Map<number, ImageData>>(new Map());
  // 현재 PDF URL 추적 (필기 복원을 위해 필요)
  const [currentPdfUrl, setCurrentPdfUrl] = useState(pdfUrl);

  // 현재 페이지의 캔버스 상태 복원
  const restorePageCanvas = useCallback((page: number) => {
    if (!canvasRef.current) {
      console.log("[StudentPdfViewer] 캔버스 ref 없음, 복원 불가:", page);
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      console.log("[StudentPdfViewer] 컨텍스트 없음, 복원 불가:", page);
      return;
    }

    if (canvas.width === 0 || canvas.height === 0) {
      console.log("[StudentPdfViewer] 캔버스 크기가 0, 복원 불가:", page, {
        width: canvas.width,
        height: canvas.height,
      });
      return;
    }

    const savedData = pageCanvasDataRef.current.get(page);
    console.log("[StudentPdfViewer] 필기 복원 시도:", page, {
      hasSavedData: !!savedData,
      canvasSize: { width: canvas.width, height: canvas.height },
      savedSize: savedData
        ? { width: savedData.width, height: savedData.height }
        : null,
    });

    // 항상 먼저 캔버스 초기화
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (savedData) {
      // 저장된 데이터의 크기가 현재 캔버스와 다를 수 있으므로 확인
      if (
        savedData.width === canvas.width &&
        savedData.height === canvas.height
      ) {
        ctx.putImageData(savedData, 0, 0);
        console.log("[StudentPdfViewer] 페이지 필기 복원 성공:", page);
      } else {
        // 크기가 다르면 초기화만 (복원 실패)
        console.log(
          "[StudentPdfViewer] 캔버스 크기 불일치, 복원 실패:",
          page,
          {
            saved: { width: savedData.width, height: savedData.height },
            current: { width: canvas.width, height: canvas.height },
          }
        );
      }
    } else {
      console.log("[StudentPdfViewer] 저장된 필기 없음, 초기화:", page);
    }
  }, []);

  // 현재 페이지의 캔버스 상태 저장
  const savePageCanvas = useCallback((page: number) => {
    if (!canvasRef.current) {
      console.log("[StudentPdfViewer] 캔버스 ref 없음, 저장 불가:", page);
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      console.log("[StudentPdfViewer] 컨텍스트 없음, 저장 불가:", page);
      return;
    }

    if (canvas.width === 0 || canvas.height === 0) {
      console.log("[StudentPdfViewer] 캔버스 크기가 0, 저장 불가:", page, {
        width: canvas.width,
        height: canvas.height,
      });
      return;
    }

    try {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      pageCanvasDataRef.current.set(page, imageData);
      const hasData = imageData.data.some(
        (pixel, index) => index % 4 !== 3 && pixel !== 0
      );
      console.log("[StudentPdfViewer] 페이지 필기 저장 성공:", page, {
        width: canvas.width,
        height: canvas.height,
        hasData: hasData,
      });
    } catch (error) {
      console.error("[StudentPdfViewer] 필기 저장 실패:", error, page);
    }
  }, []);

  // PDF iframe 스크롤 비활성화
  useEffect(() => {
    const disableIframeScroll = () => {
      if (pdfIframeRef.current && pdfIframeRef.current.contentDocument) {
        try {
          const iframeDoc = pdfIframeRef.current.contentDocument;
          const iframeBody = iframeDoc.body;
          if (iframeBody) {
            iframeBody.style.overflow = "hidden";
            iframeBody.style.position = "relative";
          }
          const iframeHtml = iframeDoc.documentElement;
          if (iframeHtml) {
            iframeHtml.style.overflow = "hidden";
            iframeHtml.style.height = "100%";
          }
        } catch (e) {
          // Cross-origin 제한으로 접근 불가능할 수 있음 (정상)
        }
      }
    };

    // iframe 로드 후 스크롤 비활성화 시도
    if (pdfIframeRef.current) {
      pdfIframeRef.current.onload = () => {
        setTimeout(disableIframeScroll, 100);
      };
      // 이미 로드된 경우에도 시도
      setTimeout(disableIframeScroll, 500);
    }
  }, [currentPdfUrl]);

  // PDF 로드 후 캔버스 크기 조정
  useEffect(() => {
    const adjustCanvasSize = () => {
      if (containerRef.current && canvasRef.current) {
        const container = containerRef.current;
        const canvas = canvasRef.current;

        const rect = container.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;

        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;

        // 캔버스 크기 조정 후 현재 페이지 필기 복원
        if (rect.width > 0 && rect.height > 0) {
          setTimeout(() => {
            restorePageCanvas(currentPageRef.current);
          }, 100);
        }
      }
    };

    adjustCanvasSize();
    window.addEventListener("resize", adjustCanvasSize);

    return () => {
      window.removeEventListener("resize", adjustCanvasSize);
    };
  }, [restorePageCanvas]);

  // PDF URL 변경 후 필기 복원 (교수자 코드와 동일한 로직)
  useEffect(() => {
    if (!canvasRef.current || !currentPdfUrl) return;

    // 캔버스가 준비될 때까지 대기
    const checkAndRestore = (retryCount = 0) => {
      if (retryCount > 10) {
        console.log(
          "[StudentPdfViewer] 복원 시도 실패 (최대 재시도 횟수 초과):",
          currentPageRef.current
        );
        return;
      }

      if (
        canvasRef.current &&
        canvasRef.current.width > 0 &&
        canvasRef.current.height > 0
      ) {
        restorePageCanvas(currentPageRef.current);
      } else {
        // 캔버스가 아직 준비되지 않았으면 다시 시도
        setTimeout(() => checkAndRestore(retryCount + 1), 100);
      }
    };

    // PDF 로드 후 필기 복원 (약간의 지연을 두어 PDF 로드 후 복원)
    const timer = setTimeout(() => {
      checkAndRestore();
    }, 300);

    return () => clearTimeout(timer);
  }, [currentPdfUrl, restorePageCanvas]);

  // 초기 마운트 시 필기 복원
  useEffect(() => {
    if (!canvasRef.current || !currentPdfUrl) return;

    const checkAndRestore = (retryCount = 0) => {
      if (retryCount > 15) {
        console.log(
          "[StudentPdfViewer] 초기 복원 시도 실패 (최대 재시도 횟수 초과):",
          currentPageRef.current
        );
        return;
      }

      if (
        canvasRef.current &&
        canvasRef.current.width > 0 &&
        canvasRef.current.height > 0
      ) {
        restorePageCanvas(currentPageRef.current);
      } else {
        setTimeout(() => checkAndRestore(retryCount + 1), 100);
      }
    };

    const timer = setTimeout(() => {
      checkAndRestore();
    }, 500);

    return () => clearTimeout(timer);
  }, []); // 초기 마운트 시에만 실행

  // Socket.io 이벤트 리스너
  useEffect(() => {
    if (!socket) return;

    const handleWhiteboardDraw = (data: {
      type: "start" | "draw" | "end" | "clear";
      data?: { x: number; y: number };
      brushSize?: number;
      brushColor?: string;
      isEraser?: boolean;
      page?: number;
      containerWidth?: number;
      containerHeight?: number;
    }) => {
      if (!canvasRef.current || !containerRef.current) return;

      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const container = containerRef.current;
      const rect = container.getBoundingClientRect();

      // 페이지가 변경되었으면 캔버스 초기화 및 PDF 페이지 변경
      // (이 부분은 handlePageChange에서 처리되므로 여기서는 제거)

      if (data.type === "clear") {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        lastPointRef.current = null;
        isDrawingRef.current = false;
        return;
      }

      if (!data.data) return;

      // 정규화된 좌표를 실제 캔버스 좌표로 변환
      const x = data.data.x * rect.width;
      const y = data.data.y * rect.height;

      if (data.type === "start") {
        // 그리기 시작 시 색깔과 브러시 설정
        ctx.lineWidth = data.brushSize || 3;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        if (data.isEraser) {
          ctx.globalCompositeOperation = "destination-out";
        } else {
          ctx.globalCompositeOperation = "source-over";
          ctx.strokeStyle = data.brushColor || "#000000";
        }

        ctx.beginPath();
        ctx.moveTo(x, y);
        lastPointRef.current = { x, y };
        isDrawingRef.current = true;
      } else if (data.type === "draw" && isDrawingRef.current) {
        // 그리기 중에도 색깔과 브러시 설정 업데이트
        ctx.lineWidth = data.brushSize || 3;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        if (data.isEraser) {
          ctx.globalCompositeOperation = "destination-out";
        } else {
          ctx.globalCompositeOperation = "source-over";
          ctx.strokeStyle = data.brushColor || "#000000";
        }

        if (lastPointRef.current) {
          ctx.beginPath();
          ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
          ctx.lineTo(x, y);
          ctx.stroke();
        }
        lastPointRef.current = { x, y };
      } else if (data.type === "end") {
        // 그리기 종료 시에도 색깔과 브러시 설정
        ctx.lineWidth = data.brushSize || 3;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        if (data.isEraser) {
          ctx.globalCompositeOperation = "destination-out";
        } else {
          ctx.globalCompositeOperation = "source-over";
          ctx.strokeStyle = data.brushColor || "#000000";
        }

        if (lastPointRef.current) {
          ctx.beginPath();
          ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
          ctx.lineTo(x, y);
          ctx.stroke();
        }
        lastPointRef.current = null;
        isDrawingRef.current = false;

        // 그리기 종료 시 현재 페이지 필기 저장
        savePageCanvas(currentPageRef.current);
      }
    };

    const handlePageChange = (data: { page: number; pdf_url?: string }) => {
      console.log("[StudentPdfViewer] 페이지 변경 수신:", data);
      if (!canvasRef.current) return;

      // 현재 페이지의 필기 저장 (페이지 변경 전에 저장)
      const currentPageToSave = currentPageRef.current;
      if (canvasRef.current.width > 0 && canvasRef.current.height > 0) {
        const ctx = canvasRef.current.getContext("2d");
        if (ctx) {
          try {
            const imageData = ctx.getImageData(
              0,
              0,
              canvasRef.current.width,
              canvasRef.current.height
            );
            pageCanvasDataRef.current.set(currentPageToSave, imageData);
            console.log(
              "[StudentPdfViewer] 현재 페이지 필기 저장:",
              currentPageToSave
            );
          } catch (error) {
            console.error("[StudentPdfViewer] 필기 저장 실패:", error);
          }
        }
      }

      // 새 페이지로 변경
      currentPageRef.current = data.page;
      lastPointRef.current = null;
      isDrawingRef.current = false;

      // 페이지별 PDF URL 사용 (없으면 원본 PDF 사용)
      const pdfUrlForPage = data.pdf_url || pdfUrl;

      // currentPdfUrl state 업데이트 (이것이 변경되면 useEffect에서 필기 복원)
      setCurrentPdfUrl(pdfUrlForPage);

      // PDF iframe 페이지 변경 (zoom을 page-fit으로 변경하여 스크롤 방지)
      if (pdfIframeRef.current) {
        pdfIframeRef.current.src = `${pdfUrlForPage}#page=${data.page}&zoom=page-fit&toolbar=0&navpanes=0&scrollbar=0`;
        console.log("[StudentPdfViewer] PDF iframe 페이지 변경:", {
          page: data.page,
          pdf_url: pdfUrlForPage,
        });
      }

      // 필기 복원은 currentPdfUrl 변경으로 인한 useEffect에서 처리됨
    };

    // 페이지 전체 스냅샷 수신 (과거 필기 복원용)
    const handlePageState = (data: { page: number; image: string }) => {
      console.log("[StudentPdfViewer] 페이지 스냅샷 수신:", data.page);
      if (!canvasRef.current || !containerRef.current) return;

      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const img = new Image();
      img.onload = () => {
        const rect = containerRef.current!.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // 스냅샷을 페이지별 필기 상태로 저장
        try {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          pageCanvasDataRef.current.set(data.page, imageData);
          console.log(
            "[StudentPdfViewer] 페이지 스냅샷 저장 완료:",
            data.page
          );
        } catch (error) {
          console.error("[StudentPdfViewer] 스냅샷 저장 실패:", error);
        }
      };
      img.src = data.image;
    };

    socket.on("whiteboard:draw", handleWhiteboardDraw);
    socket.on("whiteboard:page-change", handlePageChange);
    socket.on("whiteboard:page-state", handlePageState);

    return () => {
      socket.off("whiteboard:draw", handleWhiteboardDraw);
      socket.off("whiteboard:page-change", handlePageChange);
      socket.off("whiteboard:page-state", handlePageState);
    };
  }, [socket, pdfUrl, savePageCanvas, restorePageCanvas]);

  return (
    <div className="w-full h-full bg-white rounded-xl flex flex-col overflow-hidden shadow-lg">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 bg-gray-50 flex-shrink-0">
        <div>
          <p className="text-sm font-semibold text-gray-900">공유 중인 PDF</p>
          <p className="text-xs text-gray-500 truncate max-w-xs">{pdfName}</p>
        </div>
      </div>

      {/* PDF + 필기 영역 */}
      <div 
        ref={containerRef} 
        className="flex-1 relative overflow-hidden"
        style={{ overflow: "hidden" }}
      >
        <iframe
          ref={pdfIframeRef}
          src={`${currentPdfUrl}#page=${currentPageRef.current}&zoom=page-fit&toolbar=0&navpanes=0&scrollbar=0`}
          title="공유 중인 PDF"
          className="absolute inset-0 w-full h-full"
          style={{ 
            pointerEvents: "none",
            overflow: "hidden",
            border: "none",
            display: "block"
          }}
          scrolling="no"
          allow="fullscreen"
        />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
        />
      </div>
    </div>
  );
};

export default StudentPdfViewer;
