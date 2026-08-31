"use client";

import { useState } from "react";
import type { UseStatisticsDataResult } from "@/src/hook/useStatisticsData";
import type { WeeklyBucket } from "@/src/lib/statistics/weeklyBuckets";
import type { BudgetSummary } from "@/src/lib/statistics/budgetCalc";
import type { InsightResult } from "@/src/lib/statistics/insightSummary";
import type { AverageLivingExpense, ExpenseExtremes } from "@/src/lib/statistics/annualCalc";
import { formatSignedWon, formatWon, monthLabel, monthNumberOf } from "@/src/lib/statistics/format";
import { SectionError, SectionHead, SectionSkeleton } from "./SectionState";

/**
 * `/home/statistics` 모바일 화면(design-package/mobile-statistics-v1.html). 데이터·계산은
 * `useStatisticsData`가 이미 끝내고, 이 컴포넌트는 화면 구조와 이번 달/과거 달/연간에 따른
 * 섹션 순서 분기만 담당한다(IMPLEMENTATION_BRIEF_019 §5).
 */
export default function MobileStatisticsView(props: UseStatisticsDataResult) {
  const {
    view,
    setView,
    currentMonth,
    isCurrentMonthPeriod,
    canGoNextMonth,
    handlePrevMonth,
    handleNextMonth,
    currentYear,
    canGoNextYear,
    canGoPrevYear,
    handlePrevYear,
    handleNextYear,
  } = props;

  return (
    <div className="space-y-4 pb-8">
      <ViewTabs view={view} onChange={setView} />

      {view === "month" ? (
        <MonthNav
          label={monthLabel(currentMonth)}
          canGoNext={canGoNextMonth}
          onPrev={handlePrevMonth}
          onNext={handleNextMonth}
        />
      ) : (
        <YearNav
          year={currentYear}
          canGoPrev={canGoPrevYear}
          canGoNext={canGoNextYear}
          onPrev={handlePrevYear}
          onNext={handleNextYear}
        />
      )}

      {view === "month" ? (
        <MonthlySection {...props} isCurrentMonthPeriod={isCurrentMonthPeriod} />
      ) : (
        <YearlySection {...props} />
      )}
    </div>
  );
}

/* ── 상단 세그먼트/기간 탐색 ── */

function ViewTabs({
  view,
  onChange,
}: {
  view: UseStatisticsDataResult["view"];
  onChange: (v: UseStatisticsDataResult["view"]) => void;
}) {
  return (
    <div role="tablist" aria-label="월간 또는 연간 통계" className="grid grid-cols-2 gap-1 rounded-2xl bg-ll-cream p-1">
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
          onClick={() => onChange(value)}
          className={`min-h-[38px] rounded-xl text-xs font-extrabold transition-colors ${
            view === value ? "bg-white text-ll-ink shadow-sm" : "text-ll-pencil"
          }`}
        >
          {text}
        </button>
      ))}
    </div>
  );
}

function MonthNav({
  label,
  canGoNext,
  onPrev,
  onNext,
}: {
  label: string;
  canGoNext: boolean;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div className="grid grid-cols-[44px_1fr_44px] items-center">
      <button
        type="button"
        onClick={onPrev}
        aria-label="이전 달"
        className="grid h-11 w-11 place-items-center rounded-lg text-xl text-ll-ink hover:bg-ll-cream/60"
      >
        ‹
      </button>
      <strong className="text-center text-sm font-bold text-ll-ink">{label}</strong>
      <button
        type="button"
        onClick={onNext}
        disabled={!canGoNext}
        aria-disabled={!canGoNext}
        aria-label="다음 달"
        className="grid h-11 w-11 place-items-center rounded-lg text-xl text-ll-ink hover:bg-ll-cream/60 disabled:cursor-not-allowed disabled:opacity-30"
      >
        ›
      </button>
    </div>
  );
}

function YearNav({
  year,
  canGoPrev,
  canGoNext,
  onPrev,
  onNext,
}: {
  year: number;
  canGoPrev: boolean;
  canGoNext: boolean;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div className="grid grid-cols-[44px_1fr_44px] items-center">
      <button
        type="button"
        onClick={onPrev}
        disabled={!canGoPrev}
        aria-disabled={!canGoPrev}
        aria-label="이전 연도"
        className="grid h-11 w-11 place-items-center rounded-lg text-xl text-ll-ink hover:bg-ll-cream/60 disabled:cursor-not-allowed disabled:opacity-30"
      >
        ‹
      </button>
      <strong className="text-center text-sm font-bold text-ll-ink">{year}년</strong>
      <button
        type="button"
        onClick={onNext}
        disabled={!canGoNext}
        aria-disabled={!canGoNext}
        aria-label="다음 연도"
        className="grid h-11 w-11 place-items-center rounded-lg text-xl text-ll-ink hover:bg-ll-cream/60 disabled:cursor-not-allowed disabled:opacity-30"
      >
        ›
      </button>
    </div>
  );
}

/* ── 한줄 요약 카드 ── */

function InsightCard({ label, insight }: { label: string; insight: InsightResult }) {
  return (
    <section
      aria-live="polite"
      className="relative overflow-hidden rounded-2xl border-2 border-ll-ink bg-ll-butter p-4 shadow-[4px_4px_0_var(--color-ll-ink)]"
    >
      <span className="block text-[10px] font-black text-ll-ink/70">{label}</span>
      <h3 className="mt-1.5 max-w-[88%] text-lg font-extrabold leading-snug text-ll-ink break-keep">
        {insight.title}
      </h3>
      {insight.copy && (
        <p className="mt-1.5 text-[11px] leading-relaxed text-ll-ink/70 break-keep">{insight.copy}</p>
      )}
    </section>
  );
}

/* ── 돈의 흐름 ── */

function FlowCard({
  title,
  sub,
  income,
  expense,
  livingBalance,
  savingsIncome,
  savingsExpense,
  totalChange,
  totalChangeLabel,
}: {
  title: string;
  sub: string;
  income: number;
  expense: number;
  livingBalance: number;
  savingsIncome: number;
  savingsExpense: number;
  totalChange: number;
  totalChangeLabel: string;
}) {
  return (
    <section>
      <SectionHead title={title} sub={sub} />
      <div className="rounded-2xl border border-ll-ink/10 bg-white/70 p-4 shadow-sm">
        <div className="grid grid-cols-[1fr_20px_1fr] items-center">
          <div>
            <span className="block text-[10px] text-ll-pencil">생활 수입</span>
            <b className="mt-1 block text-lg font-extrabold tabular-nums text-ll-ink">{formatWon(income)}</b>
          </div>
          <span aria-hidden="true" className="text-center font-black text-ll-pencil">
            −
          </span>
          <div className="text-right">
            <span className="block text-[10px] text-ll-pencil">생활 지출</span>
            <b className="mt-1 block text-lg font-extrabold tabular-nums text-ll-ink">{formatWon(expense)}</b>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between rounded-xl bg-ll-cream px-3 py-2.5">
          <span className="text-[11px] font-bold text-ll-ink">생활 수지</span>
          <b
            className={`text-sm font-extrabold tabular-nums ${
              livingBalance >= 0 ? "text-ll-ink" : "text-ll-tomato"
            }`}
          >
            {formatSignedWon(livingBalance)}
          </b>
        </div>

        {/* §6 "저축·투자 이동이 양방향으로 존재하면 한 방향만 숨기지 않는다" — 두 값을 각각 표시. */}
        {savingsExpense > 0 && (
          <div className="mt-2 flex items-center justify-between rounded-xl border border-dashed border-ll-periwinkle/40 bg-ll-periwinkle/10 px-3 py-2.5">
            <span className="text-[11px] leading-tight text-ll-ink">
              저축·투자로 옮긴 돈
              <br />
              <small className="text-[9px] text-ll-pencil">일반 계좌 → 저축·투자 계좌</small>
            </span>
            <b className="text-sm font-extrabold tabular-nums text-ll-periwinkle">{formatWon(savingsExpense)}</b>
          </div>
        )}
        {savingsIncome > 0 && (
          <div className="mt-2 flex items-center justify-between rounded-xl border border-dashed border-ll-periwinkle/40 bg-ll-periwinkle/10 px-3 py-2.5">
            <span className="text-[11px] leading-tight text-ll-ink">
              저축·투자에서 가져온 돈
              <br />
              <small className="text-[9px] text-ll-pencil">저축·투자 계좌 → 일반 계좌</small>
            </span>
            <b className="text-sm font-extrabold tabular-nums text-ll-periwinkle">{formatWon(savingsIncome)}</b>
          </div>
        )}

        <div className="mt-2.5 flex items-center justify-between px-0.5 text-[10px] text-ll-pencil">
          <span>{totalChangeLabel}</span>
          <b className="font-bold tabular-nums text-ll-ink">{formatSignedWon(totalChange)}</b>
        </div>
      </div>
    </section>
  );
}

/* ── 주간 흐름(이번 달 전용) ── */

function WeeklyFlowSection({ buckets }: { buckets: WeeklyBucket[] }) {
  const max = Math.max(1, ...buckets.flatMap((b) => [b.income, b.expense]));
  return (
    <section>
      <SectionHead title="주간 흐름" sub="일별 기록을 주 단위로 묶었어요" />
      <div className="rounded-2xl border border-ll-ink/10 bg-white/70 p-4 shadow-sm">
        <div
          className="flex h-28 items-end justify-around gap-2 border-b border-ll-ink/15"
          aria-hidden="true"
        >
          {buckets.map((b) => (
            <div key={b.label} className="flex h-full flex-1 items-end justify-center gap-1">
              <div
                className="w-2.5 rounded-t bg-ll-mint"
                style={{ height: `${Math.max(2, (b.income / max) * 100)}%` }}
              />
              <div
                className="w-2.5 rounded-t bg-ll-tomato"
                style={{ height: `${Math.max(2, (b.expense / max) * 100)}%` }}
              />
            </div>
          ))}
        </div>
        <div className="mt-1.5 flex justify-around text-[10px] text-ll-pencil" aria-hidden="true">
          {buckets.map((b) => (
            <span key={b.label}>{b.label}</span>
          ))}
        </div>
        <div className="mt-2.5 flex justify-center gap-4 text-[10px] text-ll-pencil" aria-hidden="true">
          <span className="inline-flex items-center gap-1">
            <i className="inline-block h-2 w-2 rounded-sm bg-ll-mint" />
            수입
          </span>
          <span className="inline-flex items-center gap-1">
            <i className="inline-block h-2 w-2 rounded-sm bg-ll-tomato" />
            지출
          </span>
        </div>
        <p className="mt-2 text-[10px] leading-relaxed text-ll-pencil break-keep">
          저축·투자와 계좌 이체는 생활 수입·지출 막대에 섞지 않아요.
        </p>
        {/* §14 "차트는 스크린리더가 읽을 수 있는 요약 또는 숨겨진 데이터 목록을 함께 제공" */}
        <ul className="sr-only">
          {buckets.map((b) => (
            <li key={b.label}>{`${b.label}(${b.startDay}~${b.endDay}일): 수입 ${formatWon(b.income)}, 지출 ${formatWon(
              b.expense,
            )}`}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ── 전월 대비(과거 월 전용) ── */

function ComparisonSection({ summary }: { summary: DashboardSummary }) {
  return (
    <section>
      <SectionHead title="전월 대비" sub="지난달과 비교" />
      <div className="space-y-2.5 rounded-2xl border border-ll-ink/10 bg-white/70 p-4 shadow-sm">
        <ComparisonRow label="생활 지출" rate={summary.expenseChangeRate ?? null} inverse />
        <ComparisonRow label="생활 수입" rate={summary.incomeChangeRate ?? null} />
      </div>
    </section>
  );
}

function ComparisonRow({ label, rate, inverse }: { label: string; rate: number | null; inverse?: boolean }) {
  if (rate == null) {
    return (
      <div className="flex items-center justify-between text-[11px]">
        <span className="font-semibold text-ll-ink">{label}</span>
        <span className="text-ll-pencil">비교할 전월 기록이 없어요</span>
      </div>
    );
  }
  const positive = inverse ? rate <= 0 : rate >= 0;
  const arrow = rate === 0 ? "→" : rate > 0 ? "↑" : "↓";
  return (
    <div className="flex items-center justify-between text-[11px]">
      <span className="font-semibold text-ll-ink">{label}</span>
      <span className={`font-extrabold tabular-nums ${positive ? "text-ll-ink" : "text-ll-tomato"}`}>
        <span aria-hidden="true">{arrow} </span>
        {rate > 0 ? "+" : ""}
        {rate}%
      </span>
    </div>
  );
}

/* ── 카테고리 순위(월간·연간 공용) ── */

function CategoryRanking({
  items,
  colors,
  title,
  sub,
  emptyMessage,
}: {
  items: { category: string; amount: number; percentage: number }[];
  colors: Record<string, string>;
  title: string;
  sub: string;
  emptyMessage: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const PREVIEW = 3;
  const visible = expanded ? items : items.slice(0, PREVIEW);
  const hiddenCount = items.length - PREVIEW;

  return (
    <section>
      <SectionHead title={title} sub={sub} />
      {items.length === 0 ? (
        <div className="rounded-2xl border border-ll-ink/10 bg-white/70 p-6 text-center text-xs text-ll-pencil break-keep">
          {emptyMessage}
        </div>
      ) : (
        <div className="divide-y divide-ll-ink/10 rounded-2xl border border-ll-ink/10 bg-white/70 px-3.5 shadow-sm">
          {visible.map((item, index) => (
            <div key={item.category} className="grid grid-cols-[22px_minmax(0,1fr)_auto] items-center gap-2 py-2.5">
              <em className="text-[11px] font-black not-italic text-ll-ink">{index + 1}</em>
              <div className="min-w-0">
                <b className="block truncate text-xs font-semibold text-ll-ink">{item.category}</b>
                <div className="mt-1 h-[7px] overflow-hidden rounded-full bg-ll-cream" aria-hidden="true">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${item.percentage}%`, backgroundColor: colors[item.category] ?? "#9ca3af" }}
                  />
                </div>
              </div>
              <strong className="text-right text-[11px] text-ll-ink">
                {formatWon(item.amount)}
                <small className="mt-0.5 block text-right text-[9px] font-normal text-ll-pencil">
                  {item.percentage}%
                </small>
              </strong>
            </div>
          ))}
          {hiddenCount > 0 && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="min-h-[40px] w-full text-[10px] font-black text-ll-ink"
            >
              {expanded ? "접기 ↑" : `나머지 ${hiddenCount}개 카테고리 보기 ↓`}
            </button>
          )}
        </div>
      )}
    </section>
  );
}

/* ── 예산 속도(이번 달)/결과(과거 월) ── */

function BudgetSection({
  isCurrentMonthPeriod,
  summary,
}: {
  isCurrentMonthPeriod: boolean;
  summary: BudgetSummary;
}) {
  const { targetTotal, spentTotal, percentage, overAmount } = summary;

  if (isCurrentMonthPeriod) {
    const pct = percentage ?? 0;
    const clamped = Math.min(100, Math.max(0, pct));
    const isOver = pct > 100;
    return (
      <section>
        <SectionHead title="예산 속도" sub="예산이 있을 때만 표시" />
        <div className="flex items-center gap-3 rounded-2xl border border-ll-ink/10 bg-white/70 p-4 shadow-sm">
          <div
            aria-hidden="true"
            className="grid h-12 w-12 shrink-0 place-items-center rounded-full"
            style={{
              background: `conic-gradient(var(${isOver ? "--color-ll-tomato" : "--color-ll-ink"}) 0 ${
                clamped * 3.6
              }deg, var(--color-ll-cream) 0)`,
            }}
          >
            <div className="grid h-9 w-9 place-items-center rounded-full bg-ll-paper text-[9px] font-black text-ll-ink">
              {Math.round(pct)}%
            </div>
          </div>
          <div className="min-w-0">
            <b className="block text-xs font-extrabold text-ll-ink break-keep">
              {isOver ? `예산을 ${formatWon(overAmount)} 넘었어요.` : "이 속도면 예산 안에서 마칠 수 있어요."}
            </b>
            <p className="mt-1 text-[10px] leading-relaxed text-ll-pencil break-keep">
              이번 달 예산 {formatWon(targetTotal)} 중 {formatWon(spentTotal)}을 썼어요.
            </p>
          </div>
        </div>
      </section>
    );
  }

  const isOver = overAmount > 0;
  return (
    <section>
      <SectionHead title="예산 결과" sub="속도가 아닌 최종 결과" />
      <div className="rounded-2xl border border-ll-ink/10 bg-white/70 p-4 shadow-sm">
        <b className="block text-xs font-extrabold text-ll-ink break-keep">
          {isOver ? `예산을 ${formatWon(overAmount)} 초과했어요.` : `예산이 ${formatWon(Math.abs(overAmount))} 남았어요.`}
        </b>
        <p className="mt-1 text-[10px] leading-relaxed text-ll-pencil break-keep">
          예산 {formatWon(targetTotal)} 중 {formatWon(spentTotal)}을 썼어요.
        </p>
      </div>
    </section>
  );
}

/* ── 월간 빈 상태 ── */

function EmptyMonthPanel() {
  return (
    <section className="rounded-2xl border border-ll-ink/10 bg-white/70 p-7 text-center shadow-sm">
      <div className="text-3xl" aria-hidden="true">
        📊
      </div>
      <h3 className="mt-2.5 text-sm font-bold text-ll-ink break-keep">아직 이번 달 기록이 없어요.</h3>
      <p className="mt-1.5 text-[11px] leading-relaxed text-ll-pencil break-keep">
        첫 기록이 쌓이면 생활 수지와 소비 흐름을
        <br />
        여기에서 한눈에 정리해드릴게요.
      </p>
    </section>
  );
}

/* ══════════════════════════════════
   월간 섹션 조립
══════════════════════════════════ */
function MonthlySection(props: UseStatisticsDataResult & { isCurrentMonthPeriod: boolean }) {
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

  // §12 "월간에 거래가 하나도 없으면 시안의 월간 빈 상태를 표시한다" — 가장 근거가 확실한
  // daily query(그 달에 어떤 거래든 있었는지)가 성공적으로 "0건"을 확인했을 때만 판단한다.
  if (dailyQuery.isSuccess && !monthHasAnyTransactions) {
    return <EmptyMonthPanel />;
  }

  const insightSection =
    summaryQuery.isLoading ? (
      <SectionSkeleton className="h-28" />
    ) : summaryQuery.isError || !summary || !monthlyInsight ? (
      <SectionError message="한줄 요약을 불러오지 못했어요." onRetry={() => summaryQuery.refetch()} />
    ) : (
      <InsightCard label={isCurrentMonthPeriod ? "이번 달 한줄 요약" : "이 달 한줄 결산"} insight={monthlyInsight} />
    );

  const flowSection =
    summaryQuery.isLoading ? (
      <SectionSkeleton className="h-40" />
    ) : summaryQuery.isError || !summary || !monthlyFlow ? (
      <SectionError message="돈의 흐름을 불러오지 못했어요." onRetry={() => summaryQuery.refetch()} />
    ) : (
      <FlowCard
        title={isCurrentMonthPeriod ? "이번 달 돈의 흐름" : "확정된 돈의 흐름"}
        sub="생활 거래 기준"
        income={summary.income}
        expense={summary.expense}
        livingBalance={monthlyFlow.livingBalance}
        savingsIncome={summary.savingsIncome}
        savingsExpense={summary.savingsExpense}
        totalChange={monthlyFlow.totalChange}
        totalChangeLabel={isCurrentMonthPeriod ? "이번 달 전체 변화" : "그 달 전체 변화"}
      />
    );

  const weeklySection = isCurrentMonthPeriod ? (
    dailyQuery.isLoading ? (
      <SectionSkeleton className="h-48" />
    ) : dailyQuery.isError ? (
      <SectionError message="주간 흐름을 불러오지 못했어요." onRetry={() => dailyQuery.refetch()} />
    ) : (
      <WeeklyFlowSection buckets={weeklyBuckets} />
    )
  ) : null;

  const budgetSection =
    budgetQuery.isLoading ? (
      <SectionSkeleton className="h-20" />
    ) : budgetQuery.isError ? (
      <SectionError message="예산 정보를 불러오지 못했어요." onRetry={() => budgetQuery.refetch()} />
    ) : hasBudget ? (
      <BudgetSection isCurrentMonthPeriod={isCurrentMonthPeriod} summary={budgetSummary} />
    ) : null; // §8 "예산이 없으면 섹션 전체를 숨긴다"

  const comparisonSection = !isCurrentMonthPeriod ? (
    summaryQuery.isLoading ? (
      <SectionSkeleton className="h-24" />
    ) : summaryQuery.isError || !summary ? (
      <SectionError message="전월 대비 정보를 불러오지 못했어요." onRetry={() => summaryQuery.refetch()} />
    ) : (
      <ComparisonSection summary={summary} />
    )
  ) : null;

  const categorySection =
    categoryQuery.isLoading ? (
      <SectionSkeleton className="h-40" />
    ) : categoryQuery.isError ? (
      <SectionError message="카테고리 분석을 불러오지 못했어요." onRetry={() => categoryQuery.refetch()} />
    ) : (
      <CategoryRanking
        items={categoryData}
        colors={categoryColors}
        title="어디에 많이 썼을까요?"
        sub={isCurrentMonthPeriod ? "이번 달" : "이 달"}
        emptyMessage="이번 기간 지출 데이터가 없어요."
      />
    );

  // §5 순서: 이번 달 = 한줄요약·흐름·주간·카테고리·예산 / 과거 월 = 한줄결산·흐름·예산·전월대비·카테고리
  return (
    <div className="space-y-4">
      {insightSection}
      {flowSection}
      {isCurrentMonthPeriod ? (
        <>
          {weeklySection}
          {categorySection}
          {budgetSection}
        </>
      ) : (
        <>
          {budgetSection}
          {comparisonSection}
          {categorySection}
        </>
      )}
    </div>
  );
}

/* ── 연간: 월별 생활 수지 차트 ── */

function AnnualBalanceChart({
  months,
  throughMonth,
  isCurrentYear,
}: {
  months: DashboardAnnualMonth[];
  throughMonth: number;
  isCurrentYear: boolean;
}) {
  const considered = months.filter((_, i) => {
    const monthNumber = i + 1;
    return isCurrentYear ? monthNumber <= throughMonth : true;
  });
  const maxAbs = Math.max(1, ...considered.map((m) => Math.abs(m.livingBalance)));

  return (
    <div className="rounded-2xl border border-ll-ink/10 bg-white/70 p-4 shadow-sm">
      <div className="flex h-32 items-stretch gap-1.5" aria-hidden="true">
        {months.map((m, i) => {
          const monthNumber = i + 1;
          const isFuture = isCurrentYear && monthNumber > throughMonth; // §11 "미래 월은 막대로 그리지 않는다"
          if (isFuture) return <div key={m.month} className="flex-1" />;
          const heightPct = Math.min(100, (Math.abs(m.livingBalance) / maxAbs) * 100);
          const positive = m.livingBalance >= 0;
          return (
            <div key={m.month} className="flex flex-1 flex-col">
              <div className="flex flex-1 items-end justify-center">
                {positive && <div className="w-2.5 rounded-t bg-ll-mint" style={{ height: `${heightPct}%` }} />}
              </div>
              <div className="h-px w-full bg-ll-ink/20" />
              <div className="flex flex-1 items-start justify-center">
                {!positive && <div className="w-2.5 rounded-b bg-ll-tomato" style={{ height: `${heightPct}%` }} />}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-1.5 flex gap-1.5 text-center text-[8px] text-ll-pencil" aria-hidden="true">
        {months.map((m, i) => (
          <span key={m.month} className="flex-1">
            {i + 1}
          </span>
        ))}
      </div>
      <p className="mt-2 text-[10px] leading-relaxed text-ll-pencil break-keep">
        수입 − 생활 지출. 아직 오지 않은 달은 막대로 그리지 않아요.
      </p>
      <ul className="sr-only">
        {months.map((m, i) => {
          const monthNumber = i + 1;
          const isFuture = isCurrentYear && monthNumber > throughMonth;
          if (isFuture) return null;
          return (
            <li key={m.month}>
              {`${monthNumber}월: 생활 수지 ${formatSignedWon(m.livingBalance)} (${
                m.livingBalance >= 0 ? "흑자" : "적자"
              })`}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function KpiCell({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl bg-ll-cream p-3">
      <span className="block text-[9px] text-ll-pencil">{label}</span>
      <b className="mt-1 block text-xs font-extrabold text-ll-ink break-keep">{value}</b>
      {sub && <span className="mt-0.5 block text-[9px] text-ll-pencil break-keep">{sub}</span>}
    </div>
  );
}

function AnnualKpis({
  average,
  extremes,
  savingsNet,
  isCurrentYear,
}: {
  average: AverageLivingExpense;
  extremes: ExpenseExtremes;
  savingsNet: number;
  isCurrentYear: boolean;
}) {
  return (
    <div className="mt-3 grid grid-cols-2 gap-2">
      <KpiCell
        label="월평균 생활비"
        value={average.consideredMonths > 0 ? formatWon(average.average) : "기록 부족"}
        sub={
          average.consideredMonths > 0
            ? `${average.consideredMonths}개월 기준${isCurrentYear ? " · 진행 중인 달 제외" : ""}`
            : undefined
        }
      />
      <KpiCell
        label="저축·투자 순이동"
        value={formatSignedWon(savingsNet)}
        sub={savingsNet >= 0 ? "순저축" : "순회수"}
      />
      {extremes.max && (
        <KpiCell label="가장 많이 쓴 달" value={`${monthNumberOf(extremes.max.month)}월 · ${formatWon(extremes.max.expense)}`} />
      )}
      {extremes.min && (
        <KpiCell label="가장 적게 쓴 달" value={`${monthNumberOf(extremes.min.month)}월 · ${formatWon(extremes.min.expense)}`} />
      )}
    </div>
  );
}

function EmptyYearPanel() {
  return (
    <section className="rounded-2xl border border-ll-ink/10 bg-white/70 p-7 text-center shadow-sm">
      <div className="text-3xl" aria-hidden="true">
        📈
      </div>
      <h3 className="mt-2.5 text-sm font-bold text-ll-ink break-keep">아직 올해 기록이 없어요.</h3>
      <p className="mt-1.5 text-[11px] leading-relaxed text-ll-pencil break-keep">
        기록이 쌓이면 월별 흐름과 연간 소비 구조를
        <br />
        여기에서 한눈에 정리해드릴게요.
      </p>
    </section>
  );
}

/* ══════════════════════════════════
   연간 섹션 조립
══════════════════════════════════ */
function YearlySection(props: UseStatisticsDataResult) {
  const { annualQuery, annual, annualHighlights, annualInsight, annualHasAnyTransactions, isCurrentYear, categoryColors } = props;

  if (annualQuery.isLoading) {
    return (
      <div className="space-y-4">
        <SectionSkeleton className="h-28" />
        <SectionSkeleton className="h-56" />
        <SectionSkeleton className="h-40" />
      </div>
    );
  }

  if (annualQuery.isError || !annual || !annualHighlights) {
    return <SectionError message="연간 통계를 불러오지 못했어요." onRetry={() => annualQuery.refetch()} />;
  }

  if (!annualHasAnyTransactions) {
    return <EmptyYearPanel />;
  }

  return (
    <div className="space-y-4">
      {annualInsight && <InsightCard label={`${annual.year}년 흐름`} insight={annualInsight} />}

      <section>
        <SectionHead title="월별 생활 수지" sub="수입 − 생활 지출" />
        <AnnualBalanceChart months={annual.months} throughMonth={annual.throughMonth} isCurrentYear={isCurrentYear} />
        <AnnualKpis
          average={annualHighlights.average}
          extremes={annualHighlights.extremes}
          savingsNet={annualHighlights.savingsNet}
          isCurrentYear={isCurrentYear}
        />
      </section>

      <CategoryRanking
        items={annual.categories}
        colors={categoryColors}
        title="올해 소비 순위"
        sub={`1–${annual.throughMonth}월 누적`}
        emptyMessage="올해 지출 데이터가 없어요."
      />
    </div>
  );
}
