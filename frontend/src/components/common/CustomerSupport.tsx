import React from "react";

const CustomerSupport: React.FC = () => {
  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-100 border-t border-gray-200 py-16">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            궁금한 점이 있다면 언제든 물어보세요
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Lec-Q 사용 중 궁금한 점이나 기술적 문제가 있으시다면 언제든지
            문의해주세요. 빠르고 정확한 답변으로 도움을 드리겠습니다.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* 문의 옵션 */}
          <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-100">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">
              온라인 지원
            </h3>
            <div className="space-y-6">
              <div className="flex items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer">
                <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mr-4">
                  <span className="text-white text-lg">📝</span>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">1:1 문의 게시판</h4>
                  <p className="text-sm text-gray-600">
                    개인별 맞춤 상담 및 기술 지원
                  </p>
                </div>
              </div>
              <div className="flex items-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors cursor-pointer">
                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mr-4">
                  <span className="text-white text-lg">❓</span>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">
                    자주 묻는 질문 (FAQ)
                  </h4>
                  <p className="text-sm text-gray-600">
                    빠른 해결을 위한 자주 묻는 질문 모음
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* CS 센터 정보 */}
          <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-100">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">
              고객센터
            </h3>
            <div className="space-y-6">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center mb-3">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center mr-3">
                    <span className="text-white text-sm">📞</span>
                  </div>
                  <h4 className="font-medium text-gray-900">전화 상담</h4>
                </div>
                <p className="text-2xl font-bold text-blue-600 mb-2">
                  02-XXXX-XXXX
                </p>
                <p className="text-gray-600 text-sm">평일 9:30~17:00</p>
                <p className="text-gray-500 text-xs">(주말 및 공휴일 휴무)</p>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center mb-3">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center mr-3">
                    <span className="text-white text-sm">⏰</span>
                  </div>
                  <h4 className="font-medium text-gray-900">운영 시간</h4>
                </div>
                <p className="text-gray-700 font-medium">평일 9:30~17:00</p>
                <p className="text-gray-500 text-sm">주말 및 공휴일 휴무</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerSupport;
