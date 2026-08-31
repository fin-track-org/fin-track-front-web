/**
 * "예산 속도"(이번 달)/"예산 최종 결과"(과거 월) 섹션이 공유하는 집계
 * (IMPLEMENTATION_BRIEF_019 §8). `getDashboardBudgetUsage(month)`가 돌려주는 카테고리/소분류별
 * 목록을 합산해 전체 목표액·사용액·진행률을 만든다. 화면에서 "속도"로 보여줄지 "최종 결과"로
 * 보여줄지는 이번 달 여부에 따라 컴포넌트가 결정하고, 이 함수는 공통 숫자만 만든다.
 */

export interface BudgetSummary {
  targetTotal: number;
  spentTotal: number;
  /** targetTotal이 0 이하면 0으로 나누지 않고 null을 반환한다(§8). */
  percentage: number | null;
  /** spentTotal - targetTotal. 양수면 초과, 음수면 잔여. */
  overAmount: number;
}

export function summarizeBudgetUsage(items: BudgetUsageRes[]): BudgetSummary {
  const targetTotal = items.reduce((sum, item) => sum + item.targetAmount, 0);
  const spentTotal = items.reduce((sum, item) => sum + item.spentAmount, 0);
  const percentage = targetTotal > 0 ? Math.round((spentTotal / targetTotal) * 1000) / 10 : null;
  return { targetTotal, spentTotal, percentage, overAmount: spentTotal - targetTotal };
}
