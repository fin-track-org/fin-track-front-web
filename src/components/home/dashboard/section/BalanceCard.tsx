"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Wallet } from "lucide-react";

interface BalanceCardProps {
  totalBalance: number;
  paymentMethods: PaymentMethodBalance[];
}

export default function BalanceCard({
  totalBalance,
  paymentMethods = [],
}: BalanceCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-linear-to-br from-sky-500 to-indigo-600 rounded-2xl shadow-lg overflow-hidden">
      <div className="p-6">
        {/* 헤더 - 총 잔액 */}
        <div
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex-1">
            <div className="flex items-center gap-2 text-sky-100 text-sm font-medium mb-2">
              <Wallet size={18} />
              <span>총 잔액</span>
            </div>
            <div className="text-white text-3xl font-bold">
              {totalBalance.toLocaleString()}
              <span className="text-xl font-normal ml-1">원</span>
            </div>
          </div>
          <button
            className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
            aria-label={isExpanded ? "접기" : "펼치기"}
          >
            {isExpanded ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
          </button>
        </div>

        {/* 확장된 내용 - 결제수단별 잔액 */}
        {isExpanded && (
          <div className="mt-6 pt-6 border-t border-white/20 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
            {!paymentMethods || paymentMethods.length === 0 ? (
              <p className="text-sky-100 text-sm text-center py-4">
                등록된 결제수단이 없습니다.
              </p>
            ) : (
              paymentMethods.map((method, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between bg-white/10 backdrop-blur-sm rounded-lg px-4 py-3 hover:bg-white/15 transition-colors"
                >
                  <span className="text-white font-medium">
                    {method.paymentMethodName}
                  </span>
                  <span className="text-white font-semibold">
                    {method.balance.toLocaleString()}
                    <span className="text-sm font-normal ml-1">원</span>
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
