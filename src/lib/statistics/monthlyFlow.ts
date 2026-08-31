/**
 * "돈의 흐름" 섹션이 쓰는 월간 금액 의미(IMPLEMENTATION_BRIEF_019 §6, DECISION_016 §3).
 *
 * `DashboardSummary`(`/api/v1/dashboard/summary`)는 income/expense/savingsIncome/savingsExpense를
 * 그대로 반환하지만, 화면에 필요한 "생활 수지"·"저축·투자 순이동"·"이번 달 전체 변화"는 프론트가
 * 계산해야 한다. 세 계산 모두 순수 함수 하나로 모아 fixture로 검증한다(§6 "totalChange는 서버
 * balance와 일치하는지 순수 함수 fixture로 검증").
 */

export interface MonthlyFlowInput {
  income: number;
  expense: number;
  savingsIncome: number;
  savingsExpense: number;
}

export interface MonthlyFlow {
  /** 생활 수입 - 생활 지출. "저축"이라고 표시하지 않는다. */
  livingBalance: number;
  /** savingsExpense - savingsIncome. 양수면 순저축(옮긴 돈이 더 많음), 음수면 순회수. */
  savingsNet: number;
  /** (income+savingsIncome)-(expense+savingsExpense). 서버 MonthlyComparisonRes.balance와 동일. */
  totalChange: number;
}

export function computeMonthlyFlow(input: MonthlyFlowInput): MonthlyFlow {
  const livingBalance = input.income - input.expense;
  const savingsNet = input.savingsExpense - input.savingsIncome;
  const totalChange = input.income + input.savingsIncome - (input.expense + input.savingsExpense);
  return { livingBalance, savingsNet, totalChange };
}
