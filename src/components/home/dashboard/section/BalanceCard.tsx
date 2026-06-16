"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Wallet, Eye, EyeOff, RefreshCw } from "lucide-react";
import AdjustBalanceModal from "@/src/components/AdjustBalanceModal";

interface BalanceCardProps {
  totalBalance: number;
  paymentMethods: PaymentMethodBalance[];
}

export default function BalanceCard({
  totalBalance,
  paymentMethods = [],
}: BalanceCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isBalanceVisible, setIsBalanceVisible] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);

  return (
    <>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-5 flex flex-col gap-4">
        {/* 상단: 잔액 정보 */}
        <div>
          <div className="flex items-center gap-1.5 text-gray-500 text-sm font-medium mb-1.5">
            <Wallet size={16} />
            <span>총 잔액</span>
            <button
              onClick={() => setIsBalanceVisible(!isBalanceVisible)}
              className="text-gray-400 hover:text-gray-600 transition-colors ml-0.5 p-1 hover:bg-gray-100 rounded-md"
              aria-label={isBalanceVisible ? "잔액 숨기기" : "잔액 보기"}
            >
              {isBalanceVisible ? <Eye size={16} /> : <EyeOff size={16} />}
            </button>
          </div>
          <div className="text-gray-900 text-3xl font-bold tracking-tight">
            {isBalanceVisible ? (
              <>
                {totalBalance.toLocaleString()}
                <span className="text-xl font-medium ml-1 text-gray-500">원</span>
              </>
            ) : (
              <span className="text-gray-400">••••••••</span>
            )}
          </div>
        </div>

        {/* 하단: 액션 버튼 */}
        <div className="flex items-center justify-between pt-1">
          <button
            onClick={() => setIsAdjustModalOpen(true)}
            className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 bg-gray-50 hover:bg-gray-100 border border-gray-100 transition-colors px-3.5 py-2 rounded-xl"
          >
            <RefreshCw size={14} />
            <span>잔액 조정</span>
          </button>
          
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors px-2 py-2 rounded-lg hover:bg-gray-50"
            aria-label={isExpanded ? "접기" : "펼치기"}
          >
            {isExpanded ? "상세 접기" : "상세 보기"}
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>

        {/* 확장된 내용 - 결제수단별 잔액 */}
        {isExpanded && (
          <div className="mt-6 pt-6 border-t border-gray-200 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
            {!paymentMethods || paymentMethods.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-4">
                등록된 결제수단이 없습니다.
              </p>
            ) : (
              paymentMethods.map((method, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3 hover:bg-gray-100 transition-colors"
                >
                  <span className="text-gray-700 font-medium">
                    {method.paymentMethodName}
                  </span>
                  <span className="text-gray-900 font-semibold">
                    {isBalanceVisible ? (
                      <>
                        {method.balance.toLocaleString()}
                        <span className="text-sm font-normal ml-1 text-gray-600">원</span>
                      </>
                    ) : (
                      <span className="text-gray-400">••••••</span>
                    )}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
    
    <AdjustBalanceModal
      isOpen={isAdjustModalOpen}
      onClose={() => setIsAdjustModalOpen(false)}
      paymentMethods={paymentMethods}
      onSuccess={() => {
        // 새로고침 로직 필요 시 추가 (보통 부모 컴포넌트나 SWR이 처리)
        window.location.reload(); // 임시 새로고침
      }}
    />
    </>
  );
}
