import React from "react";

interface PaymentMethodBalance {
  accountId: string;
  paymentMethodName: string;
  balance: number;
}

interface LedgerTopBannerProps {
  balanceData?: {
    totalBalance: number;
    paymentMethods: PaymentMethodBalance[];
  };
  isLoading: boolean;
}

export default function LedgerTopBanner({ balanceData, isLoading }: LedgerTopBannerProps) {
  if (isLoading) {
    return (
      <div className="w-full bg-[#1e3a8a] text-white p-4 rounded-t-xl mb-4 flex items-center justify-center min-h-[80px]">
        <span className="text-sm opacity-70">계좌 정보를 불러오는 중...</span>
      </div>
    );
  }

  if (!balanceData) return null;

  return (
    <div className="w-full bg-[#1e3a8a] text-white rounded-t-xl mb-4 overflow-x-auto no-scrollbar shadow-md">
      <div className="flex flex-nowrap min-w-max">
        {balanceData.paymentMethods.map((acc, idx) => (
          <div key={acc.accountId} className={`px-6 py-4 flex flex-col justify-center min-w-[160px] ${idx !== balanceData.paymentMethods.length - 1 ? 'border-r border-white/10' : ''}`}>
            <span className="text-xs text-sky-200 font-semibold mb-1 uppercase tracking-wider">{acc.paymentMethodName}</span>
            <span className="text-lg font-bold">
              {acc.balance >= 0 ? '' : '-'}&#8361;{Math.abs(acc.balance).toLocaleString()}
            </span>
          </div>
        ))}
        {balanceData.paymentMethods.length > 0 && (
          <div className="px-6 py-4 flex flex-col justify-center min-w-[160px] bg-sky-900/40 border-l border-white/20">
            <span className="text-xs text-sky-200 font-semibold mb-1 uppercase tracking-wider">SUM TOTAL</span>
            <span className="text-lg font-bold text-sky-300">
              {balanceData.totalBalance >= 0 ? '' : '-'}&#8361;{Math.abs(balanceData.totalBalance).toLocaleString()}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
