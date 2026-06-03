"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import MonthSelector from "./section/MonthSelector";
import MonthlyCalendar from "./section/MonthlyCalendar";
import CategoryChart from "./section/CategoryChart";
import AccountChart from "./section/AccountChart";
import BudgetBar from "./section/BudgetBar";
import RecentTransactions from "./section/RecentTransactions";
import BalanceCard from "./section/BalanceCard";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DashboardSkeleton from "../../skeleton/DashboardSkeleton";
import { useRouter } from "next/navigation";
import { formatMonth } from "@/src/utils/date";
import { getDashboardSummary } from "@/src/lib/api/dashboard/summary";
import { getDashboardDaily } from "@/src/lib/api/dashboard/daily";
import { getCategories } from "@/src/lib/api/categoryApi";
import { getDashboardExpenseCategory } from "@/src/lib/api/dashboard/pie";
import { getDashboardExpenseAccount } from "@/src/lib/api/dashboard/account";
import { getAccounts } from "@/src/lib/api/accountApi";
import { AuthError } from "@/src/lib/api/authError";
import { getDashboardBalances } from "@/src/lib/api/dashboard/balance";
import { getRecentTransactions } from "@/src/lib/api/dashboard/recent";
import { useUserSettings } from "@/src/hook/useUserSettings";

export default function DashboardPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { userSetting } = useUserSettings();

  // 날짜
  const [currentMonth, setCurrentMonth] = useState(new Date());


  // 선택한 날짜 0000-00 형태 변경 포맷 유틸
  const selectedMonth = useMemo(
    () => formatMonth(currentMonth),
    [currentMonth],
  );

  const [viewType, setViewType] = useState<"chart" | "table">("chart");
  const [accountViewType, setAccountViewType] = useState<"chart" | "table">("chart");

  /* 카테고리 조회 api */
  const { data: rawCategories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: () => getCategories(),
  });

  /* 결제수단 조회 api */
  const { data: rawAccounts = [] } = useQuery({
    queryKey: ["accounts"],
    queryFn: () => getAccounts(),
  });

  /* 결제수단별 잔액 조회 */
  const {
    data: balanceData,
    isLoading: isBalanceLoading,
  } = useQuery({
    queryKey: ["dashboardBalances"],
    queryFn: () => getDashboardBalances(),
    retry: false,
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

  /* 결제수단별 파이 차트 */
  const {
    data: expenseAccountData = [],
    isLoading: isExpenseAccountLoading,
    isError: isExpenseAccountError,
    error: expenseAccountError,
  } = useQuery({
    queryKey: ["dashboardExpenseAccount", selectedMonth],
    queryFn: () => getDashboardExpenseAccount(selectedMonth),
    retry: false,
  });

  /* 카테고리 colorCode 매핑 */
  const categoryColorByName = useMemo(() => {
    return Object.fromEntries(rawCategories.map((c) => [c.name, c.colorCode]));
  }, [rawCategories]);

  /* 결제수단별 색상 매핑 */
  const accountColors: Record<string, string> = {
    "CASH": "#10b981",
    "BANK": "#3b82f6",
    "CREDIT_CARD": "#f59e0b",
    "CHECK_CARD": "#8b5cf6",
    "ETC": "#6b7280",
  };

  const accountColorByName = useMemo(() => {
    const colorMap: Record<string, string> = {};
    rawAccounts.forEach((acc) => {
      colorMap[acc.name] = accountColors[acc.type] ?? "#9ca3af";
    });
    return colorMap;
  }, [rawAccounts]);

  /* 파이 데이터 매핑 */
  const pieData = expenseCategoryData.map((item) => ({
    name: item.category,
    value: item.amount,
    percentage: item.percentage,
    color: categoryColorByName[item.category] ?? "#9ca3af",
  }));

  /* 결제수단별 파이 데이터 매핑 */
  const accountPieData = expenseAccountData.map((item) => ({
    name: item.account,
    value: item.amount,
    percentage: item.percentage,
    color: accountColorByName[item.account] ?? "#9ca3af",
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
    isSummaryLoading || isDailyLoading || isExpenseCategoryLoading || isExpenseAccountLoading || isBalanceLoading;

  const pageIsError = isSummaryError || isDailyError || isExpenseCategoryError || isExpenseAccountError;

  const pageError = summaryError || dailyError || expenseCategoryError || expenseAccountError;

  /* 로그인 안되어 있으면 로그인 페이지로 이동 */
  useEffect(() => {
    if (pageError instanceof AuthError) {
      router.replace("/login");
    }
  }, [pageError, router]);

  useEffect(() => {
    if (expenseAccountError instanceof AuthError) {
      router.replace("/login");
    }
  }, [expenseAccountError, router]);

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
      {/* 1. 월 선택 버튼 */}
      <MonthSelector
        currentMonth={currentMonth}
        onPrev={handlePreviousMonth}
        onNext={handleNextMonth}
      />

      {/* 2. 결제수단별 잔액 카드 */}
      {userSetting?.ledgerMode === "ASSET_MANAGEMENT" && balanceData && (
        <BalanceCard
          totalBalance={balanceData.totalBalance}
          paymentMethods={balanceData.paymentMethods}
        />
      )}

      {/* 3. 달력 + 예산 현황 */}
      <div className="flex flex-col xl:flex-row xl:items-stretch gap-6">
        {/* Left - 이번 달 거래 현황 달력 */}
        <MonthlyCalendar 
          data={dailyData} 
          currentMonth={currentMonth}
          summary={summary ? {
            balance: summary.balance,
            income: summary.income,
            expense: summary.expense,
          } : undefined}
        />

        {/* Right - 월 예산 및 사용 현황 */}
        <div className="xl:flex-1 xl:relative">
          <div className="h-full w-full xl:absolute xl:inset-0">
            <BudgetBar month={selectedMonth} />
          </div>
        </div>
      </div>

      {/* 4. 카테고리별 지출 + 결제수단별 지출 */}
      <div className="flex flex-col xl:flex-row gap-6">
        {/* Left - 카테고리별 지출 */}
        <CategoryChart
          data={pieData}
          viewType={viewType}
          onChangeView={setViewType}
        />

        {/* Right - 결제수단별 지출 */}
        <AccountChart
          data={accountPieData}
          viewType={accountViewType}
          onChangeView={setAccountViewType}
        />
      </div>

      {/* 최근 거래 내역 테이블 */}
      <RecentTransactions data={recentTransactions} />
    </div>
  );
}
