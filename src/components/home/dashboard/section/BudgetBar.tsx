/* eslint-disable react-hooks/purity */
"use client";

import { useQuery } from "@tanstack/react-query";
import { getBudgetTemplates } from "@/src/lib/api/budgetApi";
import { useRouter } from "next/navigation";
import { Settings } from "lucide-react";

export default function BudgetBar() {
  const router = useRouter();

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["budgetTemplates"],
    queryFn: getBudgetTemplates,
  });

  const activeTemplates = templates.filter((t) => t.isActive);

  const totalBudget = activeTemplates.reduce((sum, t) => sum + t.targetAmount, 0);

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

  if (activeTemplates.length === 0) {
    return (
      <section className="p-8 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          아직 예산 템플릿이 없어요
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

  return (
    <section className="p-6 bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">월 예산 템플릿 (개발중)</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            총 예산 {totalBudget.toLocaleString("ko-KR")}원
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
        {activeTemplates.map((t) => {
          const ratio = totalBudget > 0 ? t.targetAmount / totalBudget : 0;
          const pct = Math.round(ratio * 100);

          return (
            <div
              key={t.id}
              className="p-4 rounded-lg border border-gray-100 bg-gray-50"
            >
              <p className="text-sm font-medium text-gray-800 truncate mb-0.5">
                {t.categoryName}
              </p>
              {t.subCategoryName && (
                <p className="text-xs text-gray-400 mb-1 truncate">{t.subCategoryName}</p>
              )}
              <p className="text-base font-semibold text-sky-700">
                {t.targetAmount.toLocaleString("ko-KR")}원
              </p>
              <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-sky-400 rounded-full"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-gray-400">전체 예산의 {pct}%</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
