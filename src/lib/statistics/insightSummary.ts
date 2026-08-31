/**
 * "한줄 요약"/"한줄 결산" 순수 함수(IMPLEMENTATION_BRIEF_019 §9, DECISION_016 §4).
 *
 * AI가 원인을 추측하지 않고, 조회된 집계값만으로 같은 입력 → 같은 문구가 나오도록 결정적으로
 * 만든다. 우선순위: 전월 대비 생활 지출 변화 → 저축·투자 순이동 → 최다 지출 카테고리 →
 * 기록 부족 안내.
 *
 * 임계값 근거:
 * - `SIGNIFICANT_EXPENSE_CHANGE_RATE_PERCENT = 5`: 서버 `expenseChangeRate`는 소수점 1자리까지
 *   내려오는데(`DashboardService.calcChangeRate`), 1~2%대 변화까지 "달라졌다"고 말하면 매달
 *   의미 없는 잡음성 문구가 뜬다. 두 자릿수에 가까운 변화(5%)부터 "지난달과 달라졌다"고 말할
 *   근거가 있다고 보고 채택했다.
 * - `SIGNIFICANT_SAVINGS_MOVE_RATIO_PERCENT = 10`: 저축·투자 이동이 생활 수입의 10% 미만이면
 *   보통 정기 이체 수준(자동이체 등)이라 별도로 짚을 만한 변화가 아니라고 보고, 두 자릿수(10%)
 *   부터 "이번 달/올해 저축을 많이/적게 했다"고 말할 근거가 있다고 판단했다.
 * 두 값 모두 실측 데이터가 아닌 판단값이므로 이름을 붙여 export하고, 실제 서비스 사용 데이터로
 * 조정이 필요하면 이 상수만 바꾸면 되게 했다.
 */

export const SIGNIFICANT_EXPENSE_CHANGE_RATE_PERCENT = 5;
export const SIGNIFICANT_SAVINGS_MOVE_RATIO_PERCENT = 10;

export type InsightBasis = "expense-change" | "savings-move" | "top-category" | "insufficient-data" | "no-data";

export interface InsightResult {
  basis: InsightBasis;
  title: string;
  copy?: string;
}

export interface TopCategory {
  name: string;
  percentage: number;
}

export interface MonthlyInsightInput {
  income: number;
  savingsNet: number; // savingsExpense - savingsIncome (monthlyFlow.ts와 동일 정의)
  /** 서버가 이미 계산해 내려주는 전월 대비 생활 지출 변화율(%). 전월 데이터가 없으면 null. */
  expenseChangeRate: number | null;
  topCategory: TopCategory | null;
  /** 이번 기간(월)에 거래가 하나라도 있었는지. false면 다른 규칙을 보지 않고 "기록 없음"을 반환한다. */
  hasAnyTransactions: boolean;
}

export function buildMonthlyInsight(input: MonthlyInsightInput): InsightResult {
  if (!input.hasAnyTransactions) {
    return { basis: "no-data", title: "아직 이 기간 기록이 없어요." };
  }

  // 1. 전월 대비 생활 지출 변화 — 분모(전월 지출)가 0이면 서버가 이미 null을 내려주므로
  //    여기서 별도로 0-나눗셈을 만들지 않는다(§9 fixture "전월 분모 0에서 변화율 미생성").
  if (input.expenseChangeRate != null && Math.abs(input.expenseChangeRate) >= SIGNIFICANT_EXPENSE_CHANGE_RATE_PERCENT) {
    const direction = input.expenseChangeRate < 0 ? "줄었어요" : "늘었어요";
    const rate = Math.abs(Math.round(input.expenseChangeRate));
    return {
      basis: "expense-change",
      title: `지난달보다 생활 지출이 ${rate}% ${direction}.`,
      copy: input.topCategory
        ? `${input.topCategory.name} 카테고리 지출이 ${input.topCategory.percentage}%로 가장 컸어요.`
        : undefined,
    };
  }

  // 2. 저축·투자 순이동이 생활 수입 대비 의미 있는 경우
  if (input.income > 0) {
    const moveRatio = (Math.abs(input.savingsNet) / input.income) * 100;
    if (moveRatio >= SIGNIFICANT_SAVINGS_MOVE_RATIO_PERCENT) {
      const rounded = Math.round(moveRatio);
      return input.savingsNet > 0
        ? { basis: "savings-move", title: `생활 수입의 ${rounded}%를 저축·투자로 옮겼어요.` }
        : { basis: "savings-move", title: `저축·투자에서 생활 수입의 ${rounded}%를 가져왔어요.` };
    }
  }

  // 3. 카테고리 데이터가 있으면 최다 카테고리
  if (input.topCategory) {
    return {
      basis: "top-category",
      title: `${input.topCategory.name} 카테고리에 가장 많이 썼어요.`,
      copy: `전체 생활 지출의 ${input.topCategory.percentage}%예요.`,
    };
  }

  // 4. 그 외 기록 부족 안내
  return { basis: "insufficient-data", title: "기록이 더 쌓이면 비교할 수 있어요." };
}

export interface AnnualInsightInput {
  /** 1~12월 12개 원소. */
  months: DashboardAnnualMonth[];
  throughMonth: number;
  /**
   * annualCalc.completedMonthsWithTransactions(months, throughMonth, isCurrentYear) 결과 —
   * 진행 중인 이번 달을 제외한 "종료된" 월만 남긴 목록. 규칙 1(가장 최근 두 완료 월 비교)에만
   * 쓴다. 이 파일은 `scripts/verify-statistics.ts`(Node 네이티브 TS 실행)와 실제 Next.js 앱
   * 양쪽에서 import되는데, 두 환경이 서로 다른 import 확장자 규칙을 요구해(`.ts`는 Node 전용,
   * 확장자 없음은 tsc `bundler` 해석 전용) 어느 쪽으로도 다른 lib 파일을 직접 import할 수 없다
   * (errorPriority.ts의 같은 문제 참고) — 그래서 계산을 여기서 하지 않고 호출자가 이미 계산한
   * 결과를 받는다.
   */
  completedMonths: DashboardAnnualMonth[];
  /** annualCalc.computeAnnualSavingsNet 결과 — 실질적으로 1월~throughMonth(진행 중인 이번 달 포함) 합계다. */
  annualSavingsNet: number;
  /** annualCalc.computeIncomeTotalThroughMonth 결과 — annualSavingsNet과 반드시 같은 기간(1월~throughMonth)이어야 한다(QA_REVIEW_043 P1-2). */
  incomeTotalThroughMonth: number;
  topCategory: TopCategory | null;
}

/**
 * 연간 한줄 요약. 브리프 §9는 월간 규칙만 상세히 정의하지만(연간은 §5에 섹션으로만 명시),
 * 같은 "추측 없이 결정적으로" 원칙과 우선순위 구조를 연간 단위로 확장했다 — 전월 대비 대신
 * "가장 최근 두 완료 월"의 생활 지출 변화를 비교한다.
 */
export function buildAnnualInsight(input: AnnualInsightInput): InsightResult {
  // "올해 아직 아무 기록도 없다"는 1월~throughMonth(진행 중인 이번 달 포함) 전체를 봐야 한다.
  // QA_REVIEW_043 P1-2 — 예전에는 "종료된 월"만 봐서, 1월에 이번 달 기록만 있어도(아직 종료된
  // 월이 하나도 없으므로) 실제로는 기록이 있는데 "아직 올해 기록이 없어요"를 잘못 반환했다.
  const monthsThroughCurrent = input.months.filter((_, index) => index + 1 <= input.throughMonth);
  const hasAnyActivityThisYear = monthsThroughCurrent.some((m) => m.hasTransactions);
  if (!hasAnyActivityThisYear) {
    return { basis: "no-data", title: "아직 올해 기록이 없어요." };
  }

  // 아래 "전월 대비" 비교(규칙 1)는 진행 중인 이번 달을 비교 대상에서 제외한 "종료된 월"만 쓴다
  // — 아직 안 끝난 달의 지출을 완료된 달과 비교하면 항상 더 적어 보이는 왜곡이 생기기 때문이다.
  const completed = input.completedMonths;

  // 1. 가장 최근 완료 월의 생활 지출을 그 이전 완료 월과 비교(월간의 "전월 대비"에 대응)
  if (completed.length >= 2) {
    const last = completed[completed.length - 1];
    const prev = completed[completed.length - 2];
    if (prev.expense > 0) {
      const rate = ((last.expense - prev.expense) / prev.expense) * 100;
      if (Math.abs(rate) >= SIGNIFICANT_EXPENSE_CHANGE_RATE_PERCENT) {
        const direction = rate < 0 ? "줄었어요" : "늘었어요";
        return {
          basis: "expense-change",
          title: `${monthNumberLabel(last)}이 ${monthNumberLabel(prev)}보다 생활 지출이 ${Math.abs(
            Math.round(rate),
          )}% ${direction}.`,
        };
      }
    }
  }

  // 2. 저축·투자 순이동
  if (input.incomeTotalThroughMonth > 0) {
    const ratio = (Math.abs(input.annualSavingsNet) / input.incomeTotalThroughMonth) * 100;
    if (ratio >= SIGNIFICANT_SAVINGS_MOVE_RATIO_PERCENT) {
      const rounded = Math.round(ratio);
      return input.annualSavingsNet > 0
        ? { basis: "savings-move", title: `올해 생활 수입의 ${rounded}%를 저축·투자로 옮겼어요.` }
        : { basis: "savings-move", title: `올해 저축·투자에서 생활 수입의 ${rounded}%를 가져왔어요.` };
    }
  }

  // 3. 최다 카테고리
  if (input.topCategory) {
    return {
      basis: "top-category",
      title: `${input.topCategory.name} 카테고리에 올해 가장 많이 썼어요.`,
      copy: `연간 생활 지출의 ${input.topCategory.percentage}%예요.`,
    };
  }

  // 4. 기록 부족
  return { basis: "insufficient-data", title: "기록이 더 쌓이면 비교할 수 있어요." };
}

function monthNumberLabel(month: DashboardAnnualMonth): string {
  const parsed = /^\d{4}-(\d{2})$/.exec(month.month);
  const num = parsed ? Number(parsed[1]) : NaN;
  return Number.isFinite(num) ? `${num}월` : month.month;
}
