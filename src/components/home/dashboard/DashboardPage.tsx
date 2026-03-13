"use client";

import { useState, useMemo, useEffect } from "react";
import MonthSelector from "./section/MonthSelector";
import SummaryCards from "./section/SummaryCards";
import BalanceChart from "./section/BalanceChart";
import CategoryChart from "./section/CategoryChart";
import BudgetBar from "./section/BudgetBar";
import RecentTransactions from "./section/RecentTransactions";
import { useQuery } from "@tanstack/react-query";
import DashboardSkeleton from "../../skeleton/DashboardSkeleton";
import { useRouter } from "next/navigation";
import { formatMonth } from "@/src/utils/date";
import { getDashboardSummary } from "@/src/lib/api/dashboard/summary";
import { getDashboardDaily } from "@/src/lib/api/dashboard/daily";
import { getCategories } from "@/src/lib/api/categoryApi";
import { getDashboardExpenseCategory } from "@/src/lib/api/dashboard/pie";
import { AuthError } from "@/src/lib/api/authError";
import { getRecentTransactions } from "@/src/lib/api/dashboard/recent";

export default function DashboardPage() {
  const router = useRouter();

  // 날짜
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // 선택한 날짜 0000-00 형태 변경 포맷 유틸
  const selectedMonth = useMemo(
    () => formatMonth(currentMonth),
    [currentMonth],
  );

  const [viewType, setViewType] = useState<"chart" | "table">("chart");

  /* 카테고리 조회 api */
  const { data: rawCategories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: () => getCategories(),
  });

  /* Summary 요약 내용 */
  const {
    data: summary,
    isLoading: isSummaryLoading,
    isError: isSummaryError,
    error: summaryError,
  } = useQuery({
    queryKey: ["dashboardSummary", selectedMonth],
    queryFn: () => getDashboardSummary(selectedMonth),
    retry: false,
  });

  /* 자산 변화 차트 */
  const {
    data: dailyData = [],
    isLoading: isDailyLoading,
    isError: isDailyError,
    error: dailyError,
  } = useQuery({
    queryKey: ["dashboardDaily", selectedMonth],
    queryFn: () => getDashboardDaily(selectedMonth),
    retry: false,
  });

  /* 카테고리 파이 차트 */
  const {
    data: expenseCategoryData = [],
    isLoading: isExpenseCategoryLoading,
    isError: isExpenseCategoryError,
    error: expenseCategoryError,
  } = useQuery({
    queryKey: ["dashboardExpenseCategory", selectedMonth],
    queryFn: () => getDashboardExpenseCategory(selectedMonth),
    retry: false,
  });

  /* 카테고리 colorCode 매핑 */
  const categoryColorByName = useMemo(() => {
    return Object.fromEntries(rawCategories.map((c) => [c.name, c.colorCode]));
  }, [rawCategories]);

  /* 파이 데이터 매핑 */
  const pieData = expenseCategoryData.map((item) => ({
    name: item.category,
    value: item.amount,
    percentage: item.percentage,
    color: categoryColorByName[item.category] ?? "#9ca3af",
  }));

  /* 최근 거래 내역 */
  const { data: recentTransactions = [] } = useQuery({
    queryKey: ["recentTransactions"],
    queryFn: () => getRecentTransactions(10),
  });

  /* 다음 달 이동 버튼 */
  const handlePreviousMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1),
    );
  };

  /* 이번 달 이동 버튼 */
  const handleNextMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1),
    );
  };

  const pageIsLoading =
    isSummaryLoading || isDailyLoading || isExpenseCategoryLoading;

  const pageIsError = isSummaryError || isDailyError || isExpenseCategoryError;

  const pageError = summaryError || dailyError || expenseCategoryError;

  /* 로그인 안되어 있으면 로그인 페이지로 이동 */
  useEffect(() => {
    if (pageError instanceof AuthError) {
      router.replace("/login");
    }
  }, [pageError, router]);

  /* 로딩 */
  if (pageIsLoading) {
    return <DashboardSkeleton />;
  }

  /* 에러 */
  if (pageIsError || !summary) {
    return (
      <div className="py-12 text-center text-red-500">
        {((summaryError || dailyError || expenseCategoryError) as Error)
          ?.message ?? "오류가 발생했습니다."}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 0. 월 선택 버튼 */}
      <MonthSelector
        currentMonth={currentMonth}
        onPrev={handlePreviousMonth}
        onNext={handleNextMonth}
      />

      {/* 1. 공통 요약 카드 (반응형 그리드) */}
      <SummaryCards summary={summary} />

      {/* 2. Chart */}
      <div className="flex flex-col xl:flex-row gap-6">
        {/* Left - 이번 달 자산 변화 */}
        <BalanceChart
          data={dailyData.map((d) => ({
            date: d.date.substring(5),
            income: d.income,
            expense: d.expense,
            balance: d.balance,
          }))}
        />

        {/* Right - 카테고리별 지출 */}
        <CategoryChart
          data={pieData}
          viewType={viewType}
          onChangeView={setViewType}
        />
      </div>

      {/* 3. 예산 및 소비 분석 */}
      <div className="mb-8">
        {/* 예산 Budget Bar */}
        <BudgetBar />
      </div>

      {/* 최근 거래 내역 테이블 */}
      <RecentTransactions
        data={recentTransactions}
        categories={rawCategories}
      />
    </div>
  );
}
