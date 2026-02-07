/* eslint-disable react-hooks/immutability */
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

const SPRING_BOOT_URL = process.env.NEXT_PUBLIC_SPRING_BOOT_URL!;

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

  useEffect(() => {
    if (error instanceof AuthError) {
      router.replace("/login");
    }
  }, [error, router]);

  /* currentMonth 데이터 */
  const monthTransactions = allTransactions.filter((t) =>
    isSameMonth(t.date, currentMonth),
  );

  /* 요약 내용 */
  const summary = useMemo(() => {
    return monthTransactions.reduce(
      (acc, t) => {
        if (t.amount > 0) acc.income += t.amount;
        else acc.expense += Math.abs(t.amount);
        acc.balance = acc.income - acc.expense;
        return acc;
      },
      { income: 0, expense: 0, balance: 0 },
    );
  }, [monthTransactions]);

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

  /* Bar Chart */
  const barData = useMemo(() => {
    const dailyMap: Record<string, { income: number; expense: number }> = {};

    monthTransactions.forEach((t) => {
      if (!dailyMap[t.date]) {
        dailyMap[t.date] = { income: 0, expense: 0 };
      }

      if (t.amount > 0) dailyMap[t.date].income += t.amount;
      else dailyMap[t.date].expense += Math.abs(t.amount);
    });

    let runningBalance = 0;

    return Object.keys(dailyMap)
      .sort()
      .map((date) => {
        const { income, expense } = dailyMap[date];
        runningBalance += income - expense;

        return {
          date: date.substring(5),
          income,
          expense,
          balance: runningBalance,
        };
      });
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

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (isError) {
    return (
      <div className="py-12 text-center text-red-500">
        {(error as Error).message}
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
        <BalanceChart data={barData} />

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
      <RecentTransactions data={allTransactions} />
    </div>
  );
}
