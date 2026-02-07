import {
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

export default function SummaryCards({
  summary,
}: {
  summary: { income: number; expense: number; balance: number };
}) {
  /* 임의 데이터 */
  const totalIncome = 3000000;
  const totalExpense = 2240000;
  const currentBalance = 5196000;

  const previousMonth = {
    income: 2800000,
    expense: 2100000,
    netIncome: 700000,
    balance: 4436000,
  };

  const incomeChange =
    ((totalIncome - previousMonth.income) / previousMonth.income) * 100;
  const expenseChange =
    ((totalExpense - previousMonth.expense) / previousMonth.expense) * 100;
  const balanceChange =
    ((currentBalance - previousMonth.balance) / previousMonth.balance) * 100;
  return (
    <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* 현재 잔액 (가장 중요하므로 첫 번째) */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-500">현재 잔액</span>
          <Wallet size={16} />
        </div>
        <div
          className={`text-xl lg:text-2xl font-bold mb-2 ${
            summary.balance >= 0 ? "text-gray-900" : "text-red-600"
          }`}
        >
          {summary.balance.toLocaleString()}
        </div>
        <div
          className={`flex items-center gap-1 text-sm ${
            summary.balance >= 0 ? "text-sky-600" : "text-red-600"
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>
            전월 대비 {balanceChange >= 0 ? "+" : ""}
            {balanceChange.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* 수입/지출 (모바일에서는 작게 보임) */}
      <div className="grid grid-cols-2 gap-4 lg:col-span-2">
        {/* 수입 */}
        <div className="bg-green-50 shadow-sm shadow-green-800/15 p-6 rounded-xl border border-green-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-green-700">
              이번 달 총 수입
            </span>
            <ArrowUpRight className="w-4 h-4 text-green-600" />
          </div>
          <div className="text-xl lg:text-2xl font-semibold text-green-800 mb-2">
            {summary.income.toLocaleString()}
          </div>
          <div
            className={`flex items-center gap-1 text-sm ${
              incomeChange >= 0 ? "text-green-600" : "text-red-600"
            }`}
          >
            {incomeChange >= 0 ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )}
            <span>
              전월 대비 {incomeChange >= 0 ? "+" : ""}
              {incomeChange.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* 지출 */}
        <div className="bg-red-50 shadow-sm shadow-red-800/15 p-6 rounded-xl border border-red-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-red-700">
              이번 달 총 지출
            </span>
            <ArrowDownRight className="w-4 h-4 text-red-600" />
          </div>
          <div className="text-xl lg:text-2xl font-semibold text-red-800 mb-2">
            {summary.expense.toLocaleString()}
          </div>
          <div
            className={`flex items-center gap-1 text-sm ${
              expenseChange >= 0 ? "text-red-600" : "text-green-600"
            }`}
          >
            {expenseChange >= 0 ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )}
            <span>
              전월 대비 {expenseChange >= 0 ? "+" : ""}
              {expenseChange.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
