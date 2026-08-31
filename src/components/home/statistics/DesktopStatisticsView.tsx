"use client";

import { ChevronLeft, ChevronRight, ArrowUpRight, ArrowDownRight, PiggyBank, BarChart2, PieChartIcon as PieIcon } from "lucide-react";
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

import type { UseStatisticsDataResult } from "@/src/hook/useStatisticsData";
import type { WeeklyBucket } from "@/src/lib/statistics/weeklyBuckets";
import type { BudgetSummary } from "@/src/lib/statistics/budgetCalc";
import type { InsightResult } from "@/src/lib/statistics/insightSummary";
import type { AverageLivingExpense, ExpenseExtremes } from "@/src/lib/statistics/annualCalc";
import { formatSignedWon, formatWon, monthLabel, monthNumberOf } from "@/src/lib/statistics/format";
import { SectionError, SectionSkeleton } from "./SectionState";

/**
 * `/home/statistics` 데스크톱 화면(IMPLEMENTATION_BRIEF_019 §13 "데스크톱은 기존 넓은 레이아웃을
 * 활용할 수 있지만 동일한 용어·계산·기간 상태를 사용한다"). 섹션 순서·금액 의미·집계 로직은
 * `MobileStatisticsView`와 완전히 같고(둘 다 `useStatisticsData`), 넓은 화면에 맞춰 grid로
 * 배치하고 recharts로 보조 시각화를 더한다.
 */
export default function DesktopStatisticsView(props: UseStatisticsDataResult) {
  const {
    view,
    setView,
    currentMonth,
    handlePrevMonth,
    handleNextMonth,
    canGoNextMonth,
    currentYear,
    handlePrevYear,
    handleNextYear,
    canGoNextYear,
    canGoPrevYear,
  } = props;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h1 className="hidden text-2xl font-bold text-gray-900 lg:block">통계</h1>
          <div role="tablist" aria-label="월간 또는 연간 통계" className="flex gap-1 rounded-xl bg-gray-100 p-1">
            {(
              [
                ["month", "월간"],
                ["year", "연간"],
              ] as const
            ).map(([value, text]) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={view === value}
                onClick={() => setView(value)}
                className={`min-h-[36px] rounded-lg px-4 text-sm font-bold transition-colors ${
                  view === value ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
                }`}
              >
                {text}
              </button>
            ))}
          </div>
        </div>

        {view === "month" ? (
          <div className="flex items-center gap-2">
            <button onClick={handlePrevMonth} aria-label="이전 달" className="grid h-9 w-9 place-items-center rounded-lg hover:bg-gray-100">
              <ChevronLeft className="h-5 w-5 text-gray-500" />
            </button>
            <span className="min-w-[140px] text-center text-xl font-bold text-gray-900">{monthLabel(currentMonth)}</span>
            <button
              onClick={handleNextMonth}
              disabled={!canGoNextMonth}
              aria-disabled={!canGoNextMonth}
              aria-label="다음 달"
              className="grid h-9 w-9 place-items-center rounded-lg hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ChevronRight className="h-5 w-5 text-gray-500" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevYear}
              disabled={!canGoPrevYear}
              aria-disabled={!canGoPrevYear}
              aria-label="이전 연도"
              className="grid h-9 w-9 place-items-center rounded-lg hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ChevronLeft className="h-5 w-5 text-gray-500" />
            </button>
            <span className="min-w-[100px] text-center text-xl font-bold text-gray-900">{currentYear}년</span>
            <button
              onClick={handleNextYear}
              disabled={!canGoNextYear}
              aria-disabled={!canGoNextYear}
              aria-label="다음 연도"
              className="grid h-9 w-9 place-items-center rounded-lg hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ChevronRight className="h-5 w-5 text-gray-500" />
            </button>
          </div>
        )}
      </div>

      {view === "month" ? <DesktopMonthly {...props} /> : <DesktopYearly {...props} />}
    </div>
  );
}

/* ── 한줄 요약 배너 ── */
function InsightBanner({ label, insight }: { label: string; insight: InsightResult }) {
  return (
    <section aria-live="polite" className="rounded-2xl border-2 border-gray-900 bg-amber-300/70 p-6 shadow-[6px_6px_0_rgba(17,24,39,1)]">
      <span className="text-xs font-black text-gray-800">{label}</span>
      <h2 className="mt-1.5 max-w-2xl text-2xl font-extrabold leading-snug text-gray-900 break-keep">{insight.title}</h2>
      {insight.copy && <p className="mt-2 text-sm text-gray-700 break-keep">{insight.copy}</p>}
    </section>
  );
}

/* ── 돈의 흐름 카드 3열 ── */
function FlowCards({
  income,
  expense,
  livingBalance,
  savingsIncome,
  savingsExpense,
  totalChange,
  totalChangeLabel,
}: {
  income: number;
  expense: number;
  livingBalance: number;
  savingsIncome: number;
  savingsExpense: number;
  totalChange: number;
  totalChangeLabel: string;
}) {
  const cards = [
    { label: "생활 수입", value: income, icon: ArrowUpRight, bg: "bg-emerald-50", border: "border-emerald-100", color: "text-emerald-700" },
    { label: "생활 지출", value: expense, icon: ArrowDownRight, bg: "bg-rose-50", border: "border-rose-100", color: "text-rose-700" },
    {
      label: "생활 수지",
      value: livingBalance,
      icon: PiggyBank,
      bg: livingBalance >= 0 ? "bg-sky-50" : "bg-orange-50",
      border: livingBalance >= 0 ? "border-sky-100" : "border-orange-100",
      color: livingBalance >= 0 ? "text-sky-700" : "text-orange-700",
    },
  ];
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {cards.map(({ label, value, icon: Icon, bg, border, color }) => (
          <div key={label} className={`${bg} ${border} rounded-xl border p-5 shadow-sm`}>
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">{label}</span>
              <Icon className={`h-5 w-5 ${color}`} />
            </div>
            <div className={`text-xl font-bold sm:text-2xl ${color}`}>{formatSignedWon(value).replace(/^\+/, "")}</div>
          </div>
        ))}
      </div>

      {(savingsExpense > 0 || savingsIncome > 0) && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {savingsExpense > 0 && (
            <div className="flex items-center justify-between rounded-xl border border-dashed border-indigo-200 bg-indigo-50 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-gray-800">저축·투자로 옮긴 돈</p>
                <p className="text-xs text-gray-500">일반 계좌 → 저축·투자 계좌</p>
              </div>
              <b className="text-base font-bold text-indigo-700">{formatWon(savingsExpense)}</b>
            </div>
          )}
          {savingsIncome > 0 && (
            <div className="flex items-center justify-between rounded-xl border border-dashed border-indigo-200 bg-indigo-50 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-gray-800">저축·투자에서 가져온 돈</p>
                <p className="text-xs text-gray-500">저축·투자 계좌 → 일반 계좌</p>
              </div>
              <b className="text-base font-bold text-indigo-700">{formatWon(savingsIncome)}</b>
            </div>
          )}
        </div>
      )}

      <div className="flex justify-end gap-1.5 px-1 text-xs text-gray-500">
        <span>{totalChangeLabel}</span>
        <b className="font-bold text-gray-800">{formatSignedWon(totalChange)}</b>
      </div>
    </div>
  );
}

/* ── 주간 흐름(recharts) ── */
function WeeklyChart({ buckets }: { buckets: WeeklyBucket[] }) {
  const chartData = buckets.map((b) => ({ name: b.label, 수입: b.income, 지출: b.expense }));
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <BarChart2 className="h-5 w-5 text-indigo-500" />
        <h3 className="text-lg font-semibold text-gray-900">주간 흐름</h3>
        <span className="text-xs text-gray-400">일별 기록을 주 단위로 묶었어요 · 이체·저축 제외</span>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} barGap={6} barSize={28}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis dataKey="name" stroke="#9ca3af" style={{ fontSize: "11px" }} tickLine={false} />
            <YAxis
              stroke="#9ca3af"
              style={{ fontSize: "11px" }}
              tickLine={false}
              tickFormatter={(v) => (v >= 10000 ? `${Math.round(v / 10000)}만` : String(v))}
            />
            <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: "12px" }} formatter={(v) => [`₩${Number(v).toLocaleString()}`, undefined]} />
            <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }} />
            <Bar dataKey="수입" fill="#a8d7bf" radius={[3, 3, 0, 0]} />
            <Bar dataKey="지출" fill="#ef6a4d" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ── 카테고리 순위(도넛 + 목록, 월/연 공용) ── */
function CategoryPanel({
  items,
  colors,
  title,
  sub,
}: {
  items: { category: string; amount: number; percentage: number }[];
  colors: Record<string, string>;
  title: string;
  sub: string;
}) {
  const pieData = items.map((item) => ({ name: item.category, value: item.amount, percentage: item.percentage, color: colors[item.category] ?? "#9ca3af" }));
  const total = items.reduce((s, d) => s + d.amount, 0);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <PieIcon className="h-5 w-5 text-violet-500" />
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <span className="text-xs text-gray-400">{sub}</span>
      </div>
      {items.length === 0 ? (
        <div className="flex h-56 flex-col items-center justify-center text-gray-400">
          <PieIcon className="mb-3 h-10 w-10 opacity-30" />
          <p className="text-sm">지출 데이터가 없어요</p>
        </div>
      ) : (
        <div className="flex flex-col items-start gap-6 lg:flex-row">
          <div className="mx-auto h-[220px] w-full max-w-[220px] shrink-0 lg:mx-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius="58%" outerRadius="85%" paddingAngle={2} dataKey="value">
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => [`₩${Number(v).toLocaleString()}`, undefined]} contentStyle={{ borderRadius: "8px", fontSize: "12px" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="w-full flex-1 space-y-3">
            {pieData.map((item, index) => (
              <div key={item.name}>
                <div className="mb-1 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-sm font-medium text-gray-700">{item.name}</span>
                    {index === 0 && <span className="rounded-full bg-rose-50 px-1.5 py-0.5 text-[10px] font-medium text-rose-600">최대</span>}
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-semibold text-gray-900">{formatWon(item.value)}</span>
                    <span className="ml-1.5 text-xs text-gray-400">{item.percentage}%</span>
                  </div>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${item.percentage}%`, backgroundColor: item.color }} />
                </div>
              </div>
            ))}
            <div className="flex justify-between border-t border-gray-100 pt-2 text-sm">
              <span className="text-gray-500">총 지출</span>
              <span className="font-bold text-gray-900">{formatWon(total)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── 예산 속도/결과 ── */
function BudgetPanel({ isCurrentMonthPeriod, summary }: { isCurrentMonthPeriod: boolean; summary: BudgetSummary }) {
  const { targetTotal, spentTotal, percentage, overAmount } = summary;
  const pct = percentage ?? 0;
  const isOver = isCurrentMonthPeriod ? pct > 100 : overAmount > 0;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="mb-1 text-lg font-semibold text-gray-900">{isCurrentMonthPeriod ? "예산 속도" : "예산 결과"}</h3>
      <p className="mb-4 text-xs text-gray-400">{isCurrentMonthPeriod ? "사용률과 현재 상태" : "속도가 아닌 최종 결과"}</p>
      <p className="text-sm font-bold text-gray-800 break-keep">
        {isCurrentMonthPeriod
          ? isOver
            ? `예산을 ${formatWon(overAmount)} 넘었어요.`
            : "이 속도면 예산 안에서 마칠 수 있어요."
          : isOver
            ? `예산을 ${formatWon(overAmount)} 초과했어요.`
            : `예산이 ${formatWon(Math.abs(overAmount))} 남았어요.`}
      </p>
      <p className="mt-1.5 text-xs text-gray-500">
        {isCurrentMonthPeriod ? "이번 달" : "이 달"} 예산 {formatWon(targetTotal)} 중 {formatWon(spentTotal)}을 썼어요.
      </p>
    </div>
  );
}

/* ── 전월 대비 ── */
function ComparisonPanel({ summary }: { summary: DashboardSummary }) {
  const rows: { label: string; rate: number | null; inverse?: boolean }[] = [
    { label: "생활 지출", rate: summary.expenseChangeRate ?? null, inverse: true },
    { label: "생활 수입", rate: summary.incomeChangeRate ?? null },
  ];
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold text-gray-900">전월 대비</h3>
      <div className="space-y-3">
        {rows.map(({ label, rate, inverse }) => {
          if (rate == null) {
            return (
              <div key={label} className="flex items-center justify-between text-sm">
                <span className="font-medium text-gray-700">{label}</span>
                <span className="text-gray-400">비교할 전월 기록이 없어요</span>
              </div>
            );
          }
          const positive = inverse ? rate <= 0 : rate >= 0;
          return (
            <div key={label} className="flex items-center justify-between text-sm">
              <span className="font-medium text-gray-700">{label}</span>
              <span className={`font-bold ${positive ? "text-emerald-600" : "text-rose-600"}`}>
                {rate > 0 ? "+" : ""}
                {rate}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ══════════════════════════════════
   월간(데스크톱)
══════════════════════════════════ */
function DesktopMonthly(props: UseStatisticsDataResult) {
  const {
    isCurrentMonthPeriod,
    summaryQuery,
    dailyQuery,
    categoryQuery,
    budgetQuery,
    summary,
    categoryData,
    monthHasAnyTransactions,
    monthlyFlow,
    weeklyBuckets,
    monthlyInsight,
    budgetSummary,
    hasBudget,
    categoryColors,
  } = props;

  if (dailyQuery.isSuccess && !monthHasAnyTransactions) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-14 text-center shadow-sm">
        <div className="text-4xl">📊</div>
        <h3 className="mt-3 text-lg font-bold text-gray-900">아직 이번 달 기록이 없어요.</h3>
        <p className="mt-1.5 text-sm text-gray-500">첫 기록이 쌓이면 생활 수지와 소비 흐름을 여기에서 한눈에 정리해드릴게요.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {summaryQuery.isLoading ? (
        <SectionSkeleton className="h-28" />
      ) : summaryQuery.isError || !summary || !monthlyInsight ? (
        <SectionError message="한줄 요약을 불러오지 못했어요." onRetry={() => summaryQuery.refetch()} />
      ) : (
        <InsightBanner label={isCurrentMonthPeriod ? "이번 달 한줄 요약" : "이 달 한줄 결산"} insight={monthlyInsight} />
      )}

      {summaryQuery.isLoading ? (
        <SectionSkeleton className="h-40" />
      ) : summaryQuery.isError || !summary || !monthlyFlow ? (
        <SectionError message="돈의 흐름을 불러오지 못했어요." onRetry={() => summaryQuery.refetch()} />
      ) : (
        <FlowCards
          income={summary.income}
          expense={summary.expense}
          livingBalance={monthlyFlow.livingBalance}
          savingsIncome={summary.savingsIncome}
          savingsExpense={summary.savingsExpense}
          totalChange={monthlyFlow.totalChange}
          totalChangeLabel={isCurrentMonthPeriod ? "이번 달 전체 변화" : "그 달 전체 변화"}
        />
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {isCurrentMonthPeriod ? (
          dailyQuery.isLoading ? (
            <SectionSkeleton className="h-72" />
          ) : dailyQuery.isError ? (
            <SectionError message="주간 흐름을 불러오지 못했어요." onRetry={() => dailyQuery.refetch()} />
          ) : (
            <WeeklyChart buckets={weeklyBuckets} />
          )
        ) : budgetQuery.isLoading ? (
          <SectionSkeleton className="h-72" />
        ) : budgetQuery.isError ? (
          <SectionError message="예산 정보를 불러오지 못했어요." onRetry={() => budgetQuery.refetch()} />
        ) : hasBudget ? (
          <BudgetPanel isCurrentMonthPeriod={isCurrentMonthPeriod} summary={budgetSummary} />
        ) : (
          <div className="hidden lg:block" />
        )}

        {isCurrentMonthPeriod ? (
          budgetQuery.isLoading ? (
            <SectionSkeleton className="h-72" />
          ) : budgetQuery.isError ? (
            <SectionError message="예산 정보를 불러오지 못했어요." onRetry={() => budgetQuery.refetch()} />
          ) : hasBudget ? (
            <BudgetPanel isCurrentMonthPeriod={isCurrentMonthPeriod} summary={budgetSummary} />
          ) : (
            <div className="hidden lg:block" />
          )
        ) : summaryQuery.isLoading ? (
          <SectionSkeleton className="h-72" />
        ) : summaryQuery.isError || !summary ? (
          <SectionError message="전월 대비 정보를 불러오지 못했어요." onRetry={() => summaryQuery.refetch()} />
        ) : (
          <ComparisonPanel summary={summary} />
        )}
      </div>

      {categoryQuery.isLoading ? (
        <SectionSkeleton className="h-72" />
      ) : categoryQuery.isError ? (
        <SectionError message="카테고리 분석을 불러오지 못했어요." onRetry={() => categoryQuery.refetch()} />
      ) : (
        <CategoryPanel items={categoryData} colors={categoryColors} title="어디에 많이 썼을까요?" sub={isCurrentMonthPeriod ? "이번 달 · 생활 지출 기준" : "이 달 · 생활 지출 기준"} />
      )}
    </div>
  );
}

/* ── 연간 막대(recharts) ── */
function AnnualBarChart({ months, throughMonth, isCurrentYear }: { months: DashboardAnnualMonth[]; throughMonth: number; isCurrentYear: boolean }) {
  const chartData = months.map((m, i) => {
    const monthNumber = i + 1;
    const isFuture = isCurrentYear && monthNumber > throughMonth;
    return { name: `${monthNumber}월`, 생활수지: isFuture ? null : m.livingBalance };
  });
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <BarChart2 className="h-5 w-5 text-indigo-500" />
        <h3 className="text-lg font-semibold text-gray-900">월별 생활 수지</h3>
        <span className="text-xs text-gray-400">수입 − 생활 지출 · 아직 오지 않은 달은 표시하지 않음</span>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis dataKey="name" stroke="#9ca3af" style={{ fontSize: "11px" }} tickLine={false} />
            <YAxis stroke="#9ca3af" style={{ fontSize: "11px" }} tickLine={false} tickFormatter={(v) => (Math.abs(v) >= 10000 ? `${Math.round(v / 10000)}만` : String(v))} />
            <Tooltip formatter={(v) => (v == null ? ["-", undefined] : [`₩${Number(v).toLocaleString()}`, "생활 수지"])} contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: "12px" }} />
            <Bar dataKey="생활수지" radius={[3, 3, 3, 3]}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.생활수지 == null ? "transparent" : entry.생활수지 >= 0 ? "#a8d7bf" : "#ef6a4d"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function AnnualKpiRow({ average, extremes, savingsNet, isCurrentYear }: { average: AverageLivingExpense; extremes: ExpenseExtremes; savingsNet: number; isCurrentYear: boolean }) {
  const cells: { label: string; value: string; sub?: string }[] = [
    {
      label: "월평균 생활비",
      value: average.consideredMonths > 0 ? formatWon(average.average) : "기록 부족",
      sub: average.consideredMonths > 0 ? `${average.consideredMonths}개월 기준${isCurrentYear ? " · 진행 중인 달 제외" : ""}` : undefined,
    },
    { label: "저축·투자 순이동", value: formatSignedWon(savingsNet), sub: savingsNet >= 0 ? "순저축" : "순회수" },
  ];
  if (extremes.max) cells.push({ label: "가장 많이 쓴 달", value: `${monthNumberOf(extremes.max.month)}월 · ${formatWon(extremes.max.expense)}` });
  if (extremes.min) cells.push({ label: "가장 적게 쓴 달", value: `${monthNumberOf(extremes.min.month)}월 · ${formatWon(extremes.min.expense)}` });

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cells.map((c) => (
        <div key={c.label} className="rounded-xl bg-gray-50 p-4">
          <span className="block text-xs text-gray-500">{c.label}</span>
          <b className="mt-1 block text-base font-bold text-gray-900">{c.value}</b>
          {c.sub && <span className="mt-0.5 block text-xs text-gray-400">{c.sub}</span>}
        </div>
      ))}
    </div>
  );
}

/* ══════════════════════════════════
   연간(데스크톱)
══════════════════════════════════ */
function DesktopYearly(props: UseStatisticsDataResult) {
  const { annualQuery, annual, annualHighlights, annualInsight, annualHasAnyTransactions, isCurrentYear, categoryColors } = props;

  if (annualQuery.isLoading) {
    return (
      <div className="space-y-6">
        <SectionSkeleton className="h-28" />
        <SectionSkeleton className="h-72" />
      </div>
    );
  }
  if (annualQuery.isError || !annual || !annualHighlights) {
    return <SectionError message="연간 통계를 불러오지 못했어요." onRetry={() => annualQuery.refetch()} />;
  }
  if (!annualHasAnyTransactions) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-14 text-center shadow-sm">
        <div className="text-4xl">📈</div>
        <h3 className="mt-3 text-lg font-bold text-gray-900">아직 올해 기록이 없어요.</h3>
        <p className="mt-1.5 text-sm text-gray-500">기록이 쌓이면 월별 흐름과 연간 소비 구조를 여기에서 한눈에 정리해드릴게요.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {annualInsight && <InsightBanner label={`${annual.year}년 흐름`} insight={annualInsight} />}
      <AnnualBarChart months={annual.months} throughMonth={annual.throughMonth} isCurrentYear={isCurrentYear} />
      <AnnualKpiRow average={annualHighlights.average} extremes={annualHighlights.extremes} savingsNet={annualHighlights.savingsNet} isCurrentYear={isCurrentYear} />
      <CategoryPanel items={annual.categories} colors={categoryColors} title="올해 소비 순위" sub={`1–${annual.throughMonth}월 누적`} />
    </div>
  );
}
