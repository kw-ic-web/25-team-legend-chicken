import React, { useRef, useEffect } from "react";
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
      }
    };

    adjustCanvasSize();
    window.addEventListener("resize", adjustCanvasSize);

    return () => {
      window.removeEventListener("resize", adjustCanvasSize);
    };
  }, []);

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
      }
    };

    const handlePageChange = (data: { page: number; pdf_url?: string }) => {
      console.log("[StudentPdfViewer] 페이지 변경 수신:", data);
      if (!canvasRef.current) return;

      const ctx = canvasRef.current.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }

      currentPageRef.current = data.page;
      lastPointRef.current = null;
      isDrawingRef.current = false;

      // 페이지별 PDF URL 사용 (없으면 원본 PDF 사용)
      const pdfUrlForPage = data.pdf_url || pdfUrl;

      // PDF iframe 페이지 변경
      if (pdfIframeRef.current) {
        pdfIframeRef.current.src = `${pdfUrlForPage}#zoom=page-width&toolbar=0&navpanes=0&scrollbar=0`;
        console.log("[StudentPdfViewer] PDF iframe 페이지 변경:", {
          page: data.page,
          pdf_url: pdfUrlForPage,
        });
      }
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
  }, [socket, pdfUrl]);

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
      <div ref={containerRef} className="flex-1 relative overflow-hidden">
        <iframe
          ref={pdfIframeRef}
          src={`${pdfUrl}#page=${currentPageRef.current}&zoom=page-width&toolbar=0&navpanes=0&scrollbar=0`}
          title="공유 중인 PDF"
          className="absolute inset-0 w-full h-full"
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
