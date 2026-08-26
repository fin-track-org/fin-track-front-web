"use client";

import { useMemo } from "react";
import { getTransactionSign } from "@/src/lib/transactionUtils";
import { ReceiptCard, DateTape } from "@/src/components/ledger/ReceiptList";
import { StatePanel } from "@/src/components/ledger/StatePanel";
import MobileTransactionCard from "./MobileTransactionCard";

function formatDateFriendly(dateStr: string) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${days[d.getDay()]})`;
}

interface MobileTransactionListProps {
  /** 이미 DESC(최신순)로 정렬되고 거래 후 잔액이 역산돼 있는 목록. */
  transactions: Transaction[];
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string | null;
  onRetry: () => void;
  /** 검색·필터 결과 모드 활성 여부(IMPLEMENTATION_BRIEF_013 §5.2) — 검색어/유형/카테고리
   * 조건이 없어도 조회 기간만 적용된 상태(기간-only 결과)를 포함한다. 빈 결과일 때 이
   * 값으로 "필터 초기화" 액션 노출 여부를 정한다 — 검색어/유형/카테고리 개수만 보면
   * 기간-only 결과의 빈 상태에서 액션이 사라지는 문제가 있었다. */
  isSearchResultMode: boolean;
  onResetFilters: () => void;
  selectedAccountId: string;
  onViewDetail: (t: Transaction) => void;
  loadMoreRef: React.RefObject<HTMLDivElement | null>;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  /** 전체 페이지 로드가 끝난 뒤에만 표시할 기간 시작 잔액(§9 — hasNextPage===false일 때만). */
  openingBalanceAmount?: number;
  openingBalanceDate: string;
  /** 검색·필터 조회 범위가 "전체 기간"일 때 true — 의미 없는 기간 시작 잔액 북마크를
   * 표시하지 않는다(DECISION_013, IMPLEMENTATION_BRIEF_012 §7). */
  hideOpeningBookmark?: boolean;
  /** 검색·필터 결과 모드가 아닐 때만 true(QA_REVIEW_027 P1) — false면 카드의 거래 후
   * 전체/계좌 잔액, 이체의 출금 후/입금 후 잔액을 전부 감춘다(필터로 빠진 중간 거래가
   * 있으면 부정확해지므로). */
  showRunningBalances: boolean;
}

/**
 * 편하게 보기의 날짜별 최신순 목록. 로딩/오류/빈 상태를 거래 0건으로 위장하지 않는다
 * (IMPLEMENTATION_BRIEF_011 §11).
 */
export default function MobileTransactionList({
  transactions,
  isLoading,
  isError,
  errorMessage,
  onRetry,
  isSearchResultMode,
  onResetFilters,
  selectedAccountId,
  onViewDetail,
  loadMoreRef,
  hasNextPage,
  isFetchingNextPage,
  openingBalanceAmount,
  openingBalanceDate,
  hideOpeningBookmark = false,
  showRunningBalances,
}: MobileTransactionListProps) {
  const groupedByDate = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    for (const t of transactions) {
      if (!map.has(t.date)) map.set(t.date, []);
      map.get(t.date)!.push(t);
    }
    // 날짜 그룹 자체는 최신 날짜가 위(입력이 이미 DESC라 Map 삽입 순서가 그대로 최신순).
    return Array.from(map.entries());
  }, [transactions]);

  if (isLoading) {
    return (
      <div className="space-y-2.5 px-4 py-3" aria-hidden="true">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-xl bg-ll-cream" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="px-4 py-3">
        <StatePanel
          tone="warn"
          title="거래 내역을 불러오지 못했어요"
          description={errorMessage ?? undefined}
          action={{ label: "다시 시도", onClick: onRetry }}
        />
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="px-4 py-3">
        <StatePanel
          tone="neutral"
          title="현재 조건에 맞는 거래가 없어요"
          description={isSearchResultMode ? "필터를 초기화하면 다른 거래를 볼 수 있어요." : "빠른 기록으로 지금 바로 남겨보세요."}
          action={isSearchResultMode ? { label: "필터 초기화", onClick: onResetFilters } : undefined}
        />
      </div>
    );
  }

  return (
    <div className="px-4 pb-3">
      <p className="mb-2 text-[11px] text-ll-pencil">
        <strong className="text-ll-ink">{selectedAccountId ? "선택한 결제수단" : "전체 자산"}</strong>의 거래를 최신순으로
        보고 있어요.
      </p>

      {groupedByDate.map(([date, items]) => {
        const expenseTotal = items
          .filter((t) => getTransactionSign(t, selectedAccountId || undefined) === "-")
          .reduce((sum, t) => sum + Math.abs(t.amount), 0);
        const incomeTotal = items
          .filter((t) => getTransactionSign(t, selectedAccountId || undefined) === "+")
          .reduce((sum, t) => sum + Math.abs(t.amount), 0);
        const meta =
          expenseTotal > 0 && incomeTotal > 0
            ? `지출 ${expenseTotal.toLocaleString()}원 · 수입 ${incomeTotal.toLocaleString()}원`
            : expenseTotal > 0
              ? `지출 ${expenseTotal.toLocaleString()}원`
              : incomeTotal > 0
                ? `수입 ${incomeTotal.toLocaleString()}원`
                : undefined;

        return (
          <section key={date} className="pt-2 first:pt-0" aria-label={formatDateFriendly(date)}>
            <DateTape label={formatDateFriendly(date)} meta={meta} className="mb-1.5" />
            <ReceiptCard>
              {items.map((t) => (
                <MobileTransactionCard
                  key={t.id}
                  transaction={t}
                  selectedAccountId={selectedAccountId}
                  onClick={() => onViewDetail(t)}
                  showRunningBalances={showRunningBalances}
                />
              ))}
            </ReceiptCard>
          </section>
        );
      })}

      <div ref={loadMoreRef} className="h-4" />

      {isFetchingNextPage && (
        <p className="py-3 text-center text-xs text-ll-pencil">지난 거래를 불러오는 중...</p>
      )}

      {/* §9 — 무한 페이지가 남아 있으면 시작 잔액을 미리 노출하지 않는다. 조회 범위가
          "전체 기간"이면 의미 있는 시작 시점 자체가 없으므로 아예 표시하지 않는다(DECISION_013). */}
      {!hasNextPage && !hideOpeningBookmark && (
        <div className="mx-1 mt-3 flex items-center justify-between gap-3 rounded-xl border-[1.5px] border-dashed border-ll-ink bg-ll-cream px-3.5 py-2.5">
          <span className="text-[11px] leading-snug text-ll-ink">
            {openingBalanceDate} 시작 잔액
            <br />
            <span className="text-ll-pencil">이 기간의 장부가 여기서 시작돼요.</span>
          </span>
          <strong className="shrink-0 text-sm font-bold text-ll-ink">
            {openingBalanceAmount !== undefined ? `${openingBalanceAmount.toLocaleString()}원` : "-"}
          </strong>
        </div>
      )}
    </div>
  );
}
