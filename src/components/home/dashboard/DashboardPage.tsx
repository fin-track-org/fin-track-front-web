"use client";

import { useState, useMemo, useEffect } from "react";
import MonthSelector from "./section/MonthSelector";
import SummaryCards from "./section/SummaryCards";
import BalanceChart from "./section/BalanceChart";
import CategoryChart from "./section/CategoryChart";
import { createClient } from "@/src/lib/supabase/client";
import BudgetBar from "./section/BudgetBar";
import RecentTransactions from "./section/RecentTransactions";
import { useQuery } from "@tanstack/react-query";
import DashboardSkeleton from "../../skeleton/DashboardSkeleton";
import { useRouter } from "next/navigation";
import { formatMonth } from "@/src/utils/date";
import { getDashboardSummary } from "@/src/lib/api/dashboard/summary";
import { getDashboardDaily } from "@/src/lib/api/dashboard/daily";

const SPRING_BOOT_URL = process.env.NEXT_PUBLIC_SPRING_BOOT_URL!;

const categories: Category[] = [
  { id: "ALL", name: "전체", type: "COMMON" },

  { id: "FOOD", name: "식비", type: "EXPENSE" },
  { id: "TRANSPORT", name: "교통/차량", type: "EXPENSE" },
  { id: "HOUSING", name: "주거/공과금", type: "EXPENSE" },
  { id: "SHOPPING", name: "쇼핑/생활", type: "EXPENSE" },
  { id: "CULTURE", name: "문화/여가", type: "EXPENSE" },
  { id: "MEDICAL", name: "의료/건강", type: "EXPENSE" },
  { id: "EDUCATION", name: "교육/자기계발", type: "EXPENSE" },
  { id: "FINANCE", name: "금융", type: "EXPENSE" },

  { id: "INCOME", name: "수입", type: "INCOME" },

  { id: "WEALTH", name: "재테크", type: "COMMON" },
  { id: "ETC", name: "기타", type: "COMMON" },
];

const CATEGORY_COLORS: Record<string, string> = {
  식비: "#3b82f6",
  교통: "#8b5cf6",
  문화생활: "#ec4899",
  생필품: "#10b981",
  급여: "#f97316",
  기타: "#f59e0b",
};

class AuthError extends Error {
  constructor(message = "로그인이 필요합니다.") {
    super(message);
    this.name = "AuthError";
  }
}

export default function DashboardPage() {
  const supabase = createClient();
  const router = useRouter();

  // 날짜
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // 선택한 날짜 0000-00 형태 변경 포맷 유틸
  const selectedMonth = useMemo(
    () => formatMonth(currentMonth),
    [currentMonth],
  );

  const [viewType, setViewType] = useState<"chart" | "table">("chart");

  const isSameMonth = (dateStr: string, target: Date) => {
    const d = new Date(dateStr);
    return (
      d.getFullYear() === target.getFullYear() &&
      d.getMonth() === target.getMonth()
    );
  };

  const fetchTransactions = async (): Promise<Transaction[]> => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      throw new AuthError();
    }

    const response = await fetch(`${SPRING_BOOT_URL}/api/v1/transactions`, {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (response.status === 401) {
      throw new AuthError();
    }

    if (!response.ok) {
      throw new Error("데이터를 불러오는데 실패했습니다.");
    }

    const result = await response.json();
    return result.data ?? [];
  };

  const {
    data: allTransactions = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["transactions"],
    queryFn: fetchTransactions,
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

  useEffect(() => {
    if (error instanceof AuthError) {
      router.replace("/login");
    }
  }, [error, router]);

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

  /* currentMonth 데이터 */
  const monthTransactions = allTransactions.filter((t) =>
    isSameMonth(t.date, currentMonth),
  );

  /* 카테고리 파이 차트 */
  const pieData = useMemo(() => {
    const categoryMap: Record<string, number> = {};

    monthTransactions.forEach((t) => {
      if (t.amount < 0) {
        categoryMap[t.category] =
          (categoryMap[t.category] || 0) + Math.abs(t.amount);
      }
    });

    const total = Object.values(categoryMap).reduce((a, b) => a + b, 0);

    return Object.keys(categoryMap).map((key) => ({
      name: key,
      value: categoryMap[key],
      color: CATEGORY_COLORS[key] ?? "#9ca3af",
      percentage: total ? Math.round((categoryMap[key] / total) * 100) : 0,
    }));
  }, [monthTransactions]);

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

  /* 카테고리 id -> name */
  const categoryNameById = useMemo(() => {
    return Object.fromEntries(categories.map((c) => [c.id, c.name]));
  }, []);

  /* 로딩 */
  if (isLoading || isSummaryLoading || isDailyLoading) {
    return <DashboardSkeleton />;
  }

  /* 에러 */
  if (isError || isSummaryError || !summary || isDailyError) {
    return (
      <div className="py-12 text-center text-red-500">
        {((error || summaryError || dailyError) as Error)?.message ??
          "오류가 발생했습니다."}
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
        data={allTransactions}
        categoryNameById={categoryNameById}
      />
    </div>
  );
}
