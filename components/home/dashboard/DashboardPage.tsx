/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
// ⬇️ 상대 경로 대신 Next.js 표준 별칭(@)을 사용하여 경로 오류 방지
import { createClient } from "@/lib/supabase/client";
// 📊 차트 라이브러리 임포트
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Legend,
  CartesianGrid,
  Tooltip,
  Area,
  AreaChart,
} from "recharts";
import {
  ArrowDownRight,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";

const SPRING_BOOT_URL = process.env.NEXT_PUBLIC_SPRING_BOOT_URL!;

interface Transaction {
  id: number;
  date: string;
  category: string;
  description: string;
  amount: number;
}

interface Summary {
  income: number;
  expense: number;
  balance: number;
}

// 차트용 데이터 타입
interface ChartData {
  name: string;
  value: number;
  [key: string]: any;
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"];

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
  // 📊 차트용 상태 추가
  const [pieData, setPieData] = useState<ChartData[]>([]);
  const [barData, setBarData] = useState<any[]>([]); // 일별 추이 데이터

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

      console.log(responseData.data);

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

        // 3. 📱 모바일용: 카테고리별 지출 (Pie Chart)
        const categoryMap: Record<string, number> = {};

        monthTransactions.forEach((t) => {
          if (t.amount < 0) {
            categoryMap[t.category] =
              (categoryMap[t.category] || 0) + Math.abs(t.amount);
          }
        });

        setPieData(
          Object.keys(categoryMap).map((key) => ({
            name: key,
            value: categoryMap[key],
          })),
        );

        // 4. 🖥️ PC용: 최근 7일 자산 변화 (같은 날짜 합산)
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

  const handlePreviousMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1),
    );
  };

  const handleNextMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1),
    );
  };

  const monthName = currentMonth.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
  });

  const today = new Date().toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  /* 임의 데이터 */
  const totalIncome = 3000000;
  const totalExpense = 2240000;
  const currentBalance = 5196000;

  const previousMonth = {
    income: 2800000,
    expense: 2100000,
    netIncome: 700000,
    balance: 4436000,
  };

  const incomeChange =
    ((totalIncome - previousMonth.income) / previousMonth.income) * 100;
  const expenseChange =
    ((totalExpense - previousMonth.expense) / previousMonth.expense) * 100;
  const balanceChange =
    ((currentBalance - previousMonth.balance) / previousMonth.balance) * 100;

  return (
    <div className="space-y-6">
      {/* 0. 월 선택 버튼 */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <button
              onClick={handlePreviousMonth}
              className="cursor-pointer hover:bg-gray-200 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-8 h-8 text-gray-500" />
            </button>
            <h1 className="text-3xl font-bold text-gray-900">{monthName}</h1>
            <button
              onClick={handleNextMonth}
              className="cursor-pointer hover:bg-gray-200 rounded-lg transition-colors"
            >
              <ChevronRight className="w-8 h-8 text-gray-500" />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2 text-gray-500">
          <span>오늘은 {today} 입니다.</span>
        </div>
      </div>

      {/* 1. 공통 요약 카드 (반응형 그리드) */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 현재 잔액 (가장 중요하므로 첫 번째) */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-500">현재 잔액</span>
            <Wallet size={16} />
          </div>
          <div
            className={`text-xl md:text-2xl font-bold mb-2 ${
              summary.balance >= 0 ? "text-gray-900" : "text-red-600"
            }`}
          >
            {summary.balance.toLocaleString()}
          </div>
          <div
            className={`flex items-center gap-1 text-sm ${
              summary.balance >= 0 ? "text-sky-600" : "text-red-600"
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>
              전월 대비 {balanceChange >= 0 ? "+" : ""}
              {balanceChange.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <h2 className="text-sm font-medium text-gray-500">현재 잔액</h2>
          <p
            className={`text-3xl font-bold ${summary.balance >= 0 ? "text-gray-800" : "text-red-500"}`}
          >
            {loading ? "..." : `${summary.balance.toLocaleString()}원`}
          </p>
        </div> */}

        {/* 수입/지출 (모바일에서는 작게 보임) */}
        <div className="grid grid-cols-2 gap-4 md:col-span-2">
          {/* <div className="bg-blue-50 p-6 rounded-xl border border-blue-100">
            <h2 className="text-sm font-medium text-blue-600">이번 달 수입</h2>
            <p className="text-xl md:text-2xl font-bold text-blue-700 mt-1">
              {loading ? "..." : `+${summary.income.toLocaleString()}`}
            </p>
          </div>
          <div className="bg-red-50 p-6 rounded-xl border border-red-100">
            <h2 className="text-sm font-medium text-red-600">이번 달 지출</h2>
            <p className="text-xl md:text-2xl font-bold text-red-700 mt-1">
              {loading ? "..." : `-${summary.expense.toLocaleString()}`}
            </p>
          </div> */}

          {/* 수입 */}
          <div className="bg-green-50 shadow-sm p-6 rounded-xl border border-green-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-green-700">
                이번 달 총 수입
              </span>
              <ArrowUpRight className="w-4 h-4 text-green-600" />
            </div>
            <div className="text-xl md:text-2xl font-semibold text-green-800 mb-2">
              {summary.income.toLocaleString()}
            </div>
            <div
              className={`flex items-center gap-1 text-sm ${
                incomeChange >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {incomeChange >= 0 ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              <span>
                전월 대비 {incomeChange >= 0 ? "+" : ""}
                {incomeChange.toFixed(1)}%
              </span>
            </div>
          </div>

          {/* 지출 */}
          <div className="bg-red-50 shadow-sm p-6 rounded-xl border border-red-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-red-700">
                이번 달 총 지출
              </span>
              <ArrowDownRight className="w-4 h-4 text-red-600" />
            </div>
            <div className="text-xl md:text-2xl font-semibold text-red-800 mb-2">
              {summary.expense.toLocaleString()}
            </div>
            <div
              className={`flex items-center gap-1 text-sm ${
                expenseChange >= 0 ? "text-red-600" : "text-green-600"
              }`}
            >
              {expenseChange >= 0 ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              <span>
                전월 대비 {expenseChange >= 0 ? "+" : ""}
                {expenseChange.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. 📱 모바일 전용: 시각적 통계 (Pie Chart) */}
      {/* <section className="block md:hidden bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-bold text-gray-800 mb-4">
          지출 분석 (Top 5)
        </h3>
        <div className="h-64 w-full flex justify-center items-center">
          {loading ? (
            <p>로딩 중...</p>
          ) : pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <RechartsTooltip
                  formatter={(value: any) => `${value.toLocaleString()}원`}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-400">지출 내역이 없습니다.</p>
          )}
        </div>
      </section> */}

      {/* 3. 🖥️ PC 전용: 상세 차트 및 테이블 */}
      {/* PC 차트 (Bar Chart) */}
      {/* <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-bold text-gray-800 mb-6">최근 7건 흐름</h3>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData}>
              <XAxis dataKey="date" />
              <YAxis />
              <RechartsTooltip />
              <Legend />
              <Bar
                dataKey="income"
                name="수입"
                fill="#3b82f6"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="expense"
                name="지출"
                fill="#ef4444"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section> */}

      {/* Balance/Income/Expense Chart */}
      <section className="flex flex-col md:flex-row gap-6">
        <div className="md:flex-1 bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">
            이번 달 자산 변화
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={barData}>
              <defs>
                <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis
                dataKey="date"
                stroke="#9ca3af"
                style={{ fontSize: "12px" }}
              />
              <YAxis stroke="#9ca3af" style={{ fontSize: "12px" }} />

              <Tooltip
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                }}
                formatter={(value) => {
                  if (typeof value === "number") {
                    return `₩${value.toLocaleString()}`;
                  }
                  return value ?? "";
                }}
              />

              <Legend />

              <Area
                type="monotone"
                dataKey="balance"
                name="잔액"
                stroke="#8b5cf6"
                fillOpacity={1}
                fill="url(#colorBalance)"
              />
              <Area
                type="monotone"
                dataKey="income"
                name="수입"
                stroke="#10b981"
                fillOpacity={1}
                fill="url(#colorIncome)"
              />
              <Area
                type="monotone"
                dataKey="expense"
                name="지출"
                stroke="#ef4444"
                fillOpacity={1}
                fill="url(#colorExpense)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="md:flex-1 bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          dd
        </div>
      </section>

      {/* 최근 거래 내역 테이블 */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-800">최근 거래 내역</h3>
          <Link
            href="/home/transactions"
            className="text-sm text-sky-600 hover:underline"
          >
            더보기 &rarr;
          </Link>
        </div>
        <table className="w-full">
          <thead className="bg-gray-50 text-gray-500 text-sm">
            <tr>
              <th className="py-3 px-6 text-left">날짜</th>
              <th className="py-3 px-6 text-left">카테고리</th>
              <th className="py-3 px-6 text-left">내역</th>
              <th className="py-3 px-6 text-right">금액</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {recentTransactions.map((t) => (
              <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                <td className="py-4 px-6 text-gray-600">{t.date}</td>
                <td className="py-4 px-6">
                  <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs">
                    {t.category}
                  </span>
                </td>
                <td className="py-4 px-6 font-medium text-gray-800">
                  {t.description}
                </td>
                <td
                  className={`py-4 px-6 text-right font-bold ${t.amount > 0 ? "text-blue-600" : "text-red-500"}`}
                >
                  {t.amount.toLocaleString()}원
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* 모바일 하단 플로팅 버튼 (빠른 입력 유도) */}
      {/* <div className="md:hidden fixed bottom-6 right-6">
        <Link href="/home/transactions">
          <button className="bg-sky-600 text-white p-4 rounded-full shadow-lg hover:bg-sky-700 transition-colors flex items-center justify-center">
            <span className="text-2xl font-bold">+</span>
          </button>
        </Link>
      </div> */}
    </div>
  );
}
