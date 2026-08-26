"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { getDashboardBudgetUsage } from "@/src/lib/api/dashboard/budget";
import { formatMonth } from "@/src/utils/date";
import DeskObjectSheet from "./DeskObjectSheet";
import { useAuthErrorRedirect } from "@/src/hook/useAuthErrorRedirect";

interface BudgetEnvelopeProps {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
}

/**
 * 책상 위 "예산 봉투". 기존 `BudgetBar`는 `isError || length === 0`을 한 분기로
 * 묶었지만(§8), 여기서는 loading/success-with-budgets/success-empty/error를 구분한다.
 * `AuthError`는 `useAuthErrorRedirect`가 `/login`으로 보낸다.
 */
export default function BudgetEnvelope({ isOpen, onOpen, onClose }: BudgetEnvelopeProps) {
  const router = useRouter();
  const month = useMemo(() => formatMonth(new Date()), []);

  const {
    data: budgetUsages = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["dashboardBudgetUsage", month],
    queryFn: () => getDashboardBudgetUsage(month),
    retry: false,
  });
  useAuthErrorRedirect(error);

  const hasBudgets = budgetUsages.length > 0;

  const totalTarget = budgetUsages.reduce((sum, b) => sum + (b?.targetAmount ?? 0), 0);
  const totalSpent = budgetUsages.reduce((sum, b) => sum + (b?.spentAmount ?? 0), 0);
  // 목표 금액이 0이면 비율을 계산하지 않는다(§8).
  const remainRatio = totalTarget > 0 ? Math.max(0, (totalTarget - totalSpent) / totalTarget) : null;
  const isOverBudget = totalTarget > 0 && totalSpent > totalTarget;
  const overPercent = isOverBudget ? Math.round(((totalSpent - totalTarget) / totalTarget) * 100) : 0;

  const goToBudgetSettings = () => router.push("/home/profile");

  return (
    <>
      {isError ? (
        <div className="relative col-span-2 min-h-[114px] overflow-hidden rounded-md border-2 border-ll-ink bg-ll-mint p-4">
          <span className="text-[11px] font-bold text-ll-ink/70">이번 달 예산 봉투</span>
          <p className="mt-2 text-sm font-bold text-ll-ink break-keep">예산을 불러오지 못했어요</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-2 min-h-[32px] text-xs font-bold underline"
          >
            다시 시도
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={onOpen}
          aria-haspopup="dialog"
          // 데스크톱 BudgetBar와 같은 조건(예산 데이터가 있을 때)에서 클릭 없이도 바로 보이는
          // 요소에 id를 둔다 — sheet 안(클릭 후에만 존재)에 두면 SET_BUDGET 튜토리얼이
          // targetWaitTimeout 동안 대상을 못 찾을 수 있다.
          id={hasBudgets ? "tutorial-budget-setting" : undefined}
          className="relative col-span-2 min-h-[114px] overflow-hidden rounded-md border-2 border-ll-ink bg-ll-mint p-4 pt-5 text-left shadow-[4px_5px_0_rgba(32,40,58,0.24)] transition-transform active:translate-y-0.5 focus-visible:outline focus-visible:outline-3 focus-visible:outline-ll-periwinkle focus-visible:outline-offset-4"
        >
          {isLoading ? (
            <div className="space-y-2" aria-hidden="true">
              <div className="h-4 w-28 animate-pulse rounded bg-ll-ink/10" />
              <div className="h-6 w-40 animate-pulse rounded bg-ll-ink/10" />
            </div>
          ) : !hasBudgets ? (
            <>
              <span className="text-[11px] font-bold text-ll-ink/70">이번 달 예산 봉투</span>
              <p className="mt-2 text-lg font-black text-ll-ink break-keep">이번 달 쓸 돈 정하기</p>
            </>
          ) : (
            <>
              <div className="flex items-end justify-between gap-3">
                <span className="text-[11px] font-bold text-ll-ink/70">이번 달 예산 봉투</span>
                <strong className="text-lg font-black text-ll-ink">
                  {isOverBudget ? `${overPercent}% 초과` : `${Math.round((remainRatio ?? 0) * 100)}% 남음`}
                </strong>
              </div>
              <p className="mt-1.5 text-[11px] text-ll-ink/80 break-keep">
                {totalTarget.toLocaleString()}원 중 {totalSpent.toLocaleString()}원을 썼어요.
              </p>
              <div className="h-1.5 overflow-hidden rounded-full bg-ll-paper/65">
                <div
                  className={`h-full ${isOverBudget ? "bg-ll-tomato" : "bg-ll-ink"}`}
                  style={{ width: `${Math.min(100, Math.max(0, 100 - (remainRatio ?? 0) * 100))}%` }}
                />
              </div>
            </>
          )}
        </button>
      )}

      <DeskObjectSheet
        open={isOpen}
        onClose={onClose}
        titleId="desk-sheet-budget-title"
        title="이번 달 예산 봉투"
        description={
          hasBudgets
            ? isOverBudget
              ? `이번 달 예산을 ${overPercent}% 초과했어요.`
              : `이번 달 예산이 ${Math.round((remainRatio ?? 0) * 100)}% 남았어요.`
            : "아직 설정한 예산이 없어요."
        }
        toneClassName="bg-[#c9e4d6]"
      >
        {!hasBudgets ? (
          <div className="py-4 text-center">
            <p className="text-sm text-ll-ink/70 break-keep">
              카테고리별로 이번 달 쓸 돈을 정해두면 여기서 바로 확인할 수 있어요.
            </p>
            <button
              type="button"
              // 브리프 §8 — 지원하지 않는 query/hash를 임의로 만들지 않고 기존 BudgetBar와
              // 동일하게 프로필 페이지로만 이동한다.
              onClick={goToBudgetSettings}
              className="mt-4 min-h-[50px] w-full rounded-2xl bg-ll-ink text-sm font-extrabold text-ll-paper"
            >
              예산 설정하러 가기
            </button>
          </div>
        ) : (
          <>
            <div>
              {budgetUsages.map((budget) => {
                if (!budget) return null;
                const spent = budget.spentAmount ?? 0;
                const target = budget.targetAmount ?? 0;
                const usagePercent = target > 0 ? (spent / target) * 100 : 0;
                const over = usagePercent > 100;
                return (
                  <div
                    key={`${budget.categoryId}-${budget.subcategoryId ?? "none"}`}
                    className="border-b border-ll-ink/20 py-3"
                  >
                    <div className="mb-1.5 flex items-center justify-between gap-2 text-xs font-bold text-ll-ink">
                      <span className="truncate">
                        {budget.categoryName ?? "카테고리"}
                        {budget.subcategoryName && ` · ${budget.subcategoryName}`}
                      </span>
                      <span className={over ? "text-ll-tomato" : ""}>
                        {over ? "초과" : `${Math.max(0, 100 - usagePercent).toFixed(0)}% 남음`}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-ll-paper/70">
                      <div
                        className={`h-full ${over ? "bg-ll-tomato" : "bg-ll-ink"}`}
                        style={{ width: `${Math.min(100, Math.max(0, usagePercent))}%` }}
                      />
                    </div>
                    <p className="mt-1 text-[11px] text-ll-pencil">
                      {spent.toLocaleString()}원 / {target.toLocaleString()}원
                    </p>
                  </div>
                );
              })}
            </div>
            <button
              type="button"
              onClick={goToBudgetSettings}
              className="mt-4 min-h-[50px] w-full rounded-2xl bg-ll-ink text-sm font-extrabold text-ll-paper"
            >
              예산 자세히 보기
            </button>
          </>
        )}
      </DeskObjectSheet>
    </>
  );
}
