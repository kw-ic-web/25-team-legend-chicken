import React from "react";
import { MessageSquare, HelpCircle } from "lucide-react";

const CustomerSupport: React.FC = () => {
  return (
    <div className="bg-white border-t border-gray-200 py-12 relative">
      {/* 장식 요소 */}
      <div className="absolute top-4 left-4 w-16 h-16 bg-yellow-200 rounded-full opacity-60"></div>
      <div className="absolute bottom-4 right-4 w-12 h-12 bg-pink-200 rounded-full opacity-60"></div>

      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Lec-Q 질문 및 문의
          </h2>
          <p className="text-gray-600">
            Lec-Q 사용 중 궁금한 점이나 기술적 문제가 있으시다면 언제든지
            문의해주세요. <br />
            빠르고 정확한 답변으로 도움을 드리겠습니다.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 문의 옵션 */}
          <div className="space-y-4">
            <div className="flex items-center p-3 bg-blue-100 rounded">
              <div className="w-8 h-12 flex items-center justify-center mr-3">
                <MessageSquare className="w-4 h-4 text-blue-700" />
              </div>
              <span className="text-gray-800 font-medium">1:1 문의 게시판</span>
            </div>
            <div className="flex items-center p-3 bg-yellow-100 rounded">
              <div className="w-8 h-12  flex items-center justify-center mr-3">
                <HelpCircle className="w-4 h-4 text-yellow-700" />
              </div>
              <span className="text-gray-800 font-medium">
                자주 묻는 질문 (FAQ)
              </span>
            </div>
          </div>

          {/* CS 센터 정보 */}
          <div className="bg-purple-100 rounded-lg p-6">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                CS Center
              </h3>
              <p className="text-gray-800 font-medium">02-XXXX-XXXX</p>
              <p className="text-gray-600 text-sm">평일 9:30~17:00</p>
              <p className="text-gray-500 text-xs">(주말 및 공휴일 휴무)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerSupport;
