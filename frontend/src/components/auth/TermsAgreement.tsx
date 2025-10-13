import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

interface TermsAgreementProps {
  onNext: () => void;
}

const TermsAgreement: React.FC<TermsAgreementProps> = ({ onNext }) => {
  const [agreements, setAgreements] = useState({
    terms: false,
    privacy: false,
    thirdParty: false,
    all: false,
  });
  const navigate = useNavigate();

  const handleAgreementChange = (type: keyof typeof agreements) => {
    if (type === "all") {
      const newValue = !agreements.all;
      setAgreements({
        terms: newValue,
        privacy: newValue,
        thirdParty: newValue,
        all: newValue,
      });
    } else {
      const newAgreements = {
        ...agreements,
        [type]: !agreements[type],
      };
      setAgreements({
        ...newAgreements,
        all:
          newAgreements.terms &&
          newAgreements.privacy &&
          newAgreements.thirdParty,
      });
    }
  };

  const canProceed =
    agreements.terms && agreements.privacy && agreements.thirdParty;

  return (
    <div className="max-w-4xl mx-auto px-4">
      <div className="space-y-8">
        {/* 이용약관 */}
        <div className="border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">이용약관</h3>
          <div className="space-y-4 text-sm text-gray-700">
            <div>
              <h4 className="font-medium mb-2">제1조 (목적)</h4>
              <p>
                본 약관은 Lec-Q 서비스 이용과 관련된 회원과 회사 간의 권리, 의무
                및 책임사항을 규정함을 목적으로 합니다.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">제2조 (회원의 의무)</h4>
              <ol className="list-decimal list-inside space-y-1">
                <li>회원은 본 약관 및 관련 법령을 준수해야 합니다</li>
                <li>
                  타인의 개인정보를 무단으로 수집, 이용하거나 제3자에게
                  제공해서는 안 됩니다
                </li>
                <li>
                  서비스 이용 시 정확한 정보를 제공하고, 변경사항이 있을 경우
                  즉시 수정해야 합니다
                </li>
              </ol>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={agreements.terms}
                onChange={() => handleAgreementChange("terms")}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">
                이용약관에 동의합니다.
              </span>
            </label>
          </div>
        </div>

        {/* 개인정보 수집 및 이용 */}
        <div className="border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            개인정보 수집 및 이용에 대한 안내
          </h3>
          <div className="space-y-4 text-sm text-gray-700">
            <div>
              <h4 className="font-medium mb-2">제1조 (수집 항목)</h4>
              <p>
                회원가입 및 서비스 이용을 위해 필요한 항목: 이름, 연락처,
                이메일, 생년월일, 성별
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">제2조 (수집 및 이용 목적)</h4>
              <ol className="list-decimal list-inside space-y-1">
                <li>회원 식별 및 서비스 제공</li>
                <li>서비스 개선 및 맞춤형 콘텐츠 제공</li>
                <li>고객 상담 및 문의사항 처리</li>
              </ol>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={agreements.privacy}
                onChange={() => handleAgreementChange("privacy")}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">
                개인정보 수집에 동의합니다.
              </span>
            </label>
          </div>
        </div>

        {/* 제3자 개인정보 제공 동의 */}
        <div className="border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            제3자 개인정보 제공 동의
          </h3>
          <div className="space-y-4 text-sm text-gray-700">
            <div>
              <h4 className="font-medium mb-2">제1조 (보유 및 이용 기간)</h4>
              <p>
                개인정보는 회원 탈퇴 시까지 보유하며, 관련 법령에 따라 일정 기간
                보관 후 파기됩니다.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">제2조 (동의 거부 권리)</h4>
              <p>
                회원은 개인정보 제공에 동의하지 않을 권리가 있으나, 거부 시 일부
                서비스 이용이 제한될 수 있습니다.
              </p>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={agreements.thirdParty}
                onChange={() => handleAgreementChange("thirdParty")}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">
                이용에 동의합니다.
              </span>
            </label>
          </div>
        </div>

        {/* 전체 동의 */}
        <div className="border-t border-gray-200 pt-6">
          <div className="flex justify-center mb-6">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={agreements.all}
                onChange={() => handleAgreementChange("all")}
                className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="ml-3 text-base font-medium text-gray-900">
                이용약관, 개인정보 수집 및 이용에 대한 안내, 제3자 개인정보 제공
                동의에 모두 동의합니다.
              </span>
            </label>
          </div>

          <div className="flex justify-center gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-6 py-3 rounded-lg font-medium border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors"
            >
              이전
            </button>
            <button
              type="button"
              onClick={onNext}
              disabled={!canProceed}
              className={`px-8 py-3 rounded-lg font-medium transition-colors ${
                canProceed
                  ? "bg-gray-800 text-white hover:bg-gray-900"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }`}
            >
              다음
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsAgreement;
