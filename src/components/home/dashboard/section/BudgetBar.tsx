/* eslint-disable react-hooks/purity */
"use client";

import { useState } from "react";
import { Plus, Save, X } from "lucide-react";

interface Budget {
  category: string;
  budget: number;
}

interface BudgetUsage extends Budget {
  spent: number;
  percentage: number;
  exceeded?: boolean;
}

const DEFAULT_CATEGORIES = ["식비", "교통", "문화생활", "생필품", "기타"];

export default function BudgetBar() {
  /* 상태 */
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [draftBudgets, setDraftBudgets] = useState<Budget[]>(
    DEFAULT_CATEGORIES.map((c) => ({ category: c, budget: 0 })),
  );
  const [isEditing, setIsEditing] = useState(false);

  /*  임시 사용 금액 (mock)  */
  const usageData: BudgetUsage[] = budgets.map((b) => {
    const spent = Math.floor(Math.random() * (b.budget * 1.2));
    const percentage = b.budget > 0 ? Math.round((spent / b.budget) * 100) : 0;

    return {
      ...b,
      spent,
      percentage,
      exceeded: percentage > 100,
    };
  });

  /* 저장 / 취소 */
  const handleSave = () => {
    setBudgets(draftBudgets.filter((b) => b.budget > 0));
    setIsEditing(false);
  };

  const handleCancel = () => {
    setDraftBudgets(
      DEFAULT_CATEGORIES.map((c) => {
        const found = budgets.find((b) => b.category === c);
        return found ?? { category: c, budget: 0 };
      }),
    );
    setIsEditing(false);
  };

  /* UI - 초기 상태 */
  if (budgets.length === 0 && !isEditing) {
    return (
      <section className="lg:col-span-2 p-8 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          아직 예산이 설정되지 않았어요
        </h3>
        <p className="text-sm text-gray-500 mb-6">
          카테고리별 예산을 설정하면 지출 관리가 쉬워져요
        </p>
        <button
          onClick={() => setIsEditing(true)}
          className="inline-flex items-center gap-2 px-5 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition"
        >
          <Plus className="w-4 h-4" />
          예산 설정하기
        </button>
      </section>
    );
  }

  /* UI - 편집 모드 */
  if (isEditing) {
    return (
      <section className="lg:col-span-2 p-6 bg-white rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">
          월 예산 설정
        </h3>

        <div className="space-y-4 mb-8">
          {draftBudgets.map((item, idx) => (
            <div key={item.category} className="flex items-center gap-4">
              <span className="w-24 text-sm font-medium text-gray-700">
                {item.category}
              </span>
              <input
                type="number"
                placeholder="0"
                className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-200"
                value={item.budget || ""}
                onChange={(e) => {
                  const next = [...draftBudgets];
                  next[idx].budget = Number(e.target.value);
                  setDraftBudgets(next);
                }}
              />
              <span className="text-sm text-gray-500">원</span>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={handleCancel}
            className="inline-flex items-center gap-2 px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50"
          >
            <X className="w-4 h-4" />
            취소
          </button>
          <button
            onClick={handleSave}
            className="inline-flex items-center gap-2 px-5 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700"
          >
            <Save className="w-4 h-4" />
            저장
          </button>
        </div>
      </section>
    );
  }

  /* UI - 사용 현황 */
  return (
    <section className="lg:col-span-2 p-6 bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">예산 사용 현황</h3>
        <button
          onClick={() => setIsEditing(true)}
          className="text-sm text-sky-600 hover:underline"
        >
          수정
        </button>
      </div>

      <div className="space-y-5">
        {usageData.map((item) => (
          <div key={item.category}>
            <div className="flex justify-between mb-1 text-sm">
              <span className="font-medium text-gray-700">{item.category}</span>
              <span
                className={`font-semibold ${
                  item.exceeded ? "text-red-600" : "text-gray-900"
                }`}
              >
                {item.spent.toLocaleString()} 원 /{" "}
                {item.budget.toLocaleString()} 원
              </span>
            </div>

            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  item.exceeded
                    ? "bg-red-500"
                    : item.percentage > 90
                      ? "bg-amber-500"
                      : "bg-sky-500"
                }`}
                style={{
                  width: `${Math.min(item.percentage, 100)}%`,
                }}
              />
            </div>

            <div className="mt-1 text-xs text-gray-500">
              {item.percentage}% 사용
              {item.exceeded && (
                <span className="ml-2 text-red-600 font-semibold">
                  예산 초과
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
