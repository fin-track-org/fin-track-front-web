"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getDashboardSummary } from "@/src/lib/api/dashboard/summary";
import { getDashboardDaily } from "@/src/lib/api/dashboard/daily";
import { getDashboardExpenseCategory } from "@/src/lib/api/dashboard/pie";
import { getDashboardBudgetUsage } from "@/src/lib/api/dashboard/budget";
import { getDashboardAnnual } from "@/src/lib/api/dashboard/annual";
import { getCategories } from "@/src/lib/api/categoryApi";
import { formatMonth } from "@/src/utils/date";
import { computeMonthlyFlow, type MonthlyFlow } from "@/src/lib/statistics/monthlyFlow";
import { aggregateDailyToWeekly, type WeeklyBucket } from "@/src/lib/statistics/weeklyBuckets";
import { summarizeBudgetUsage, type BudgetSummary } from "@/src/lib/statistics/budgetCalc";
import { buildMonthlyInsight, buildAnnualInsight, type InsightResult } from "@/src/lib/statistics/insightSummary";
import {
  computeAverageLivingExpense,
  findExpenseExtremes,
  computeAnnualSavingsNet,
  computeIncomeTotalThroughMonth,
  completedMonthsWithTransactions,
  type AverageLivingExpense,
  type ExpenseExtremes,
} from "@/src/lib/statistics/annualCalc";

export type StatisticsView = "month" | "year";

/**
 * `ftapi DashboardService.MIN_SUPPORTED_YEAR`(백엔드가 허용하는 연간 통계 최소 연도)와 같은 값.
 * 두 저장소가 상수를 직접 공유할 방법이 없어(QA_REVIEW_043 P2-2) 값을 여기 그대로 옮겨 적었다 —
 * 백엔드 쪽 값이 바뀌면 이 상수도 함께 바꿔야 한다.
 */
export const MIN_STATISTICS_YEAR = 2000;

// react-query가 아직 데이터를 안 준 동안(undefined) `?? []`로 매번 새 배열을 만들면 그 배열을
// deps로 쓰는 useMemo가 매 렌더마다 다시 계산된다. 참조가 안정적인 빈 배열 하나를 재사용해
// "데이터 없음" 상태에서는 deps가 그대로 유지되게 한다.
const EMPTY_ARRAY: never[] = [];

/**
 * `/home/statistics`의 모바일·데스크톱 화면이 공유하는 데이터/계산 훅
 * (IMPLEMENTATION_BRIEF_019). `DashboardPage`(홈)의 모바일/데스크톱 분기와 달리, 이 화면은
 * 두 트리가 대부분 같은 query 세트(월간 summary/daily/category/budget, 연간 annual)를 쓰므로
 * 훅 하나로 데이터·파생 계산을 모으고, 화면 트리만 `MobileStatisticsView`/`DesktopStatisticsView`로
 * 나눈다 — react-query가 동일 queryKey를 캐시 공유하므로 두 트리가 동시에 마운트되지 않는 한
 * (App Router가 항상 하나만 그린다) 중복 요청도 생기지 않는다.
 *
 * §12 "기간 변경 중 이전 월 숫자가 새 월 제목 아래 남아 보이지 않게 한다. placeholderData를 쓸
 * 경우... 금지한다" — 이 훅은 `placeholderData`/`keepPreviousData`를 전혀 쓰지 않는다. 그래서
 * `selectedMonth`/`currentYear`가 바뀌면 react-query 기본 동작대로 해당 쿼리의 `data`가 즉시
 * `undefined`가 되고, 각 섹션은 그 로딩 상태를 그대로 보여준다(오래된 숫자가 새 제목 아래 남지 않음).
 */
export function useStatisticsData() {
  const [view, setView] = useState<StatisticsView>("month");
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [currentYear, setCurrentYear] = useState(() => new Date().getFullYear());

  const selectedMonth = useMemo(() => formatMonth(currentMonth), [currentMonth]);
  const todayMonth = useMemo(() => formatMonth(new Date()), []);
  const thisYear = useMemo(() => new Date().getFullYear(), []);
  const isCurrentMonthPeriod = selectedMonth === todayMonth;
  const isCurrentYear = currentYear === thisYear;
  // "yyyy-MM" 문자열은 사전식 비교가 곧 시간순 비교와 같다(§ draftClassificationQueue.ts와 동일 전제).
  const canGoNextMonth = selectedMonth < todayMonth;
  const canGoNextYear = currentYear < thisYear;
  // QA_REVIEW_043 P2-2 — 백엔드는 [MIN_STATISTICS_YEAR, 올해]만 허용(400 INVALID_YEAR_RANGE)한다.
  // 프론트에 가드가 없으면 사용자가 이전 연도를 계속 눌러 결국 400 오류로 끝난다.
  const canGoPrevYear = currentYear > MIN_STATISTICS_YEAR;

  const handlePrevMonth = () => setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1));
  const handleNextMonth = () => {
    if (!canGoNextMonth) return; // §5 "현재 기간보다 미래로 이동하는 버튼은 disabled"
    setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1));
  };
  const handlePrevYear = () => {
    if (!canGoPrevYear) return;
    setCurrentYear((y) => y - 1);
  };
  const handleNextYear = () => {
    if (!canGoNextYear) return;
    setCurrentYear((y) => y + 1);
  };

  const { data: rawCategories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: () => getCategories(),
  });
  const categoryColors = useMemo(
    () => Object.fromEntries(rawCategories.map((c) => [c.name, c.colorCode])),
    [rawCategories],
  );

  // 월간 쿼리 4개 — §12 "섹션별로 query 상태를 분리"해 하나가 실패해도 나머지는 그대로 쓴다.
  const summaryQuery = useQuery({
    queryKey: ["dashboardSummary", selectedMonth],
    queryFn: () => getDashboardSummary(selectedMonth),
    retry: false,
    enabled: view === "month",
  });
  const dailyQuery = useQuery({
    queryKey: ["dashboardDaily", selectedMonth],
    queryFn: () => getDashboardDaily(selectedMonth),
    retry: false,
    enabled: view === "month",
  });
  const categoryQuery = useQuery({
    queryKey: ["dashboardExpenseCategory", selectedMonth],
    queryFn: () => getDashboardExpenseCategory(selectedMonth),
    retry: false,
    enabled: view === "month",
  });
  const budgetQuery = useQuery({
    queryKey: ["dashboardBudgetUsage", selectedMonth],
    queryFn: () => getDashboardBudgetUsage(selectedMonth),
    retry: false,
    enabled: view === "month",
  });
  const annualQuery = useQuery({
    queryKey: ["dashboardAnnual", currentYear],
    queryFn: () => getDashboardAnnual(currentYear),
    retry: false,
    enabled: view === "year",
  });

  const summary = summaryQuery.data;
  const dailyData = dailyQuery.data ?? EMPTY_ARRAY;
  const categoryData = categoryQuery.data ?? EMPTY_ARRAY;
  const budgetData = budgetQuery.data ?? EMPTY_ARRAY;
  const annual = annualQuery.data;

  // 일별 API는 그 달에 (임시 저장 제외) 거래가 하나라도 있는 날짜만 돌려준다
  // (ftapi DashboardService.getDailyBalance). 그래서 길이 0 = "이번 달 기록이 하나도 없다" —
  // 연간 annual.months[].hasTransactions와 같은 정의를 월간에도 그대로 쓴다.
  const monthHasAnyTransactions = dailyData.length > 0;

  const monthlyFlow: MonthlyFlow | undefined = summary ? computeMonthlyFlow(summary) : undefined;

  const weeklyBuckets: WeeklyBucket[] = useMemo(
    () => aggregateDailyToWeekly(dailyData, selectedMonth),
    [dailyData, selectedMonth],
  );

  const topMonthlyCategory = useMemo(
    () => (categoryData.length > 0 ? { name: categoryData[0].category, percentage: categoryData[0].percentage } : null),
    [categoryData],
  );

  const monthlyInsight: InsightResult | undefined = useMemo(() => {
    if (!summary || !monthlyFlow) return undefined;
    return buildMonthlyInsight({
      income: summary.income,
      savingsNet: monthlyFlow.savingsNet,
      // DashboardSummary 타입은 number로 선언돼 있지만 서버(MonthlyComparisonRes)는 전월 데이터가
      // 없으면 실제로 null을 내려준다 — 기존 home/dashboard/section/SummaryCards.tsx도 같은 이유로
      // `?:` 방어 코드를 쓴다. 공유 타입(dashboard.d.ts)은 홈 대시보드도 함께 쓰므로 §15 보존
      // 범위를 지키기 위해 타입 자체는 바꾸지 않고 이 훅 안에서만 방어적으로 다룬다.
      expenseChangeRate: summary.expenseChangeRate ?? null,
      topCategory: topMonthlyCategory,
      hasAnyTransactions: monthHasAnyTransactions,
    });
  }, [summary, monthlyFlow, topMonthlyCategory, monthHasAnyTransactions]);

  const budgetSummary: BudgetSummary = useMemo(() => summarizeBudgetUsage(budgetData), [budgetData]);
  const hasBudget = budgetData.length > 0;

  const annualHighlights:
    | { average: AverageLivingExpense; extremes: ExpenseExtremes; savingsNet: number; incomeTotalThroughMonth: number }
    | undefined = useMemo(() => {
    if (!annual) return undefined;
    return {
      average: computeAverageLivingExpense(annual.months, annual.throughMonth, isCurrentYear),
      extremes: findExpenseExtremes(annual.months, annual.throughMonth, isCurrentYear),
      savingsNet: computeAnnualSavingsNet(annual.months),
      // QA_REVIEW_043 P1-2 — annualSavingsNet(=사실상 1월~throughMonth 합)과 반드시 같은 기간을
      // 써야 한다. isCurrentYear를 받지 않는다 — throughMonth 자체가 이미 "올해면 현재 월,
      // 과거면 12"를 반영하므로 1월~throughMonth를 그대로 합산하면 항상 올바른 기간이 된다.
      incomeTotalThroughMonth: computeIncomeTotalThroughMonth(annual.months, annual.throughMonth),
    };
  }, [annual, isCurrentYear]);

  const topAnnualCategory = useMemo(
    () =>
      annual && annual.categories.length > 0
        ? { name: annual.categories[0].category, percentage: annual.categories[0].percentage }
        : null,
    [annual],
  );

  const annualInsight: InsightResult | undefined = useMemo(() => {
    if (!annual || !annualHighlights) return undefined;
    return buildAnnualInsight({
      months: annual.months,
      throughMonth: annual.throughMonth,
      completedMonths: completedMonthsWithTransactions(annual.months, annual.throughMonth, isCurrentYear),
      annualSavingsNet: annualHighlights.savingsNet,
      incomeTotalThroughMonth: annualHighlights.incomeTotalThroughMonth,
      topCategory: topAnnualCategory,
    });
  }, [annual, annualHighlights, isCurrentYear, topAnnualCategory]);

  const annualHasAnyTransactions = annual ? annual.months.some((m) => m.hasTransactions) : false;

  return {
    view,
    setView,

    currentMonth,
    selectedMonth,
    isCurrentMonthPeriod,
    canGoNextMonth,
    handlePrevMonth,
    handleNextMonth,

    currentYear,
    isCurrentYear,
    canGoNextYear,
    canGoPrevYear,
    handlePrevYear,
    handleNextYear,

    categoryColors,

    summaryQuery,
    dailyQuery,
    categoryQuery,
    budgetQuery,
    annualQuery,

    summary,
    dailyData,
    categoryData,
    budgetData,
    annual,

    monthHasAnyTransactions,
    monthlyFlow,
    weeklyBuckets,
    monthlyInsight,

    budgetSummary,
    hasBudget,

    annualHighlights,
    annualInsight,
    annualHasAnyTransactions,
  };
}

export type UseStatisticsDataResult = ReturnType<typeof useStatisticsData>;
