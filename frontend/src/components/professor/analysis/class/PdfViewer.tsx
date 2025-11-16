import React from "react";
import { FileText } from "lucide-react";

interface PdfViewerProps {
  pdfUrl?: string;
  fileName?: string;
  week?: number;
}

const PdfViewer: React.FC<PdfViewerProps> = ({ pdfUrl, fileName, week }) => {
  return (
    <div className="flex flex-col h-full">
      <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow duration-300">
        {/* 헤더 */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">
                {week ? `${week}주차 강의 자료` : "강의 자료"}
              </h3>
              {fileName && (
                <p className="text-xs text-gray-500 mt-0.5">{fileName}</p>
              )}
            </div>
          </div>
        </div>

        {/* PDF 뷰어 영역 */}
        <div className="bg-gray-50 border-t border-gray-200">
          {pdfUrl ? (
            <iframe
              src={pdfUrl}
              className="w-full h-full min-h-[600px] bg-white"
              title="PDF Viewer"
            />
          ) : (
            <div className="w-full min-h-[600px] flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-8">
              <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mb-4">
                <FileText className="w-10 h-10 text-gray-400" />
              </div>
              <p className="text-gray-400 text-lg font-medium">PDF 미리보기</p>
              <p className="text-gray-400 text-sm mt-2">
                PDF 파일이 업로드되면 여기에 표시됩니다
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PdfViewer;

