import React from "react";

import { BalanceRes } from "@/src/lib/api/balanceApi";
import { getAccountIcon } from "@/src/lib/transactionUtils";

interface LedgerTopBannerProps {
  balanceData?: BalanceRes;
  isLoading: boolean;
  accounts: any[];
  selectedAccountId: string;
  onSelectAccount: (accountId: string) => void;
}

export default function LedgerTopBanner({ balanceData, isLoading, accounts, selectedAccountId, onSelectAccount }: LedgerTopBannerProps) {
  if (isLoading) {
    return (
      <div className="w-full bg-[#1e3a8a] text-white px-4 py-2 md:p-4 rounded-t-xl flex items-center justify-center min-h-[60px] md:min-h-[70px]">
        <span className="text-xs md:text-sm opacity-70">계좌 정보를 불러오는 중...</span>
      </div>
    );
  }

  if (!balanceData) return null;

  const inactiveBalance = balanceData.accounts
    .filter(acc => !accounts.some(a => a.id === acc.accountId))
    .reduce((sum, acc) => sum + acc.amount, 0);

  return (
    <div className="w-full bg-[#1e3a8a] text-white rounded-t-xl overflow-x-auto no-scrollbar">
      <div className="flex flex-nowrap min-w-max">
        {accounts.length > 0 && (
          <button 
            onClick={() => onSelectAccount("")}
            className={`px-4 py-2 md:py-3 flex flex-col justify-center min-w-[120px] md:min-w-[140px] border-r border-white/20 transition-all hover:bg-sky-800/60 ${selectedAccountId === "" ? 'bg-sky-800/80 shadow-inner' : 'bg-sky-900/40 opacity-70 hover:opacity-100'}`}
          >
            <span className="text-[10px] md:text-xs text-sky-200 font-semibold mb-0.5 md:mb-1 uppercase tracking-wider">OPENING TOTAL (전체)</span>
            <span className="text-sm md:text-base font-bold text-sky-300">
              {balanceData.totalAmount >= 0 ? '' : '-'}&#8361;{Math.abs(balanceData.totalAmount).toLocaleString()}
            </span>
          </button>
        )}
        {accounts.map((acc, idx) => {
          const matched = balanceData.accounts.find(a => a.accountId === acc.id);
          const amount = matched ? matched.amount : 0;
          const isSelected = selectedAccountId === acc.id;
          const icon = getAccountIcon(acc.type);

          return (
            <button 
              key={acc.id} 
              onClick={() => onSelectAccount(acc.id)}
              className={`px-4 py-2 md:py-3 flex flex-col justify-center min-w-[120px] md:min-w-[140px] transition-all hover:bg-white/10 ${idx !== accounts.length - 1 || inactiveBalance !== 0 ? 'border-r border-white/10' : ''} ${isSelected ? 'bg-white/20 shadow-inner' : 'opacity-70 hover:opacity-100'}`}
            >
              <span className="text-[10px] md:text-xs text-sky-200 font-semibold mb-0.5 md:mb-1 uppercase tracking-wider">{icon} {acc.name}</span>
              <span className="text-sm md:text-base font-bold">
                {amount >= 0 ? '' : '-'}&#8361;{Math.abs(amount).toLocaleString()}
              </span>
            </button>
          );
        })}
        {inactiveBalance !== 0 && (
          <div className="px-4 py-2 md:py-3 flex flex-col justify-center min-w-[120px] md:min-w-[140px] opacity-70">
            <span className="text-[10px] md:text-xs text-sky-400 font-semibold mb-0.5 md:mb-1 uppercase tracking-wider">비활성 계좌</span>
            <span className="text-sm md:text-base font-bold text-gray-300">
              {inactiveBalance >= 0 ? '' : '-'}&#8361;{Math.abs(inactiveBalance).toLocaleString()}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
