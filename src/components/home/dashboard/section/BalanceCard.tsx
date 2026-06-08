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
      <div className="p-6">
        {/* 헤더 - 총 잔액 */}
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 text-gray-600 text-sm font-medium mb-2">
              <Wallet size={18} />
              <span>총 잔액</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsBalanceVisible(!isBalanceVisible)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1.5 hover:bg-gray-100 rounded-lg"
                aria-label={isBalanceVisible ? "잔액 숨기기" : "잔액 보기"}
              >
                {isBalanceVisible ? <Eye size={20} /> : <EyeOff size={20} />}
              </button>
              <div className="text-gray-900 text-3xl font-bold">
                {isBalanceVisible ? (
                  <>
                    {totalBalance.toLocaleString()}
                    <span className="text-xl font-normal ml-1 text-gray-600">원</span>
                  </>
                ) : (
                  <span className="text-gray-400">••••••••</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAdjustModalOpen(true)}
              className="flex items-center gap-1.5 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 transition-colors px-3 py-2 rounded-lg"
            >
              <RefreshCw size={14} />
              <span>금액 맞추기</span>
            </button>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-lg"
              aria-label={isExpanded ? "접기" : "펼치기"}
            >
              {isExpanded ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
            </button>
          </div>
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
