import React, { useRef, useEffect, useState, useCallback } from "react";
import { Eraser, X } from "lucide-react";
import { Socket } from "socket.io-client";

interface WhiteboardPage {
  page_number: number;
  image_path: string;
  pdf_path: string;
  text: string;
  status: string;
}

interface AnnotatablePdfViewerProps {
  pdfUrl: string;
  pdfName: string;
  onStop: () => void;
  onCapture?: (imageData: string, timestamp: number) => void;
  lectureId?: string;
  classId?: number;
  socket?: Socket | null;
  currentPage?: number;
  onPageChange?: (page: number) => void;
  whiteboardPages?: WhiteboardPage[];
}

const AnnotatablePdfViewer: React.FC<AnnotatablePdfViewerProps> = ({
  pdfUrl,
  pdfName,
  onStop,
  onCapture,
  lectureId,
  classId,
  socket,
  currentPage = 1,
  onPageChange,
  whiteboardPages = [],
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pdfIframeRef = useRef<HTMLIFrameElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEraser, setIsEraser] = useState(false);
  const [brushSize, setBrushSize] = useState(3);
  const [brushColor, setBrushColor] = useState("#000000");
  const captureIntervalRef = useRef<number | null>(null);
  const lastCaptureTimeRef = useRef<number>(0);
  const [pdfPage, setPdfPage] = useState(currentPage);
  const [currentPdfUrl, setCurrentPdfUrl] = useState(pdfUrl);

  // Whiteboard pages가 있으면 해당 페이지의 PDF를 사용
  useEffect(() => {
    if (whiteboardPages.length > 0) {
      const pageData = whiteboardPages.find(p => p.page_number === pdfPage);
      if (pageData && pageData.pdf_path) {
        setCurrentPdfUrl(pageData.pdf_path);
        console.log("[AnnotatablePdfViewer] 페이지별 PDF 로드:", {
          page: pdfPage,
          pdf_path: pageData.pdf_path,
        });
      } else {
        // 해당 페이지가 없으면 원본 PDF 사용
        setCurrentPdfUrl(pdfUrl);
      }
    } else {
      setCurrentPdfUrl(pdfUrl);
    }
  }, [pdfPage, whiteboardPages, pdfUrl]);

  // PDF 로드 후 캔버스 크기 조정
  useEffect(() => {
    const adjustCanvasSize = () => {
      if (containerRef.current && canvasRef.current && pdfIframeRef.current) {
        const container = containerRef.current;
        const canvas = canvasRef.current;
        const iframe = pdfIframeRef.current;
        
        // iframe의 실제 크기 가져오기
        const rect = container.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
        
        // Canvas 스타일도 조정
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;
      }
    };

    adjustCanvasSize();
    window.addEventListener("resize", adjustCanvasSize);
    
    return () => {
      window.removeEventListener("resize", adjustCanvasSize);
    };
  }, []);

  // 5초마다 캡쳐
  useEffect(() => {
    if (!onCapture) return;

    const capture = async () => {
      if (!containerRef.current || !canvasRef.current) return;

      try {
        const container = containerRef.current;
        const canvas = canvasRef.current;

        // 임시 canvas 생성 (전체 컨테이너 크기)
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = container.offsetWidth;
        tempCanvas.height = container.offsetHeight;
        const tempCtx = tempCanvas.getContext("2d");
        
        if (!tempCtx) return;

        // 배경을 흰색으로
        tempCtx.fillStyle = "#FFFFFF";
        tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

        // Canvas의 필기 내용 복사
        // PDF는 서버에서 합칠 예정이므로, 필기 내용만 캡쳐
        tempCtx.drawImage(canvas, 0, 0);

        // Canvas를 base64로 변환
        const imageData = tempCanvas.toDataURL("image/jpeg", 0.9);
        const timestamp = Date.now();
        
        // PDF URL과 함께 전달 (서버에서 PDF와 필기를 합치기 위해)
        onCapture(imageData, timestamp);
        lastCaptureTimeRef.current = timestamp;
      } catch (error) {
        console.error("캡쳐 실패:", error);
      }
    };

    // 5초마다 캡쳐
    captureIntervalRef.current = window.setInterval(capture, 5000);

    return () => {
      if (captureIntervalRef.current) {
        clearInterval(captureIntervalRef.current);
      }
    };
  }, [onCapture]);

  // 필기 데이터를 Socket.io로 전송
  const sendDrawingEvent = useCallback((type: "start" | "draw" | "end" | "clear", data?: { x: number; y: number }) => {
    if (!socket || !lectureId || classId === undefined) return;
    
    const container = containerRef.current;
    if (!container) return;
    
    const rect = container.getBoundingClientRect();
    const normalizedData = data ? {
      x: data.x / rect.width,
      y: data.y / rect.height,
    } : undefined;

    socket.emit("whiteboard:draw", {
      type,
      data: normalizedData,
      brushSize,
      brushColor,
      isEraser,
      page: pdfPage,
      containerWidth: rect.width,
      containerHeight: rect.height,
    });
  }, [socket, lectureId, classId, brushSize, brushColor, isEraser, pdfPage]);

  // 그리기 시작
  const startDrawing = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    
    // Socket.io로 전송
    sendDrawingEvent("start", { x, y });
  }, [sendDrawingEvent]);

  // 그리기 중
  const draw = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.lineWidth = brushSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (isEraser) {
      ctx.globalCompositeOperation = "destination-out";
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = brushColor;
    }

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
    
    // Socket.io로 전송
    sendDrawingEvent("draw", { x, y });
  }, [isDrawing, brushSize, brushColor, isEraser, sendDrawingEvent]);

  // 그리기 종료
  const stopDrawing = useCallback(() => {
    if (!canvasRef.current) return;
    
    const ctx = canvasRef.current.getContext("2d");
    if (ctx) {
      ctx.beginPath();
    }
    setIsDrawing(false);
    
    // Socket.io로 전송
    sendDrawingEvent("end");
  }, [sendDrawingEvent]);

  // 전체 지우기
  const clearCanvas = useCallback(() => {
    if (!canvasRef.current) return;
    
    const ctx = canvasRef.current.getContext("2d");
    if (ctx) {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
    
    // Socket.io로 전송
    sendDrawingEvent("clear");
  }, [sendDrawingEvent]);

  // 페이지 변경
  const changePage = useCallback((newPage: number) => {
    console.log("[AnnotatablePdfViewer] 페이지 변경 시도:", newPage);
    if (newPage < 1) {
      console.log("[AnnotatablePdfViewer] 페이지 번호가 1보다 작음");
      return;
    }
    
    // 캔버스 초기화
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }
    
    // 페이지 상태 업데이트
    setPdfPage(newPage);
    if (onPageChange) {
      onPageChange(newPage);
    }
    
    // Whiteboard pages에서 해당 페이지의 PDF 찾기
    const pageData = whiteboardPages.find(p => p.page_number === newPage);
    const pdfToLoad = pageData?.pdf_path || pdfUrl;
    
    // PDF iframe 페이지 변경
    if (pdfIframeRef.current) {
      const newSrc = `${pdfToLoad}#zoom=page-width&toolbar=0&navpanes=0&scrollbar=0`;
      console.log("[AnnotatablePdfViewer] PDF iframe src 변경:", {
        page: newPage,
        pdf_path: pdfToLoad,
        src: newSrc,
      });
      pdfIframeRef.current.src = newSrc;
    }
    
    // Socket.io로 페이지 변경 전송 (페이지별 PDF URL 포함)
    if (socket && lectureId && classId !== undefined) {
      const pageData = whiteboardPages.find(p => p.page_number === newPage);
      const pdfUrlForPage = pageData?.pdf_path || pdfUrl;
      console.log("[AnnotatablePdfViewer] Socket.io로 페이지 변경 전송:", {
        page: newPage,
        pdf_url: pdfUrlForPage,
      });
      socket.emit("whiteboard:page-change", {
        page: newPage,
        pdf_url: pdfUrlForPage,
        lecture_id: lectureId,
        class_id: classId,
      });
    } else {
      console.log("[AnnotatablePdfViewer] Socket 또는 ID가 없음:", { socket: !!socket, lectureId, classId });
    }
  }, [socket, lectureId, classId, pdfUrl, onPageChange, whiteboardPages]);

  return (
    <div className="w-full h-full bg-white flex flex-col overflow-hidden rounded-xl shadow-lg">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 bg-gray-50">
        <div>
          <p className="text-sm font-semibold text-gray-900">공유 중인 PDF</p>
          <p className="text-xs text-gray-500 truncate max-w-xs">{pdfName}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* 페이지 네비게이션 */}
          <div className="flex items-center gap-1 px-2 py-1 bg-white rounded-lg border border-gray-200">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                changePage(pdfPage - 1);
              }}
              disabled={pdfPage <= 1}
              className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              이전
            </button>
            <span className="px-2 py-1 text-xs text-gray-700">
              {pdfPage} {whiteboardPages.length > 0 && `/ ${whiteboardPages.length}`}
            </span>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                changePage(pdfPage + 1);
              }}
              disabled={whiteboardPages.length > 0 && pdfPage >= whiteboardPages.length}
              className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              다음
            </button>
          </div>
          {/* 필기 도구 */}
          <div className="flex items-center gap-2 px-2 py-1 bg-white rounded-lg border border-gray-200">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsEraser(false);
              }}
              className={`px-2 py-1 text-xs rounded ${
                !isEraser
                  ? "bg-blue-100 text-blue-700"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              펜
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsEraser(true);
              }}
              className={`px-2 py-1 text-xs rounded ${
                isEraser
                  ? "bg-blue-100 text-blue-700"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <Eraser className="w-3 h-3" />
            </button>
            <input
              type="color"
              value={brushColor}
              onChange={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setBrushColor(e.target.value);
              }}
              onClick={(e) => {
                e.stopPropagation();
              }}
              className="w-6 h-6 border border-gray-300 rounded cursor-pointer"
              disabled={isEraser}
            />
            <input
              type="range"
              min="1"
              max="10"
              value={brushSize}
              onChange={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setBrushSize(Number(e.target.value));
              }}
              onClick={(e) => {
                e.stopPropagation();
              }}
              className="w-20"
            />
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                clearCanvas();
              }}
              className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded"
            >
              전체 지우기
            </button>
          </div>
          <a
            href={pdfUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-semibold text-blue-600 hover:text-blue-700"
          >
            새 창에서 열기
          </a>
          <button
            onClick={onStop}
            className="px-3 py-1.5 text-xs font-semibold text-white bg-gray-800 rounded-lg hover:bg-gray-900 transition-colors"
          >
            공유 종료
          </button>
        </div>
      </div>

      {/* PDF + 필기 영역 */}
      <div ref={containerRef} className="flex-1 relative overflow-hidden">
        <iframe
          ref={pdfIframeRef}
          src={`${currentPdfUrl}#zoom=page-width&toolbar=0&navpanes=0&scrollbar=0`}
          title="공유 중인 PDF"
          className="absolute inset-0 w-full h-full"
          style={{ pointerEvents: 'none' }}
        />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full cursor-crosshair"
          style={{ zIndex: 10 }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
        />
      </div>
    </div>
  );
};

export default AnnotatablePdfViewer;

