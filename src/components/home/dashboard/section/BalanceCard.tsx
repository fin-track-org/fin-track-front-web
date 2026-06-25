"use client";

import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, Wallet, Eye, EyeOff } from "lucide-react";
import { getAccountIcon } from "@/src/lib/transactionUtils";

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
  const [includeSavings, setIncludeSavings] = useState(true);

  useEffect(() => {
    const savedSavings = localStorage.getItem("show_savings_accounts");
    if (savedSavings !== null) {
      setIncludeSavings(savedSavings === "true");
    }

    const savedVisibility = localStorage.getItem("show_total_balance");
    if (savedVisibility !== null) {
      setIsBalanceVisible(savedVisibility === "true");
    }
  }, []);

  const handleToggleSavings = (checked: boolean) => {
    setIncludeSavings(checked);
    localStorage.setItem("show_savings_accounts", String(checked));
  };

  const handleToggleVisibility = () => {
    const newVal = !isBalanceVisible;
    setIsBalanceVisible(newVal);
    localStorage.setItem("show_total_balance", String(newVal));
  };

  const filteredMethods = includeSavings
    ? paymentMethods
    : paymentMethods.filter(
        (m) => m.type !== "SAVINGS_INVESTMENT"
      );

  const calculatedTotal = filteredMethods.reduce((sum, m) => sum + m.balance, 0);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-4 md:p-5 flex flex-col gap-2">
        {/* 상단: 타이틀, 눈알 버튼, 체크박스 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-gray-500 text-sm font-medium">
            <Wallet size={16} />
            <span>총 잔액</span>
            <button
              onClick={handleToggleVisibility}
              className="text-gray-400 hover:text-gray-600 transition-colors ml-0.5 p-1 hover:bg-gray-100 rounded-md"
              aria-label={isBalanceVisible ? "잔액 숨기기" : "잔액 보기"}
            >
              {isBalanceVisible ? <Eye size={16} /> : <EyeOff size={16} />}
            </button>
          </div>

          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={includeSavings}
              onChange={(e) => handleToggleSavings(e.target.checked)}
              className="w-3.5 h-3.5 rounded border-gray-300 text-sky-600 focus:ring-sky-500 cursor-pointer"
            />
            <span className="text-xs text-gray-500 font-medium">저축/투자 포함</span>
          </label>
        </div>

        {/* 중간: 금액 및 상세 보기 버튼 */}
        <div className="flex items-end justify-between mt-1">
          <div className="text-gray-900 text-2xl md:text-3xl font-bold tracking-tight">
            {isBalanceVisible ? (
              <>
                {calculatedTotal.toLocaleString()}
                <span className="text-lg md:text-xl font-medium ml-1 text-gray-500">원</span>
              </>
            ) : (
              <span className="text-gray-400 tracking-widest text-2xl">••••••••</span>
            )}
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors px-2 py-1.5 rounded-lg hover:bg-gray-50"
            aria-label={isExpanded ? "접기" : "펼치기"}
          >
            {isExpanded ? "상세 접기" : "상세 보기"}
            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>

        {/* 확장된 내용 - 결제수단별 잔액 */}
        {isExpanded && (
          <div className="mt-3 pt-3 border-t border-gray-100 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
            {!filteredMethods || filteredMethods.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-3">
                등록된 결제수단이 없습니다.
              </p>
            ) : (
              filteredMethods.map((method, idx) => {
                const icon = getAccountIcon(method.type);
                return (
                  <div
                    key={idx}
                    className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2.5 hover:bg-gray-100 transition-colors"
                  >
                    <span className="text-gray-700 text-sm font-medium flex items-center gap-1.5">
                      <span className="text-[13px]">{icon}</span> {method.paymentMethodName}
                    </span>
                    <span className="text-gray-900 text-sm font-semibold">
                    {isBalanceVisible ? (
                      <>
                        {method.balance.toLocaleString()}
                        <span className="text-xs font-normal ml-0.5 text-gray-500">원</span>
                      </>
                    ) : (
                      <span className="text-gray-400 tracking-wider">••••••</span>
                    )}
                  </span>
                </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
