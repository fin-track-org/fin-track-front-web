"use client";

import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  PiggyBank,
  BarChart2,
  PieChart as PieChartIcon,
  CalendarDays,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";

import { getDashboardSummary } from "@/src/lib/api/dashboard/summary";
import { getDashboardDaily } from "@/src/lib/api/dashboard/daily";
import { getDashboardExpenseCategory } from "@/src/lib/api/dashboard/pie";
import { getCategories } from "@/src/lib/api/categoryApi";
import { AuthError } from "@/src/lib/api/authError";
import { formatMonth } from "@/src/utils/date";

/* ── helpers ── */
const fmt = (n: number) => n.toLocaleString("ko-KR");

function ChangeRate({ rate, inverse = false }: { rate: number; inverse?: boolean }) {
  const positive = inverse ? rate < 0 : rate >= 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded-full ${
        positive ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
      }`}
    >
      {positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {rate >= 0 ? "+" : ""}
      {rate ?? 0}%
    </span>
  );
}

/* ── Month Selector ── */
function MonthNav({
  current,
  onPrev,
  onNext,
}: {
  current: Date;
  onPrev: () => void;
  onNext: () => void;
}) {
  const label = current.toLocaleDateString("ko-KR", { year: "numeric", month: "long" });
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onPrev}
        className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
        aria-label="이전 달"
      >
        <ChevronLeft className="w-5 h-5 text-gray-500" />
      </button>
      <span className="text-2xl sm:text-3xl font-bold text-gray-900 min-w-[150px] text-center">
        {label}
      </span>
      <button
        onClick={onNext}
        className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
        aria-label="다음 달"
      >
        <ChevronRight className="w-5 h-5 text-gray-500" />
      </button>
    </div>
  );
}

/* ── Summary Cards ── */
function SummaryCards({ summary }: { summary: DashboardSummary }) {
  const savings = summary.income - summary.expense;
  const savingsRate = summary.income > 0 ? Math.round((savings / summary.income) * 100) : 0;

  const cards = [
    {
      label: "총 수입",
      value: summary.income,
      rate: summary.incomeChangeRate,
      icon: ArrowUpRight,
      bg: "bg-emerald-50",
      border: "border-emerald-100",
      iconColor: "text-emerald-600",
      valueColor: "text-emerald-800",
    },
    {
      label: "총 지출",
      value: summary.expense,
      rate: summary.expenseChangeRate,
      icon: ArrowDownRight,
      bg: "bg-rose-50",
      border: "border-rose-100",
      iconColor: "text-rose-600",
      valueColor: "text-rose-800",
      inverse: true,
    },
    {
      label: "순 저축",
      value: savings,
      rate: savingsRate,
      icon: PiggyBank,
      bg: savings >= 0 ? "bg-sky-50" : "bg-orange-50",
      border: savings >= 0 ? "border-sky-100" : "border-orange-100",
      iconColor: savings >= 0 ? "text-sky-600" : "text-orange-600",
      valueColor: savings >= 0 ? "text-sky-800" : "text-orange-700",
      rateLabel: "저축률",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {cards.map(({ label, value, rate, icon: Icon, bg, border, iconColor, valueColor, inverse, rateLabel }) => (
        <div key={label} className={`${bg} ${border} border rounded-xl p-5 shadow-sm`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-600">{label}</span>
            <Icon className={`w-5 h-5 ${iconColor}`} />
          </div>
          <div className={`text-xl sm:text-2xl font-bold ${valueColor} mb-2`}>
            {fmt(value)}원
          </div>
          <div className="flex items-center gap-1.5">
            <ChangeRate rate={rate} inverse={inverse} />
            <span className="text-xs text-gray-500">
              {rateLabel ?? "전월 대비"}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Daily Bar Chart ── */
function DailyChart({ data }: { data: DashboardDaily[] }) {
  const chartData = data.map((d) => ({
    date: d.date.substring(5),
    수입: d.income,
    지출: d.expense,
  }));

  const isEmpty = !data.length || data.every((d) => d.income === 0 && d.expense === 0);

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
      <div className="flex items-center gap-2 mb-6">
        <BarChart2 className="w-5 h-5 text-indigo-500" />
        <h3 className="text-lg font-semibold text-gray-900">일별 수입 · 지출</h3>
      </div>
      {isEmpty ? (
        <div className="h-64 flex flex-col items-center justify-center text-gray-400">
          <BarChart2 className="w-10 h-10 opacity-30 mb-3" />
          <p className="text-sm">거래를 추가하면 차트가 표시됩니다</p>
        </div>
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barGap={2} barSize={6}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis
                dataKey="date"
                stroke="#9ca3af"
                style={{ fontSize: "11px" }}
                tickLine={false}
                interval={2}
              />
              <YAxis
                stroke="#9ca3af"
                style={{ fontSize: "11px" }}
                tickLine={false}
                tickFormatter={(v) => (v >= 10000 ? `${Math.round(v / 10000)}만` : String(v))}
              />
              <Tooltip
                contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: "12px" }}
                formatter={(v) => [`₩${Number(v).toLocaleString()}`, undefined]}
              />
              <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }} />
              <Bar dataKey="수입" fill="#10b981" radius={[3, 3, 0, 0]} />
              <Bar dataKey="지출" fill="#f43f5e" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

/* ── Category Analysis ── */
function CategoryAnalysis({
  data,
  categoryColors,
}: {
  data: DashboardExpenseCategory[];
  categoryColors: Record<string, string>;
}) {
  const pieData = data.map((item) => ({
    name: item.category,
    value: item.amount,
    percentage: item.percentage,
    color: categoryColors[item.category] ?? "#9ca3af",
  }));

  const isEmpty = !data.length || data.every((d) => d.amount === 0);
  const total = data.reduce((s, d) => s + d.amount, 0);

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
      <div className="flex items-center gap-2 mb-6">
        <PieChartIcon className="w-5 h-5 text-violet-500" />
        <h3 className="text-lg font-semibold text-gray-900">카테고리별 지출 분석</h3>
      </div>

      {isEmpty ? (
        <div className="h-64 flex flex-col items-center justify-center text-gray-400">
          <PieChartIcon className="w-10 h-10 opacity-30 mb-3" />
          <p className="text-sm">지출 데이터가 없습니다</p>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* Donut */}
          <div className="shrink-0 w-full max-w-[220px] h-[220px] mx-auto lg:mx-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius="58%"
                  outerRadius="85%"
                  paddingAngle={2}
                  dataKey="value"
                >
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v) => [`₩${Number(v).toLocaleString()}`, undefined]}
                  contentStyle={{ borderRadius: "8px", fontSize: "12px" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Ranked list with progress bars */}
          <div className="flex-1 w-full space-y-3">
            {pieData
              .slice()
              .sort((a, b) => b.value - a.value)
              .map((item, index) => (
                <div key={item.name}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-sm text-gray-700 font-medium">{item.name}</span>
                      {index === 0 && (
                        <span className="text-[10px] bg-rose-50 text-rose-600 px-1.5 py-0.5 rounded-full font-medium">
                          최대
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-semibold text-gray-900">
                        {fmt(item.value)}원
                      </span>
                      <span className="text-xs text-gray-400 ml-1.5">{item.percentage}%</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${item.percentage}%`, backgroundColor: item.color }}
                    />
                  </div>
                </div>
              ))}
            <div className="pt-2 border-t border-gray-100 flex justify-between text-sm">
              <span className="text-gray-500">총 지출</span>
              <span className="font-bold text-gray-900">{fmt(total)}원</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Daily Insights ── */
function DailyInsights({ data, summary }: { data: DashboardDaily[]; summary: DashboardSummary }) {
  const activeDays = data.filter((d) => d.expense > 0).length;
  const avgDailyExpense = activeDays > 0 ? Math.round(summary.expense / activeDays) : 0;
  const peakDay = data.length > 0
    ? data.reduce((max, d) => (d.expense > max.expense ? d : max))
    : null;
  const savingsRate =
    summary.income > 0
      ? Math.round(((summary.income - summary.expense) / summary.income) * 100)
      : 0;

  const stats = [
    {
      icon: CalendarDays,
      label: "지출 활동일",
      value: `${activeDays}일`,
      sub: `${data.length}일 중`,
      color: "text-indigo-600",
      bg: "bg-indigo-50",
    },
    {
      icon: BarChart2,
      label: "일 평균 지출",
      value: `${fmt(avgDailyExpense)}원`,
      sub: "활동일 기준",
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      icon: ArrowDownRight,
      label: "최대 지출일",
      value: peakDay && peakDay.expense > 0 ? peakDay.date.substring(5) : "-",
      sub: peakDay && peakDay.expense > 0 ? `${fmt(peakDay.expense)}원` : "지출 없음",
      color: "text-rose-600",
      bg: "bg-rose-50",
    },
    {
      icon: PiggyBank,
      label: "저축률",
      value: `${savingsRate}%`,
      sub: savingsRate >= 20 ? "우수 🎉" : savingsRate >= 0 ? "보통" : "적자",
      color: savingsRate >= 0 ? "text-emerald-600" : "text-orange-600",
      bg: savingsRate >= 0 ? "bg-emerald-50" : "bg-orange-50",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map(({ icon: Icon, label, value, sub, color, bg }) => (
        <div key={label} className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
          <div className={`w-9 h-9 ${bg} rounded-lg flex items-center justify-center mb-3`}>
            <Icon className={`w-5 h-5 ${color}`} />
          </div>
          <div className="text-base sm:text-lg font-bold text-gray-900 leading-tight">{value}</div>
          <div className="text-xs text-gray-500 mt-0.5">{label}</div>
          <div className="text-xs text-gray-400 mt-1">{sub}</div>
        </div>
      ))}
    </div>
  );
}

/* ══════════════════════════════════
   Main Page Component
══════════════════════════════════ */
export default function StatisticsPage() {
  const router = useRouter();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const selectedMonth = useMemo(() => formatMonth(currentMonth), [currentMonth]);

  const { data: rawCategories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: () => getCategories(),
  });

  const {
    data: summary,
    isLoading: isSummaryLoading,
    error: summaryError,
  } = useQuery({
    queryKey: ["dashboardSummary", selectedMonth],
    queryFn: () => getDashboardSummary(selectedMonth),
    retry: false,
  });

  const {
    data: dailyData = [],
    isLoading: isDailyLoading,
    error: dailyError,
  } = useQuery({
    queryKey: ["dashboardDaily", selectedMonth],
    queryFn: () => getDashboardDaily(selectedMonth),
    retry: false,
  });

  const {
    data: categoryData = [],
    isLoading: isCategoryLoading,
    error: categoryError,
  } = useQuery({
    queryKey: ["dashboardExpenseCategory", selectedMonth],
    queryFn: () => getDashboardExpenseCategory(selectedMonth),
    retry: false,
  });

  const categoryColors = useMemo(
    () => Object.fromEntries(rawCategories.map((c) => [c.name, c.colorCode])),
    [rawCategories]
  );

  const pageError = summaryError || dailyError || categoryError;
  const isLoading = isSummaryLoading || isDailyLoading || isCategoryLoading;

  useEffect(() => {
    if (pageError instanceof AuthError) router.replace("/login");
  }, [pageError, router]);

  const handlePrev = () =>
    setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1));
  const handleNext = () =>
    setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1));

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 bg-gray-200 rounded-xl w-48" />
        <div className="grid grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => <div key={i} className="h-28 bg-gray-200 rounded-xl" />)}
        </div>
        <div className="h-72 bg-gray-200 rounded-xl" />
        <div className="h-72 bg-gray-200 rounded-xl" />
      </div>
    );
  }

  if (pageError || !summary) {
    return (
      <div className="py-12 text-center text-red-500">
        {(pageError as Error)?.message ?? "오류가 발생했습니다."}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">통계</h1>
          <p className="text-sm text-gray-500 mt-0.5">월별 수입·지출 패턴을 분석합니다</p>
        </div>
        <MonthNav current={currentMonth} onPrev={handlePrev} onNext={handleNext} />
      </div>

      {/* Summary KPI Cards */}
      <SummaryCards summary={summary} />

      {/* Daily Insight Pills */}
      <DailyInsights data={dailyData} summary={summary} />

      {/* Daily Bar Chart */}
      <DailyChart data={dailyData} />

      {/* Category Breakdown */}
      <CategoryAnalysis data={categoryData} categoryColors={categoryColors} />
    </div>
  );
}
