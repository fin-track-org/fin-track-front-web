/* eslint-disable react-hooks/purity */
"use client";

import { useQuery } from "@tanstack/react-query";
import { getDashboardBudgetUsage } from "@/src/lib/api/dashboard/budget";
import { useRouter } from "next/navigation";
import { Settings } from "lucide-react";

interface BudgetBarProps {
  month: string;
}

export default function BudgetBar({ month }: BudgetBarProps) {
  const router = useRouter();

  const { data: budgetUsages = [], isLoading, isError } = useQuery({
    queryKey: ["dashboardBudgetUsage", month],
    queryFn: () => getDashboardBudgetUsage(month),
    retry: false,
  });

  if (isLoading) {
    return (
      <section className="p-6 bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-5">
          <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 rounded-lg border border-gray-100 bg-gray-50 space-y-2 animate-pulse">
              <div className="h-4 w-20 bg-gray-200 rounded" />
              <div className="h-5 w-24 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (isError || budgetUsages.length === 0) {
    return (
      <section className="p-8 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          아직 예산이 없어요
        </h3>
        <p className="text-sm text-gray-500 mb-6">
          마이페이지에서 카테고리별 월 예산을 설정하면 여기서 확인할 수 있어요
        </p>
        <button
          onClick={() => router.push("/home/profile")}
          className="inline-flex items-center gap-2 px-5 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition text-sm font-medium"
        >
          <Settings className="w-4 h-4" />
          예산 설정하러 가기
        </button>
      </section>
    );
  }

  const totalBudget = budgetUsages.reduce((sum, b) => sum + (b?.targetAmount ?? 0), 0);
  const totalUsed = budgetUsages.reduce((sum, b) => sum + (b?.spentAmount ?? 0), 0);

  return (
    <section className="p-6 bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">월 예산 및 사용 현황</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            총 예산 {totalBudget.toLocaleString("ko-KR")}원 / 사용 {totalUsed.toLocaleString("ko-KR")}원
          </p>
        </div>
        <button
          onClick={() => router.push("/home/profile")}
          className="flex items-center gap-1 text-xs text-sky-600 hover:text-sky-700 font-medium"
        >
          <Settings className="w-3.5 h-3.5" />
          설정
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {budgetUsages.map((budget) => {
          if (!budget) return null;
          
          const spentAmount = budget.spentAmount ?? 0;
          const targetAmount = budget.targetAmount ?? 0;
          const usagePercentage = targetAmount > 0 ? (spentAmount / targetAmount) * 100 : 0;
          const isOverBudget = usagePercentage > 100;
          const barColor = isOverBudget ? "bg-red-500" : usagePercentage > 80 ? "bg-amber-500" : "bg-sky-500";
          const textColor = isOverBudget ? "text-red-600" : usagePercentage > 80 ? "text-amber-600" : "text-sky-700";

          return (
            <div
              key={`${budget.categoryId}-${budget.subcategoryId ?? "none"}`}
              className="p-4 rounded-lg border border-gray-100 bg-gray-50"
            >
              <p className="text-sm font-medium text-gray-800 truncate mb-0.5">
                {budget.categoryName ?? "카테고리"}
              </p>
              {budget.subcategoryName && (
                <p className="text-xs text-gray-400 mb-1 truncate">{budget.subcategoryName}</p>
              )}
              <div className="flex items-baseline gap-1 mb-1">
                <p className={`text-base font-semibold ${textColor}`}>
                  {spentAmount.toLocaleString("ko-KR")}원
                </p>
                <p className="text-xs text-gray-400">/ {targetAmount.toLocaleString("ko-KR")}원</p>
              </div>
              <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full ${barColor} rounded-full transition-all`}
                  style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                />
              </div>
              <p className={`mt-1 text-xs ${textColor}`}>
                {usagePercentage.toFixed(1)}% 사용
                {isOverBudget && " (초과)"}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
