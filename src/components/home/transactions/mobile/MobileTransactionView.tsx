"use client";

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

  // 편하게 보기 목록(§7 DESC 역산 결과)
  easyTransactions: Transaction[];
  isEasyLoading: boolean;
  isEasyError: boolean;
  easyErrorMessage?: string | null;
  onRetryEasy: () => void;
  hasActiveFilters: boolean;
  onResetFilters: () => void;
  onViewDetail: (t: Transaction) => void;
  loadMoreRef: React.RefObject<HTMLDivElement | null>;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  openingBalanceAmount?: number;
  openingBalanceDate: string;

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
  return (
    <div className="-mx-1 lg:hidden">
      <MobileLedgerToolbar
        onOpenSearchFilter={props.onOpenSearchFilter}
        activeFilterCount={props.activeFilterCount}
        activeFilterChips={props.activeFilterChips}
        hasActiveFilters={props.hasActiveFilters}
        onResetFilters={props.onResetFilters}
        isExcelView={props.isExcelView}
        onChangeIsExcelView={props.onChangeIsExcelView}
        viewMode={props.viewMode}
        onChangeViewMode={props.onChangeViewMode}
        dateDisplayString={props.dateDisplayString}
        onPrev={props.onPrev}
        onNext={props.onNext}
      />

      {/* DECISION_012 "보기 방식별 적용" — 선반은 편하게 보기/엑셀 장부 모두에서 유지한다. */}
      <AccountBalanceShelf
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
          />
        </div>
      ) : (
        <MobileTransactionList
          transactions={props.easyTransactions}
          isLoading={props.isEasyLoading}
          isError={props.isEasyError}
          errorMessage={props.easyErrorMessage}
          onRetry={props.onRetryEasy}
          hasActiveFilters={props.hasActiveFilters}
          onResetFilters={props.onResetFilters}
          selectedAccountId={props.selectedAccountId}
          onViewDetail={props.onViewDetail}
          loadMoreRef={props.loadMoreRef}
          hasNextPage={props.hasNextPage}
          isFetchingNextPage={props.isFetchingNextPage}
          openingBalanceAmount={props.openingBalanceAmount}
          openingBalanceDate={props.openingBalanceDate}
        />
      )}
    </div>
  );
}
