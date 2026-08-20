"use client";

import { useEffect, useRef, useState } from "react";
import type { BalanceRes } from "@/src/lib/api/balanceApi";
import MobileLedgerToolbar, { MOBILE_TOOLBAR_APPBAR_HEIGHT_PX } from "./MobileLedgerToolbar";
import AccountBalanceShelf from "./AccountBalanceShelf";
import MobileTransactionList from "./MobileTransactionList";
import LedgerTable from "../table/LedgerTable";

type ViewMode = "daily" | "weekly" | "monthly" | "custom";

interface MobileTransactionViewProps {
  // 툴바
  onOpenSearchFilter: () => void;
  activeFilterCount: number;
  activeFilterChips: { key: string; label: string; onRemove: () => void }[];
  isSearchResultMode: boolean;
  searchRangeLabel: string;
  isExcelView: boolean;
  onChangeIsExcelView: (isExcel: boolean) => void;
  viewMode: ViewMode;
  onChangeViewMode: (mode: ViewMode) => void;
  dateDisplayString: string;
  onPrev: () => void;
  onNext: () => void;

  // 잔액 선반
  filteredAccounts: Account[];
  shelfOpeningBalance?: BalanceRes;
  shelfClosingBalance?: BalanceRes;
  isShelfLoading: boolean;
  isShelfError: boolean;
  onRetryShelf: () => void;
  selectedAccountId: string;
  onSelectAccount: (accountId: string) => void;
  showSavingsAccount: boolean;
  onToggleSavings: (checked: boolean) => void;
  showCurrentLabel: boolean;
  /** 검색·필터 조회 범위가 "전체 기간"일 때 true(DECISION_013). */
  hideOpeningBalance: boolean;
  balanceNotice?: string;

  // 편하게 보기 목록(§7 DESC 역산 결과)
  easyTransactions: Transaction[];
  isEasyLoading: boolean;
  isEasyError: boolean;
  easyErrorMessage?: string | null;
  onRetryEasy: () => void;
  onResetFilters: () => void;
  onViewDetail: (t: Transaction) => void;
  loadMoreRef: React.RefObject<HTMLDivElement | null>;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  openingBalanceAmount?: number;
  openingBalanceDate: string;
  hideOpeningBookmark: boolean;
  /** 검색·필터 결과 모드가 아닐 때만 true(QA_REVIEW_027 P1) — 편하게 보기 카드와 엑셀 장부
   * 양쪽 모두 이 값으로 거래 후 잔액 표시 여부를 결정한다. */
  showRunningBalances: boolean;

  // 엑셀 장부(§10 — 기존 ASC 테이블을 모바일에서도 그대로 제공)
  excelTransactions: Transaction[];
  isExcelLoading: boolean;
  excelErrorMessage: string | null;
  onEdit: (t: Transaction) => void;
  onDelete: (id: string) => void;
  onReorder: (ids: string[]) => void;
  excelOpeningBalanceAmount: number;
}

/**
 * lg 미만 거래내역 화면 조합. `TransactionPage`는 이 컴포넌트에 계산이 끝난 값만 내려주고,
 * 이 컴포넌트는 배치·조합만 담당한다(IMPLEMENTATION_BRIEF_011 §4 "TransactionPage에 JSX를
 * 더 누적하지 않는다").
 */
export default function MobileTransactionView(props: MobileTransactionViewProps) {
  // 모바일 엑셀 헤더 table의 sticky top 위치(IMPLEMENTATION_BRIEF_015 §5.2 계승) — "잔액
  // 선반의 실제 하단 offset"을 측정한다. 앱 바 높이는 `MOBILE_TOOLBAR_APPBAR_HEIGHT_PX`로
  // 이미 CSS가 강제하는 고정값(추정이 아니라 실제 스타일 높이)이라 그대로 더하고, 선반
  // 자체의 높이만 `ResizeObserver`로 실측한다 — 계좌 카드 줄바꿈, "전체 기간" 안내 배너,
  // 로딩/오류 상태 전환 등 어떤 이유로 선반 높이가 바뀌든 동일하게 반영된다.
  //
  // 이 측정 메커니즘 자체는 REPORT_030~031(QA_REVIEW_030 P1)에서 만든 방식 그대로다 — 잔액
  // 선반을 새 wrapper `<div>`로 감싸면 `AccountBalanceShelf` 루트의 `position: sticky`가
  // 그 wrapper를 containing block으로 삼아 선반 자신의 고정이 거의 즉시 풀리는 회귀가
  // 있었다. 그래서 DOM 구조를 새로 만들지 않고, `forwardRef`로 노출한 선반의 실제
  // `<section>`(기존 sticky 요소 그대로) 자체를 직접 관찰한다. IMPLEMENTATION_BRIEF_015는
  // 이 값을 넘겨받는 쪽(`LedgerTable`)의 구조만 바꿨다 — 더 이상 IntersectionObserver 기반
  // 조건부 fixed 복제 헤더가 아니라, 모바일 헤더 전용 table의 CSS `position: sticky` top으로
  // 쓴다(§1, §3 "forwardRef와 ResizeObserver는 헤더 sticky top 계산에 필요하므로 유지한다").
  const shelfRef = useRef<HTMLElement>(null);
  const [measuredShelfHeight, setMeasuredShelfHeight] = useState<number | null>(null);

  useEffect(() => {
    // 카드형 "편하게 보기"에서는 엑셀 헤더 table 자체가 없으므로 측정 로직을 아예 켜지
    // 않는다 — state는 일부러 건드리지 않는다(마지막으로 측정된 값을 그대로 둬도 무해하다,
    // 엑셀 뷰가 아닐 땐 아래에서 아무 데도 쓰이지 않는다 — effect 본문에서 곧장 setState를
    // 호출하는 대신 ResizeObserver 콜백 안에서만 갱신해 `react-hooks/set-state-in-effect`도
    // 피한다). 엑셀 장부로 전환할 때마다 새 observer를 만들고, 벗어나거나 언마운트되면
    // 정리해 카드형↔엑셀 반복 전환에도 observer가 누적되지 않게 한다.
    if (!props.isExcelView) return;
    const el = shelfRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setMeasuredShelfHeight(entry.contentRect.height);
    });
    observer.observe(el);

    return () => observer.disconnect();
  }, [props.isExcelView]);

  // 측정 전(첫 ResizeObserver 콜백 전)에는 null — `LedgerTable`이 이 값을 그대로 받아 헤더
  // table에 아직 sticky 위치를 적용하지 않는다. 잘못된 위치(예: top:0)로 먼저 고정됐다가
  // 값이 갱신되며 튀는 깜빡임을 막는다.
  const mobileHeaderStickyTop = measuredShelfHeight === null ? null : MOBILE_TOOLBAR_APPBAR_HEIGHT_PX + measuredShelfHeight;

  return (
    <div className="-mx-1 lg:hidden">
      <MobileLedgerToolbar
        onOpenSearchFilter={props.onOpenSearchFilter}
        activeFilterCount={props.activeFilterCount}
        activeFilterChips={props.activeFilterChips}
        onResetFilters={props.onResetFilters}
        isSearchResultMode={props.isSearchResultMode}
        searchRangeLabel={props.searchRangeLabel}
        isExcelView={props.isExcelView}
        onChangeIsExcelView={props.onChangeIsExcelView}
        viewMode={props.viewMode}
        onChangeViewMode={props.onChangeViewMode}
        dateDisplayString={props.dateDisplayString}
        onPrev={props.onPrev}
        onNext={props.onNext}
      />

      {/* DECISION_012 "보기 방식별 적용" — 선반은 편하게 보기/엑셀 장부 모두에서 유지한다.
          측정용 wrapper 없이 선반의 실제 sticky 루트(`<section>`)를 ref로 직접 관찰한다
          (QA_REVIEW_030 P1) — 새 DOM 요소를 끼워 넣지 않으므로 sticky containing block이
          바뀌지 않고, 선반 자신의 고정 동작이 기존과 완전히 동일하게 유지된다. */}
      <AccountBalanceShelf
        ref={shelfRef}
        accounts={props.filteredAccounts}
        openingBalance={props.shelfOpeningBalance}
        closingBalance={props.shelfClosingBalance}
        isLoading={props.isShelfLoading}
        isError={props.isShelfError}
        onRetry={props.onRetryShelf}
        selectedAccountId={props.selectedAccountId}
        onSelectAccount={props.onSelectAccount}
        showSavingsAccount={props.showSavingsAccount}
        onToggleSavings={props.onToggleSavings}
        showCurrentLabel={props.showCurrentLabel}
        stickyTopPx={MOBILE_TOOLBAR_APPBAR_HEIGHT_PX}
        hideOpeningBalance={props.hideOpeningBalance}
        balanceNotice={props.balanceNotice}
      />

      {props.isExcelView ? (
        <div className="mt-3">
          <p className="px-4 pb-2 text-[11px] text-ll-pencil">가로로 밀어 전체 항목을 볼 수 있어요 →</p>
          <LedgerTable
            transactions={props.excelTransactions}
            loading={props.isExcelLoading}
            error={props.excelErrorMessage}
            onEdit={props.onEdit}
            onDelete={props.onDelete}
            onReorder={props.onReorder}
            onViewDetail={props.onViewDetail}
            currentAccountId={props.selectedAccountId}
            isExcelView
            openingBalanceAmount={props.excelOpeningBalanceAmount}
            showRunningBalances={props.showRunningBalances}
            allowReorder={!props.isSearchResultMode}
            mobileHeaderStickyTop={mobileHeaderStickyTop}
          />
        </div>
      ) : (
        <MobileTransactionList
          transactions={props.easyTransactions}
          isLoading={props.isEasyLoading}
          isError={props.isEasyError}
          errorMessage={props.easyErrorMessage}
          onRetry={props.onRetryEasy}
          isSearchResultMode={props.isSearchResultMode}
          onResetFilters={props.onResetFilters}
          selectedAccountId={props.selectedAccountId}
          onViewDetail={props.onViewDetail}
          loadMoreRef={props.loadMoreRef}
          hasNextPage={props.hasNextPage}
          isFetchingNextPage={props.isFetchingNextPage}
          openingBalanceAmount={props.openingBalanceAmount}
          openingBalanceDate={props.openingBalanceDate}
          hideOpeningBookmark={props.hideOpeningBookmark}
          showRunningBalances={props.showRunningBalances}
        />
      )}
    </div>
  );
}
