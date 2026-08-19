"use client";

import { forwardRef } from "react";
import type { BalanceRes } from "@/src/lib/api/balanceApi";
import { getAccountIcon } from "@/src/lib/transactionUtils";

interface AccountBalanceShelfProps {
  /** 저축·투자 포함 스위치를 반영해 이미 걸러진 결제수단 목록(§6 "현재 포함 대상"). */
  accounts: Account[];
  /** 저축·투자 필터까지 적용된 시작 잔액(전체 자산 카드 + 개별 카드 시작값의 출처). */
  openingBalance?: BalanceRes;
  /** 저축·투자 필터까지 적용된 종료/현재 잔액. */
  closingBalance?: BalanceRes;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  selectedAccountId: string;
  onSelectAccount: (accountId: string) => void;
  showSavingsAccount: boolean;
  onToggleSavings: (checked: boolean) => void;
  /** true면 "현재", false면 "종료"(조회 기간이 완전히 과거일 때). DECISION_012 "잔액 문구". */
  showCurrentLabel: boolean;
  /** 앱 바 바로 아래 sticky 위치(px). */
  stickyTopPx: number;
  /** 검색·필터 조회 범위가 "전체 기간"일 때 true(DECISION_013). 의미 없는 "시작" 값을
   * 감추고 카드에 "현재 잔액" 한 줄만 보여준다 — `openingBalance`는 이 모드에선 무시된다. */
  hideOpeningBalance?: boolean;
  /** "전체 기간"에서 보여줄 안내 문구(DECISION_013 "잔액은 검색 조건과 무관한 실제 계좌
   * 잔액이에요"). `hideOpeningBalance`일 때만 렌더링한다. */
  balanceNotice?: string;
}

/**
 * 결제수단 선택 + 시작 잔액 + 현재/종료 잔액을 하나로 묶은 가로 선반(DECISION_012).
 * 잔액은 거래 목록 스크롤과 무관하게 고정된 조회 기간 값만 보여준다 — 이 컴포넌트는 그
 * props로만 값을 받고 스스로 스크롤 위치를 관찰하지 않는다(구현 금지 사항 1번).
 *
 * `forwardRef`로 루트 `<section>`(실제 `position: sticky` 요소) 자체에 접근할 수 있게 한다
 * (QA_REVIEW_030 P1) — 모바일 엑셀 헤더의 동적 offset을 구하려고 이 섹션을 감싸는 새
 * wrapper `<div>`를 두면, sticky 요소의 containing block이 그 wrapper로 좁아져 선반 자신의
 * sticky 동작이 거의 즉시 끊기는 회귀가 생긴다 — DOM 구조를 새로 만들지 않고 기존 sticky
 * 요소를 직접 관찰해야 이 문제가 없다.
 */
const AccountBalanceShelf = forwardRef<HTMLElement, AccountBalanceShelfProps>(function AccountBalanceShelf({
  accounts,
  openingBalance,
  closingBalance,
  isLoading,
  isError,
  onRetry,
  selectedAccountId,
  onSelectAccount,
  showSavingsAccount,
  onToggleSavings,
  showCurrentLabel,
  stickyTopPx,
  hideOpeningBalance = false,
  balanceNotice,
}, ref) {
  const currentLabel = showCurrentLabel ? "현재" : "종료";

  const findAmount = (balance: BalanceRes | undefined, accountId?: string) => {
    if (!balance) return undefined;
    if (accountId === undefined) return balance.totalAmount;
    return balance.accounts.find((a) => a.accountId === accountId)?.amount ?? 0;
  };

  const formatWon = (amount: number | undefined) =>
    amount === undefined ? "-" : `${amount < 0 ? "-" : ""}${Math.abs(amount).toLocaleString()}원`;

  // 카드 아리아 라벨 — 전체 기간(hideOpeningBalance)에서는 "시작"을 언급하지 않는다.
  const cardAriaLabel = (name: string, accId?: string) =>
    hideOpeningBalance
      ? `${name}, 현재 잔액 ${formatWon(findAmount(closingBalance, accId))}`
      : `${name}, 시작 ${formatWon(findAmount(openingBalance, accId))}, ${currentLabel} ${formatWon(findAmount(closingBalance, accId))}`;

  return (
    <section
      ref={ref}
      aria-label="결제수단별 잔액 및 장부 선택"
      className="sticky z-[7] border-y border-ll-ink/12 bg-ll-paper/97 py-2.5 backdrop-blur-sm"
      style={{ top: stickyTopPx }}
    >
      <div className="mb-1.5 flex items-center justify-between gap-2 px-4">
        <strong className="text-[11px] font-bold text-ll-ink/70">결제수단별 잔액</strong>
        <label className="flex min-h-[28px] items-center gap-1.5 text-[11px] font-bold text-ll-ink">
          <span>저축·투자 포함</span>
          <input
            type="checkbox"
            checked={showSavingsAccount}
            onChange={(e) => onToggleSavings(e.target.checked)}
            className="h-4 w-4 rounded border-ll-ink/40 text-ll-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-ll-periwinkle"
          />
        </label>
      </div>

      {hideOpeningBalance && balanceNotice && (
        <p className="mx-4 mb-1.5 rounded-lg bg-ll-cream px-2.5 py-1.5 text-[10px] leading-snug text-ll-ink/70">
          {balanceNotice}
        </p>
      )}

      {isError ? (
        <div className="mx-4 flex min-h-[44px] items-center justify-between gap-3 rounded-xl border border-ll-tomato/40 bg-ll-tomato/10 px-3 py-2 text-xs text-ll-ink">
          <span>잔액을 불러오지 못했어요</span>
          <button
            type="button"
            onClick={onRetry}
            className="min-h-[32px] shrink-0 rounded-full border border-ll-ink px-3 text-[11px] font-bold"
          >
            다시 시도
          </button>
        </div>
      ) : isLoading ? (
        <div className="flex gap-2 overflow-hidden px-4" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-[76px] w-[166px] shrink-0 animate-pulse rounded-2xl bg-ll-ink/10" />
          ))}
        </div>
      ) : (
        <div
          className="flex gap-2 overflow-x-auto px-4 pb-1"
          style={{ scrollSnapType: "x proximity" }}
        >
          <button
            type="button"
            aria-pressed={selectedAccountId === ""}
            aria-label={cardAriaLabel("전체 자산")}
            onClick={() => onSelectAccount("")}
            className={[
              "min-h-[44px] shrink-0 rounded-2xl border-[1.5px] border-ll-ink/16 bg-ll-paper px-3 py-2.5 text-left shadow-[0_2px_5px_rgba(32,40,58,0.07)]",
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ll-periwinkle",
              selectedAccountId === "" ? "border-2 border-ll-ink bg-ll-butter shadow-[3px_3px_0_var(--color-ll-ink)]" : "",
            ].join(" ")}
            style={{ width: 166, scrollSnapAlign: "start" }}
          >
            <span className="mb-2 flex items-center justify-between text-[11px] font-black">
              전체 자산
              {selectedAccountId === "" && <span className="text-[9px] font-bold">선택됨</span>}
            </span>
            {hideOpeningBalance ? (
              <span className="block text-[9px] text-ll-pencil">
                현재 잔액
                <b className="mt-0.5 block text-[11px] font-bold tabular-nums text-ll-ink">
                  {formatWon(findAmount(closingBalance))}
                </b>
              </span>
            ) : (
              <span className="grid grid-cols-2 gap-1.5">
                <span className="block text-[9px] text-ll-pencil">
                  시작
                  <b className="mt-0.5 block text-[11px] font-bold tabular-nums text-ll-ink">
                    {formatWon(findAmount(openingBalance))}
                  </b>
                </span>
                <span className="block text-[9px] text-ll-pencil">
                  {currentLabel}
                  <b className="mt-0.5 block text-[11px] font-bold tabular-nums text-ll-ink">
                    {formatWon(findAmount(closingBalance))}
                  </b>
                </span>
              </span>
            )}
          </button>

          {accounts.map((acc) => {
            const isSelected = selectedAccountId === acc.id;
            return (
              <button
                key={acc.id}
                type="button"
                aria-pressed={isSelected}
                aria-label={cardAriaLabel(acc.name, acc.id)}
                onClick={() => onSelectAccount(isSelected ? "" : acc.id)}
                className={[
                  "min-h-[44px] shrink-0 rounded-2xl border-[1.5px] border-ll-ink/16 bg-ll-paper px-3 py-2.5 text-left shadow-[0_2px_5px_rgba(32,40,58,0.07)]",
                  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ll-periwinkle",
                  isSelected ? "border-2 border-ll-ink bg-ll-butter shadow-[3px_3px_0_var(--color-ll-ink)]" : "",
                ].join(" ")}
                style={{ width: 166, scrollSnapAlign: "start" }}
              >
                <span className="mb-2 flex items-center justify-between gap-1 text-[11px] font-black">
                  <span className="truncate">
                    {getAccountIcon(acc.type)} {acc.name}
                  </span>
                  {isSelected && <span className="shrink-0 text-[9px] font-bold">선택됨</span>}
                </span>
                {hideOpeningBalance ? (
                  <span className="block text-[9px] text-ll-pencil">
                    현재 잔액
                    <b className="mt-0.5 block text-[11px] font-bold tabular-nums text-ll-ink">
                      {formatWon(findAmount(closingBalance, acc.id))}
                    </b>
                  </span>
                ) : (
                  <span className="grid grid-cols-2 gap-1.5">
                    <span className="block text-[9px] text-ll-pencil">
                      시작
                      <b className="mt-0.5 block text-[11px] font-bold tabular-nums text-ll-ink">
                        {formatWon(findAmount(openingBalance, acc.id))}
                      </b>
                    </span>
                    <span className="block text-[9px] text-ll-pencil">
                      {currentLabel}
                      <b className="mt-0.5 block text-[11px] font-bold tabular-nums text-ll-ink">
                        {formatWon(findAmount(closingBalance, acc.id))}
                      </b>
                    </span>
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
});

export default AccountBalanceShelf;
