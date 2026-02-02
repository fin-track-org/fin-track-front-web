/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import MonthSelector from "./section/MonthSelector";
import SummaryCards from "./section/SummaryCards";
import BalanceChart from "./section/BalanceChart";
import CategoryChart from "./section/CategoryChart";
import { createClient } from "@/src/lib/supabase/client";
import BudgetBar from "./section/BudgetBar";
import Analysis from "./section/Analysis";
import RecentTransactions from "./section/RecentTransactions";

const SPRING_BOOT_URL = process.env.NEXT_PUBLIC_SPRING_BOOT_URL!;

const CATEGORY_COLORS: Record<string, string> = {
  식비: "#3b82f6",
  교통: "#8b5cf6",
  문화생활: "#ec4899",
  생필품: "#10b981",
  급여: "#f97316",
  기타: "#f59e0b",
};

export default function DashboardPage() {
  const supabase = createClient();

  // 날짜
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const [summary, setSummary] = useState<Summary>({
    income: 0,
    expense: 0,
    balance: 0,
  });
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>(
    [],
  );

  /* Chart useState */
  const [pieData, setPieData] = useState<CategoryData[]>([]);
  const [barData, setBarData] = useState<GraphData[]>([]);

  const [viewType, setViewType] = useState<"chart" | "table">("chart");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isSameMonth = (dateStr: string, target: Date) => {
    const d = new Date(dateStr);
    return (
      d.getFullYear() === target.getFullYear() &&
      d.getMonth() === target.getMonth()
    );
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("로그인이 필요합니다.");
      const token = session.access_token;

      const response = await fetch(`${SPRING_BOOT_URL}/api/v1/transactions`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("데이터를 불러오는데 실패했습니다.");

      const responseData = await response.json();

      if (responseData.statusCode === 0 && responseData.data) {
        const allTransactions: Transaction[] = responseData.data;

        // 선택된 월 기준으로 필터
        const monthTransactions = allTransactions.filter((t) =>
          isSameMonth(t.date, currentMonth),
        );

        // 1. 요약 정보 계산
        const newSummary = monthTransactions.reduce(
          (acc, t) => {
            if (t.amount > 0) acc.income += t.amount;
            else acc.expense += Math.abs(t.amount);
            return acc;
          },
          { income: 0, expense: 0, balance: 0 },
        );

        newSummary.balance = newSummary.income - newSummary.expense;
        setSummary(newSummary);

        // 2. 최근 내역 (PC용)
        setRecentTransactions(
          [...monthTransactions]
            .sort((a, b) => b.date.localeCompare(a.date))
            .slice(0, 5),
        );

        // 3. 카테고리별 지출 데이터
        const categoryMap: Record<string, number> = {};

        monthTransactions.forEach((t) => {
          if (t.amount < 0) {
            categoryMap[t.category] =
              (categoryMap[t.category] || 0) + Math.abs(t.amount);
          }
        });

        const newPieData = Object.keys(categoryMap).map((key) => ({
          name: key,
          value: categoryMap[key],
          color: CATEGORY_COLORS[key] ?? "#9ca3af", // fallback gray
          percentage: Math.round(
            (categoryMap[key] /
              Object.values(categoryMap).reduce((a, b) => a + b, 0)) *
              100,
          ),
        }));

        setPieData(newPieData);

        // 4. 이번달 수입, 지출 그래프 데이터 (같은 날짜 합산)
        // 1. 날짜별 그룹핑
        const dailyMap: Record<string, { income: number; expense: number }> =
          {};

        monthTransactions.forEach((t) => {
          if (!dailyMap[t.date]) {
            dailyMap[t.date] = { income: 0, expense: 0 };
          }

          if (t.amount > 0) {
            dailyMap[t.date].income += t.amount;
          } else {
            dailyMap[t.date].expense += Math.abs(t.amount);
          }
        });

        // 2. 날짜 오름차순 정렬
        const sortedDates = Object.keys(dailyMap).sort(); // YYYY-MM-DD는 문자열 정렬 OK

        // 3. balance 누적 계산
        let runningBalance = 0;

        const newBarData = sortedDates.map((date) => {
          const { income, expense } = dailyMap[date];
          runningBalance += income - expense;

          return {
            date: date.substring(5), // MM-DD
            income,
            expense,
            balance: runningBalance,
          };
        });

        setBarData(newBarData);
      } else {
        throw new Error(
          responseData.message || "데이터 형식이 올바르지 않습니다.",
        );
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [currentMonth]);

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

  console.log(barData);

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
      <div className="flex flex-col md:flex-row gap-6">
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
      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        {/* 예산 Budget Bar */}
        <BudgetBar />

        {/* 소비 분석 Analysis */}
        {/* <Analysis /> */}
      </div>

      {/* 최근 거래 내역 테이블 */}
      <RecentTransactions data={recentTransactions} />
    </div>
  );
}
