#!/usr/bin/env node
/**
 * IMPLEMENTATION_BRIEF_019 §16 "필수 fixture" 1~12 + QA_REVIEW_043 §6이 요구한 보강 fixture
 * 13~15를 검증한다.
 *
 * 이 저장소에는 프론트엔드 테스트 러너(jest/vitest 등)가 없어(scripts/verify-*.ts와 같은 방식),
 * Node의 네이티브 TypeScript 실행과 `node:assert`만으로 실제로 실행되는 검증을 작성했다.
 *
 * 5("일반 이체가 생활 수입·지출에 미포함")·10·11("연간 미래 월 제외"/"거래 없는 달과 미래 달
 * 구분")은 백엔드 집계(IMPLEMENTATION_REPORT_043)가 이미 보증하는 부분이 있다 — 이 스크립트는
 * 그 보증된 응답 모양을 프론트 순수 함수가 올바르게 "소비"하는지만 검증한다(실제 SQL 자체는
 * 이 스크립트로 검증할 수 없다).
 *
 * 13은 QA_REVIEW_043 P1-1(복합 오류 중 AuthError 우선순위), 14·15는 P1-2(연간 저축 비율의
 * 분자·분모 기간 정합성)를 고정한다. P1-3(연간 카테고리 집계 기간)은 백엔드 서비스가 repository를
 * 올바른 인자로 호출하는지를 `ftapi` `DashboardServiceTest`가 검증한다(이 스크립트 대상 아님).
 * P2-2(최소 연도 가드)는 `useStatisticsData.ts`의 한 줄짜리 비교식이라 별도 fixture 없이 코드
 * 검토로 커버했다 — 그 파일은 `@tanstack/react-query`와 여러 `@/` alias import를 포함하고 있어
 * Node 네이티브 실행(경로 alias 미해석)으로 직접 import할 수 없다.
 *
 * 실행: `node scripts/verify-statistics.ts` (cwd: ftweb/)
 */

import assert from "node:assert/strict";
import { computeMonthlyFlow } from "../src/lib/statistics/monthlyFlow.ts";
import { aggregateDailyToWeekly } from "../src/lib/statistics/weeklyBuckets.ts";
import { summarizeBudgetUsage } from "../src/lib/statistics/budgetCalc.ts";
import { buildMonthlyInsight, buildAnnualInsight } from "../src/lib/statistics/insightSummary.ts";
import {
  computeAverageLivingExpense,
  findExpenseExtremes,
  computeAnnualSavingsNet,
  computeIncomeTotalThroughMonth,
  completedMonthsWithTransactions,
} from "../src/lib/statistics/annualCalc.ts";
import { containsAuthError } from "../src/lib/statistics/errorPriority.ts";
import { AuthError } from "../src/lib/api/authError.ts";

let passCount = 0;
function ok(label: string) {
  console.log(`OK  ${label}`);
  passCount++;
}

function daily(date: string, income: number, expense: number): DashboardDaily {
  return { date, income, expense, savingsIncome: 0, savingsExpense: 0, balance: 0 };
}

function budgetItem(targetAmount: number, spentAmount: number): BudgetUsageRes {
  return {
    categoryId: "cat",
    categoryName: "카테고리",
    subcategoryId: null,
    subcategoryName: null,
    targetAmount,
    spentAmount,
    source: "BUDGET",
  };
}

function annualMonth(month: string, overrides: Partial<DashboardAnnualMonth> = {}): DashboardAnnualMonth {
  return {
    month,
    income: 0,
    expense: 0,
    savingsIncome: 0,
    savingsExpense: 0,
    livingBalance: 0,
    totalChange: 0,
    hasTransactions: false,
    ...overrides,
  };
}

/* 1. 생활 수지 양수/음수 ------------------------------------------------------ */
{
  const positive = computeMonthlyFlow({ income: 3_000_000, expense: 2_000_000, savingsIncome: 0, savingsExpense: 0 });
  assert.equal(positive.livingBalance, 1_000_000);
  const negative = computeMonthlyFlow({ income: 1_000_000, expense: 1_500_000, savingsIncome: 0, savingsExpense: 0 });
  assert.equal(negative.livingBalance, -500_000);
  ok("1.생활 수지 양수/음수");
}

/* 2. 저축 이동만 있음 --------------------------------------------------------- */
{
  const flow = computeMonthlyFlow({ income: 3_000_000, expense: 2_000_000, savingsIncome: 0, savingsExpense: 500_000 });
  assert.equal(flow.savingsNet, 500_000); // 순저축(양수)
  assert.equal(flow.totalChange, 500_000); // (3M) - (2M+0.5M)
  ok("2.저축 이동만 있음");
}

/* 3. 저축에서 가져오기만 있음 ------------------------------------------------- */
{
  const flow = computeMonthlyFlow({ income: 1_000_000, expense: 800_000, savingsIncome: 300_000, savingsExpense: 0 });
  assert.equal(flow.savingsNet, -300_000); // 순회수(음수)
  assert.equal(flow.totalChange, 500_000); // (1M+0.3M) - 0.8M
  ok("3.저축에서 가져오기만 있음");
}

/* 4. 양방향 저축 이동 --------------------------------------------------------- */
{
  const income = 2_000_000, expense = 1_500_000, savingsIncome = 200_000, savingsExpense = 400_000;
  const flow = computeMonthlyFlow({ income, expense, savingsIncome, savingsExpense });
  assert.equal(flow.savingsNet, 200_000);
  const expectedTotalChange = income + savingsIncome - (expense + savingsExpense);
  assert.equal(flow.totalChange, expectedTotalChange);
  assert.equal(flow.totalChange, 300_000);
  ok("4.양방향 저축 이동");
}

/* 5. 일반 이체가 생활 수입·지출에 미포함 -------------------------------------- */
// 백엔드가 income/expense 자체를 이미 내부 카테고리 제외해 반환한다(REPORT_043 §1·§3).
// 프론트 계산은 income/expense/savingsIncome/savingsExpense 네 필드만 쓰고 그 외 어떤
// 필드(예: 서버가 추가로 내려줄 수 있는 balance 등)도 섞지 않는지 — 주간 집계에서도 동일한지
// 검증한다.
{
  const d = { date: "2026-08-05", income: 10_000, expense: 5_000, savingsIncome: 999_999, savingsExpense: 999_999, balance: 999_999 } as DashboardDaily;
  const buckets = aggregateDailyToWeekly([d], "2026-08");
  const week1 = buckets[0];
  assert.equal(week1.income, 10_000);
  assert.equal(week1.expense, 5_000); // savingsIncome/savingsExpense/balance는 섞이지 않는다
  ok("5.일반 이체(및 저축 필드)가 주간 생활 수입·지출 집계에 섞이지 않는다");
}

/* 6. 28/29/30/31일 월의 주간 버킷 --------------------------------------------- */
{
  const feb2026 = aggregateDailyToWeekly([], "2026-02"); // 평년 2월(28일) — 5주 없음
  assert.equal(feb2026.length, 4);

  const feb2028 = aggregateDailyToWeekly([], "2028-02"); // 윤년 2월(29일) — 5주는 29일 하루
  assert.equal(feb2028.length, 5);
  assert.deepEqual([feb2028[4].startDay, feb2028[4].endDay], [29, 29]);

  const apr2026 = aggregateDailyToWeekly([], "2026-04"); // 30일 — 5주는 29~30일
  assert.equal(apr2026.length, 5);
  assert.deepEqual([apr2026[4].startDay, apr2026[4].endDay], [29, 30]);

  const jan2026 = aggregateDailyToWeekly([], "2026-01"); // 31일 — 5주는 29~31일
  assert.equal(jan2026.length, 5);
  assert.deepEqual([jan2026[4].startDay, jan2026[4].endDay], [29, 31]);

  ok("6.28/29/30/31일 월의 주간 버킷(5주 존재 여부·범위)이 월 길이에 맞게 결정된다");
}

/* 7. 비정상 날짜 안전 처리 ----------------------------------------------------- */
{
  const input = [
    daily("2026-08-01", 1000, 500),
    daily("", 999, 999),
    daily("not-a-date", 999, 999),
    daily("2026-08-99", 999, 999), // 형식은 맞지만 범위 밖(안전하게 제외)
  ];
  assert.doesNotThrow(() => aggregateDailyToWeekly(input, "2026-08"));
  const buckets = aggregateDailyToWeekly(input, "2026-08");
  const total = buckets.reduce((s, b) => s + b.income + b.expense, 0);
  assert.equal(total, 1500); // 비정상 항목은 모두 제외되고 정상 항목만 반영된다
  ok("7.비정상 날짜는 예외 없이 안전하게 제외된다");
}

/* 8. 예산 없음/0원/초과/잔여 --------------------------------------------------- */
{
  const none = summarizeBudgetUsage([]);
  assert.equal(none.targetTotal, 0);
  assert.equal(none.percentage, null); // 0으로 나누지 않는다

  const zeroTarget = summarizeBudgetUsage([budgetItem(0, 0)]);
  assert.equal(zeroTarget.percentage, null);

  const over = summarizeBudgetUsage([budgetItem(1_000_000, 1_200_000)]);
  assert.equal(over.overAmount, 200_000);
  assert.equal(over.percentage, 120);

  const remaining = summarizeBudgetUsage([budgetItem(1_000_000, 600_000)]);
  assert.equal(remaining.overAmount, -400_000);
  assert.equal(remaining.percentage, 60);

  ok("8.예산 없음/0원/초과/잔여");
}

/* 9. 전월 분모 0에서 변화율 미생성 --------------------------------------------- */
{
  // 서버가 전월 데이터 없음/전월 0을 이미 null로 내려준다(DashboardService.calcChangeRate) —
  // 프론트는 그 null을 그대로 존중해 "전월 대비" 규칙을 건너뛰고 다음 규칙으로 넘어가야 한다.
  const res = buildMonthlyInsight({
    income: 1_000_000,
    savingsNet: 0,
    expenseChangeRate: null,
    topCategory: { name: "식비", percentage: 40 },
    hasAnyTransactions: true,
  });
  assert.notEqual(res.basis, "expense-change");
  assert.equal(res.basis, "top-category"); // 저축 이동도 미미하니 다음 우선순위(카테고리)로
  ok("9.전월 분모 0(=null)에서는 전월 대비 변화율 문구를 만들지 않는다");
}

/* 10. 연간 미래 월 제외 -------------------------------------------------------- */
{
  const months: DashboardAnnualMonth[] = Array.from({ length: 12 }, (_, i) => {
    const monthNumber = i + 1;
    // throughMonth=6인데도 7~12월에 값이 있다고 가정(방어적 fixture) — 그래도 평균/최대·최소
    // 후보에서 완전히 제외돼야 한다.
    return annualMonth(`2026-${String(monthNumber).padStart(2, "0")}`, {
      expense: 100_000 * monthNumber,
      hasTransactions: true,
    });
  });
  const throughMonth = 6;
  const avg = computeAverageLivingExpense(months, throughMonth, true);
  // isCurrentYear=true면 throughMonth(6) 자신도 "아직 진행 중"이라 제외 → 1~5월(5개월)만 후보
  assert.equal(avg.consideredMonths, 5);
  const extremes = findExpenseExtremes(months, throughMonth, true);
  assert.equal(extremes.max?.month, "2026-05"); // 6월 이후는 후보에서 완전히 제외되어 5월이 최대
  ok("10.연간 미래 월은 평균·최대·최소 계산 후보에서 완전히 제외된다");
}

/* 11. 연간 거래 없는 달과 미래 달 구분 ------------------------------------------ */
{
  const months: DashboardAnnualMonth[] = Array.from({ length: 12 }, (_, i) => {
    const monthNumber = i + 1;
    if (monthNumber === 3) {
      // 3월: 과거(throughMonth=6 이전)인데 실제로 거래가 없었던 달
      return annualMonth("2026-03", { expense: 0, hasTransactions: false });
    }
    if (monthNumber < 6) {
      return annualMonth(`2026-${String(monthNumber).padStart(2, "0")}`, { expense: 200_000, hasTransactions: true });
    }
    // 6월(진행 중) 이후 — 미래/진행 중, hasTransactions=false
    return annualMonth(`2026-${String(monthNumber).padStart(2, "0")}`, { expense: 0, hasTransactions: false });
  });
  const throughMonth = 6;
  const avg = computeAverageLivingExpense(months, throughMonth, true);
  // 거래 없는 3월과 진행 중인 6월 이후 모두 후보에서 빠지고, 1·2·4·5월(거래 있음)만 남는다.
  assert.equal(avg.consideredMonths, 4);
  ok('11."거래 없는 과거 달"과 "미래/진행 중인 달"이 하나의 규칙(hasTransactions && 종료됨)으로 동일하게 제외된다');
}

/* 12. 연간 최대·최소 동률 정책 ------------------------------------------------- */
{
  const months: DashboardAnnualMonth[] = [
    annualMonth("2026-01", { expense: 300_000, hasTransactions: true }),
    annualMonth("2026-02", { expense: 300_000, hasTransactions: true }), // 1월과 동률(최대)
    annualMonth("2026-03", { expense: 100_000, hasTransactions: true }),
    annualMonth("2026-04", { expense: 100_000, hasTransactions: true }), // 3월과 동률(최소)
    ...Array.from({ length: 8 }, (_, i) => annualMonth(`2026-${String(i + 5).padStart(2, "0")}`)),
  ];
  const extremes = findExpenseExtremes(months, 12, false); // 과거 연도로 12개월 전부 비교 대상
  assert.equal(extremes.max?.month, "2026-01"); // 최대 동률 → 더 이른 달(1월)
  assert.equal(extremes.min?.month, "2026-03"); // 최소 동률 → 더 이른 달(3월)

  const allZero = findExpenseExtremes(
    Array.from({ length: 12 }, (_, i) => annualMonth(`2026-${String(i + 1).padStart(2, "0")}`, { hasTransactions: true })),
    12,
    false,
  );
  assert.equal(allZero.max, null); // 모든 비교 월의 지출이 0이면 최대·최소를 숨긴다
  assert.equal(allZero.min, null);

  ok("12.연간 최대·최소 동률은 더 이른 달을 선택하고, 전부 0원이면 숨긴다");
}

/* 13. QA_REVIEW_043 P1-1 — 앞선 일반 오류가 뒤의 AuthError를 가리지 않는다 --------------------- */
{
  const genericError = new Error("네트워크 오류");
  const authError = new AuthError();

  // "앞선 일반 오류 + 뒤의 AuthError" 조합 — a || b || c 식으로 합치면 genericError가 먼저 선택돼
  // AuthError를 가렸던 그 재현 상태를 그대로 fixture화했다.
  assert.equal(containsAuthError([genericError, null, authError, null]), true);
  // AuthError가 배열 맨 앞이어도 동일하게 감지돼야 한다(순서 의존성이 없어야 함).
  assert.equal(containsAuthError([authError, genericError]), true);
  // AuthError가 전혀 없으면 false.
  assert.equal(containsAuthError([genericError, null, undefined]), false);
  assert.equal(containsAuthError([]), false);

  ok("13.여러 query 오류 중 AuthError가 하나라도 있으면 순서와 무관하게 감지된다");
}

/* 14. QA_REVIEW_043 P1-2 — 연간 저축 비율의 분자·분모가 같은 기간(1월~throughMonth)을 쓴다 ------ */
{
  // 현재 연도 1월, 이번 달(=1월, 아직 진행 중)에만 수입·저축 이동이 있는 재현 상태.
  // 예전 completedIncomeTotal은 "종료된 월"만 더해 1월엔 분모가 0이 되어 이 저축 이동 자체가
  // 통찰에 전혀 반영되지 않았다(브리프가 원인으로 지목한 "1월엔 통찰이 아예 안 나옴").
  const months: DashboardAnnualMonth[] = [
    annualMonth("2026-01", { income: 1_000_000, savingsExpense: 500_000, hasTransactions: true }),
    ...Array.from({ length: 11 }, (_, i) => annualMonth(`2026-${String(i + 2).padStart(2, "0")}`)),
  ];
  const throughMonth = 1;
  const isCurrentYear = true;

  const annualSavingsNet = computeAnnualSavingsNet(months);
  const incomeTotalThroughMonth = computeIncomeTotalThroughMonth(months, throughMonth);
  assert.equal(annualSavingsNet, 500_000);
  assert.equal(incomeTotalThroughMonth, 1_000_000); // 이번 달(1월) 수입도 분모에 포함된다

  const insight = buildAnnualInsight({
    months,
    throughMonth,
    completedMonths: completedMonthsWithTransactions(months, throughMonth, isCurrentYear),
    annualSavingsNet,
    incomeTotalThroughMonth,
    topCategory: null,
  });
  assert.equal(insight.basis, "savings-move"); // "no-data"도 "insufficient-data"도 아니다
  assert.match(insight.title, /50%/);

  ok("14.연간 저축 비율은 분자·분모가 같은 기간(1월~throughMonth, 진행 중인 달 포함)을 쓴다");
}

/* 15. QA_REVIEW_043 P1-2 — 진행 중인 이번 달에만 활동이 있어도 "아직 올해 기록이 없어요"를
    잘못 반환하지 않는다(어떤 규칙에도 안 걸리면 "기록 부족"이지 "기록 없음"이 아니다). --------- */
{
  const months: DashboardAnnualMonth[] = [
    annualMonth("2026-01", { income: 500_000, expense: 500_000, hasTransactions: true }), // 저축 이동 없음, 카테고리 없음
    ...Array.from({ length: 11 }, (_, i) => annualMonth(`2026-${String(i + 2).padStart(2, "0")}`)),
  ];
  const insight = buildAnnualInsight({
    months,
    throughMonth: 1,
    completedMonths: completedMonthsWithTransactions(months, 1, true),
    annualSavingsNet: computeAnnualSavingsNet(months),
    incomeTotalThroughMonth: computeIncomeTotalThroughMonth(months, 1),
    topCategory: null,
  });
  assert.equal(insight.basis, "insufficient-data"); // "no-data"였다면 이 fixture는 실패한다

  ok('15.진행 중인 이번 달에만 활동이 있으면 "기록 없음"이 아니라 "기록 부족"으로 판정한다');
}

console.log(`\n총 ${passCount}개 통과`);
