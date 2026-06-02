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
      <section className="xl:flex-1 p-6 bg-white rounded-xl shadow-sm border border-gray-100 h-full flex flex-col xl:min-h-0">
        <div className="flex items-center justify-between mb-5">
          <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="space-y-3 flex-1">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-3 rounded-lg border border-gray-100 bg-gray-50 space-y-2 animate-pulse">
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
      <section className="xl:flex-1 p-8 bg-white rounded-xl shadow-sm border border-gray-100 h-full flex flex-col items-center justify-center text-center xl:min-h-0">
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
    <section className="xl:flex-1 p-6 bg-white rounded-xl shadow-sm border border-gray-100 h-full flex flex-col xl:min-h-0">
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

      <div className="space-y-3 flex-1 overflow-y-auto pr-1">
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
              className="p-3 rounded-lg border border-gray-100 bg-gray-50"
            >
              {/* 카테고리명 (대분류 · 소분류) */}
              <div className="flex items-center gap-1.5 mb-2">
                <p className="text-sm font-medium text-gray-800 truncate">
                  {budget.categoryName ?? "카테고리"}
                </p>
                {budget.subcategoryName && (
                  <>
                    <span className="text-gray-300">·</span>
                    <p className="text-xs text-gray-500 truncate">{budget.subcategoryName}</p>
                  </>
                )}
              </div>

              {/* 금액 정보 및 사용률 */}
              <div className="flex items-baseline justify-between gap-2 mb-2">
                <div className="flex items-baseline gap-1">
                  <p className={`text-sm font-semibold ${textColor}`}>
                    {spentAmount.toLocaleString("ko-KR")}원
                  </p>
                  <p className="text-xs text-gray-400">/ {targetAmount.toLocaleString("ko-KR")}원</p>
                </div>
                <p className={`text-xs ${textColor} whitespace-nowrap`}>
                  {usagePercentage.toFixed(1)}% 사용{isOverBudget && " (초과)"}
                </p>
              </div>

              {/* 프로그레스 바 */}
              <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full ${barColor} rounded-full transition-all`}
                  style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
