/**
 * 연간 통계 화면이 쓰는 순수 계산(IMPLEMENTATION_BRIEF_019 §11). `DashboardAnnual.months`는
 * 항상 1~12월 12개 원소이고, `throughMonth`보다 뒤의 월은 백엔드가 이미 0값·
 * `hasTransactions=false`로 채워 보낸다(IMPLEMENTATION_REPORT_043 §6).
 *
 * "월평균 생활비는 hasTransactions=true인 종료된 월을 기준으로 계산한다"(§11) — 올해를 보는
 * 중이면 아직 끝나지 않은 진행 월(throughMonth 자신)은 "종료된 월"이 아니므로 평균/최대·최소
 * 후보에서 제외한다. 과거 연도를 보는 중이면(throughMonth=12) 12월까지 전부 이미 끝난 해이므로
 * 그대로 포함한다.
 */

function isCompletedMonthNumber(monthNumber: number, throughMonth: number, isCurrentYear: boolean): boolean {
  return isCurrentYear ? monthNumber < throughMonth : monthNumber <= throughMonth;
}

/** 평균·최대·최소 계산의 공통 후보군: "종료됐고 실제 거래가 있었던" 월만 남긴다. */
function completedMonthsWithTransactions(
  months: DashboardAnnualMonth[],
  throughMonth: number,
  isCurrentYear: boolean,
): DashboardAnnualMonth[] {
  return months.filter((m, index) => {
    const monthNumber = index + 1;
    return m.hasTransactions && isCompletedMonthNumber(monthNumber, throughMonth, isCurrentYear);
  });
}

export interface AverageLivingExpense {
  average: number;
  /** 평균에 실제로 반영된 월 수 — "N개월 기준" 같은 보조 문구에 쓴다. */
  consideredMonths: number;
}

export function computeAverageLivingExpense(
  months: DashboardAnnualMonth[],
  throughMonth: number,
  isCurrentYear: boolean,
): AverageLivingExpense {
  const candidates = completedMonthsWithTransactions(months, throughMonth, isCurrentYear);
  if (candidates.length === 0) return { average: 0, consideredMonths: 0 };
  const total = candidates.reduce((sum, m) => sum + m.expense, 0);
  return { average: Math.round(total / candidates.length), consideredMonths: candidates.length };
}

export interface MonthHighlight {
  month: string;
  expense: number;
}

export interface ExpenseExtremes {
  max: MonthHighlight | null;
  min: MonthHighlight | null;
}

/**
 * 최대·최소 생활 지출 월. 비교 대상 월 중에서만 고르고(§11), 후보가 없거나 모든 후보의
 * 지출이 0이면 둘 다 null로 숨긴다.
 *
 * 동률 정책(QA 대상 fixture 12): 더 이른 달을 우선한다 — `months` 배열은 항상 1월부터
 * 순서대로 들어오므로, 엄격 부등호(> / <)만으로 비교하면 자연히 먼저 나온(더 이른) 달이
 * 그대로 유지된다.
 */
export function findExpenseExtremes(
  months: DashboardAnnualMonth[],
  throughMonth: number,
  isCurrentYear: boolean,
): ExpenseExtremes {
  const candidates = completedMonthsWithTransactions(months, throughMonth, isCurrentYear);
  if (candidates.length === 0) return { max: null, min: null };
  if (candidates.every((m) => m.expense === 0)) return { max: null, min: null };

  let max = candidates[0];
  let min = candidates[0];
  for (const m of candidates) {
    if (m.expense > max.expense) max = m;
    if (m.expense < min.expense) min = m;
  }
  return {
    max: { month: max.month, expense: max.expense },
    min: { month: min.month, expense: min.expense },
  };
}

/** 연간 저축·투자 순이동 = 각 월 (savingsExpense - savingsIncome)의 합(§11). 미래 월은 0이라 그대로 더해도 안전하다. */
export function computeAnnualSavingsNet(months: DashboardAnnualMonth[]): number {
  return months.reduce((sum, m) => sum + (m.savingsExpense - m.savingsIncome), 0);
}

/**
 * 1월~throughMonth(포함)의 생활 수입 합.
 *
 * QA_REVIEW_043 P1-2 — 이 값은 {@link computeAnnualSavingsNet}과 짝을 이뤄 연간 한줄 요약의
 * "올해 생활 수입의 N%를 저축·투자로 옮겼어요" 비율 계산에 쓰인다. `computeAnnualSavingsNet`은
 * 12개월 전체를 더하지만 미래 월이 항상 0이라 실질적으로 "1월~throughMonth"까지고, 진행 중인
 * 이번 달도 포함된다(이번 달 저축 이동이 이미 분자에 들어가므로). 분모도 반드시 같은
 * "1월~throughMonth"를 써야 한다 — 이전 버전은 `completedMonthsWithTransactions`(진행 중인
 * 이번 달을 제외하는, 평균 계산용 "종료된 월" 정의)를 그대로 재사용해 분자·분모의 기간이
 * 어긋났다(이번 달 저축 이동은 반영되는데 이번 달 수입은 빠짐 → 비율 과장, 1월엔 분모가 아예
 * 0이 되어 저축 통찰 자체가 나오지 않는 문제). `hasTransactions` 필터는 걸지 않는다 — 수입
 * 합계는 "이 달에 뭔가 다른 활동이 있었는지"와 무관하게 실제 수입만 더하면 된다.
 */
export function computeIncomeTotalThroughMonth(months: DashboardAnnualMonth[], throughMonth: number): number {
  return months
    .filter((_, index) => index + 1 <= throughMonth)
    .reduce((sum, m) => sum + m.income, 0);
}

export { completedMonthsWithTransactions, isCompletedMonthNumber };
