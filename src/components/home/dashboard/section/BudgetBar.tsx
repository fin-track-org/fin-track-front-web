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

const DEFAULT_CATEGORIES = [
  "식비",
  "교통/차량",
  "주거/공과금",
  "쇼핑/생활",
  "문화/여가",
  "의료/건강",
  "교육/자기계발",
  "금융",
  "수입",
  "기타",
];

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

  /* 초과된 카테고리 상단 고정 */
  const sortedUsageData = [...usageData].sort((a, b) => {
    if (a.exceeded && !b.exceeded) return -1;
    if (!a.exceeded && b.exceeded) return 1;
    return b.percentage - a.percentage;
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
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900">월 예산 설정</h3>
          <p className="text-sm text-gray-500 mt-1">
            카테고리별 한 달 예산을 입력해주세요
          </p>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-4 mb-8">
          {draftBudgets.map((item, idx) => (
            <div key={item.category} className="flex items-center gap-3">
              <span className="w-24 text-sm font-medium text-gray-700">
                {item.category}
              </span>

              <div className="relative flex-1">
                <input
                  type="number"
                  placeholder="0"
                  className="
                  w-full pl-3 pr-10 py-2
                  border border-gray-300 rounded-lg
                  text-sm text-right
                  focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400
                "
                  value={item.budget || ""}
                  onChange={(e) => {
                    const next = [...draftBudgets];
                    next[idx].budget = Number(e.target.value);
                    setDraftBudgets(next);
                  }}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                  원
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button
            onClick={handleCancel}
            className="
            inline-flex items-center gap-2
            px-4 py-2 rounded-lg
            border border-gray-300
            text-gray-700 text-sm
            hover:bg-gray-50
          "
          >
            <X className="w-4 h-4" />
            취소
          </button>

          <button
            onClick={handleSave}
            className="
            inline-flex items-center gap-2
            px-5 py-2 rounded-lg
            bg-sky-600 text-white text-sm
            hover:bg-sky-700
          "
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

      <div className="grid grid-cols-2 gap-x-6 gap-y-5">
        {sortedUsageData.map((item) => {
          const remaining = item.budget - item.spent;

          return (
            <div
              key={item.category}
              className="p-4 rounded-lg border border-gray-100 bg-gray-50"
            >
              {/* 헤더 */}
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-800 text-sm">
                  {item.category}
                </span>

                {/* 상태 뱃지 */}
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    item.exceeded
                      ? "bg-red-100 text-red-600"
                      : item.percentage >= 80
                        ? "bg-amber-100 text-amber-600"
                        : "bg-sky-100 text-sky-600"
                  }`}
                >
                  {item.exceeded
                    ? "초과"
                    : item.percentage >= 80
                      ? "주의"
                      : "정상"}
                </span>
              </div>

              {/* 금액 */}
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-500">
                  {item.spent.toLocaleString()} / {item.budget.toLocaleString()}
                  원
                </span>

                <span
                  className={`font-semibold ${
                    remaining < 0 ? "text-red-600" : "text-gray-700"
                  }`}
                >
                  {remaining >= 0
                    ? `남은 ${remaining.toLocaleString()}원`
                    : `${Math.abs(remaining).toLocaleString()}원 초과`}
                </span>
              </div>

              {/* 바 */}
              <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    item.exceeded
                      ? "bg-red-500"
                      : item.percentage >= 80
                        ? "bg-amber-500"
                        : "bg-sky-500"
                  }`}
                  style={{
                    width: `${Math.min(item.percentage, 100)}%`,
                  }}
                />
              </div>

              {/* 퍼센트 */}
              <div className="mt-2 text-xs text-gray-500">
                {item.percentage}% 사용
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
