import React from "react";

interface PdfViewerProps {
  pdfUrl?: string;
  fileName?: string;
  week?: number;
}

const PdfViewer: React.FC<PdfViewerProps> = ({ pdfUrl, fileName, week }) => {
  return (
    <div className="flex flex-col h-full">
      {/* PDF 뷰어 영역 */}
      <div className="flex-1 bg-white border border-gray-200 rounded-lg overflow-hidden mb-4">
        {pdfUrl ? (
          <iframe
            src={pdfUrl}
            className="w-full h-full min-h-[600px]"
            title="PDF Viewer"
          />
        ) : (
          <div className="w-full h-full min-h-[600px] flex items-center justify-center">
            <p className="text-gray-400 text-lg">pdf</p>
          </div>
        )}
      </div>

      {/* 파일명 표시 */}
      {fileName && (
        <div className="text-sm text-gray-600">
          {week ? `${week}주차` : ""} - {fileName}
        </div>
      )}
    </div>
  );
};

export default PdfViewer;

