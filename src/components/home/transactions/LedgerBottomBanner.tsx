import React, { useMemo } from "react";

// Redefine locally since we only need basic props
interface LedgerBottomBannerProps {
  transactions: any[];
  accounts: any[];
}

export default function LedgerBottomBanner({ transactions, accounts }: LedgerBottomBannerProps) {
  const accountCalculations = useMemo(() => {
    const sums: Record<string, number> = {};
    let total = 0;
    
    // Initialize with 0 for all accounts
    accounts.forEach(acc => {
      sums[acc.id] = 0;
    });

    transactions.forEach((t) => {
      const accId = t.account?.id;
      if (accId) {
        const amount = Math.abs(t.amount);
        const signedAmount = t.type === "EXPENSE" ? -amount : amount;
        sums[accId] = (sums[accId] || 0) + signedAmount;
        total += signedAmount;
      }
    });

    return { sums, total };
  }, [transactions, accounts]);

  return (
    <div className="w-full bg-[#1e3a8a] text-white rounded-b-xl mt-4 overflow-x-auto no-scrollbar shadow-md">
      <div className="flex flex-nowrap min-w-max">
        {accounts.map((acc, idx) => {
          const sum = accountCalculations.sums[acc.id] || 0;
          return (
            <div key={acc.id} className={`px-6 py-4 flex flex-col justify-center min-w-[160px] ${idx !== accounts.length - 1 ? 'border-r border-white/10' : ''}`}>
              <span className="text-xs text-sky-200 font-semibold mb-1 uppercase tracking-wider">{acc.name}</span>
              <span className="text-lg font-bold">
                {sum > 0 ? '+' : ''}{sum < 0 ? '-' : ''}&#8361;{Math.abs(sum).toLocaleString()}
              </span>
            </div>
          );
        })}
        {accounts.length > 0 && (
          <div className="px-6 py-4 flex flex-col justify-center min-w-[160px] bg-sky-900/40 border-l border-white/20">
            <span className="text-xs text-sky-200 font-semibold mb-1 uppercase tracking-wider">NET POS</span>
            <span className="text-lg font-bold text-sky-300">
              {accountCalculations.total > 0 ? '+' : ''}{accountCalculations.total < 0 ? '-' : ''}&#8361;{Math.abs(accountCalculations.total).toLocaleString()}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
