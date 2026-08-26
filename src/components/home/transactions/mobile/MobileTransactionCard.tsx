"use client";

import { getTransactionColor, getTransactionSign } from "@/src/lib/transactionUtils";
import { ReceiptRow } from "@/src/components/ledger/ReceiptList";

interface MobileTransactionCardProps {
  transaction: Transaction;
  /** 전체 조회면 "", 특정 결제수단 조회면 그 계좌 id. */
  selectedAccountId: string;
  onClick: () => void;
  /** 검색·필터 결과 모드가 아닐 때만 true(QA_REVIEW_027 P1) — false면 거래 후 전체/계좌
   * 잔액, 이체의 출금 후/입금 후 잔액을 전부 감춘다. 이 시점에는 `transaction`의
   * `runningTotalBalance`/`runningAccountBalance`/`runningLinkedAccountBalance`도 애초에
   * 계산되지 않아 항상 `undefined`다(호출부 `TransactionPage.tsx` 참고) — 이 prop은 그
   * 사실을 UI에 명시적으로 드러낸다. */
  showRunningBalances: boolean;
}

const TRANSFER_CODES = new Set(["TRANSFER_EXPENSE", "TRANSFER_INCOME"]);
const SAVINGS_CODES = new Set(["SAVINGS_EXPENSE", "SAVINGS_INCOME"]);
const BALANCE_ADJUST_CODES = new Set(["BALANCE_ADJUST_EXPENSE", "BALANCE_ADJUST_INCOME"]);

const won = (n: number | undefined) => (n === undefined ? "-" : `${n.toLocaleString()}원`);

/**
 * 편하게 보기 거래 카드 — 유형별로 다른 정보 구조를 쓴다(IMPLEMENTATION_BRIEF_011 §8,
 * DECISION_011 §5). 이체·저축·잔액조정은 `transactionUtils`의 계좌-관점 색상 규칙을 그대로
 * 쓰지 않는다 — 특정 계좌를 보고 있을 때 그 규칙이 수입/지출처럼 초록/빨강으로 칠해버리면
 * "이체를 소비처럼 보이게 하지 않는다"는 원칙에 어긋난다. 대신 유형별 고정 색 + 라벨을 쓴다.
 */
export default function MobileTransactionCard({ transaction: t, selectedAccountId, onClick, showRunningBalances }: MobileTransactionCardProps) {
  const code = t.category?.code;
  const isTransfer = !!t.transferDetail && TRANSFER_CODES.has(code);
  const isSavings = !!t.transferDetail && SAVINGS_CODES.has(code);
  const isBalanceAdjust = !t.transferDetail && BALANCE_ADJUST_CODES.has(code);
  const isGlobalView = selectedAccountId === "";

  const categoryLabel = t.subcategory?.name ? `${t.category.name} > ${t.subcategory.name}` : t.category?.name;

  if (isTransfer || isSavings) {
    const detail = t.transferDetail!;
    const tag = isTransfer ? "이체" : "저축";
    const tagClass = isTransfer ? "bg-[#e3e8f6] text-[#42588f]" : "bg-[#d6eadf] text-[#287258]";

    // 전체 조회: 양쪽 계좌 러닝밸런스가 이미 계산돼 있다(출금측 EXPENSE row가 양쪽을 갖는다).
    // 특정 계좌 조회: 이 row 자체가 그 계좌 쪽 leg이므로 runningAccountBalance만 있다.
    const fromAfter = t.type === "EXPENSE" ? t.runningAccountBalance : t.runningLinkedAccountBalance;
    const toAfter = t.type === "EXPENSE" ? t.runningLinkedAccountBalance : t.runningAccountBalance;

    const scopedCaption = !isGlobalView
      ? t.account.id === detail.fromAccount.id
        ? "나간 돈"
        : "들어온 돈"
      : null;

    return (
      <ReceiptRow onClick={onClick} className="flex-col gap-1.5 px-3.5 py-3">
        <div className="flex w-full items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5">
            <span className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-black ${tagClass}`}>{tag}</span>
            <p className="truncate text-sm font-bold text-ll-ink">{t.description || tag}</p>
          </div>
          <b className="shrink-0 text-sm font-black tabular-nums text-ll-ink">{Math.abs(t.amount).toLocaleString()}원</b>
        </div>
        <p className="w-full text-[11px] text-ll-pencil">
          <b className="text-ll-ink">{detail.fromAccount.name}</b> → <b className="text-ll-ink">{detail.toAccount.name}</b>
        </p>
        <div className="flex w-full items-center justify-between gap-2 text-[10px] text-ll-pencil">
          {showRunningBalances && (
            <span>
              {fromAfter !== undefined && toAfter !== undefined
                ? `출금 후 ${won(fromAfter)} · 입금 후 ${won(toAfter)}`
                : `거래 후 ${won(t.runningAccountBalance)}`}
            </span>
          )}
          <em className={`shrink-0 not-italic font-semibold text-ll-periwinkle ${!showRunningBalances ? "ml-auto" : ""}`}>
            {scopedCaption ?? (isSavings ? "소비 아닌 자산 이동" : "전체 자산 변화 없음")}
          </em>
        </div>
      </ReceiptRow>
    );
  }

  if (isBalanceAdjust) {
    const sign = t.type === "EXPENSE" ? "-" : "+";
    return (
      <ReceiptRow onClick={onClick} className="flex-col gap-1.5 px-3.5 py-3">
        <div className="flex w-full items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5">
            <span className="shrink-0 rounded bg-ll-cream px-1.5 py-0.5 text-[9px] font-black text-ll-ink">잔액 조정</span>
            <p className="truncate text-sm font-bold text-ll-ink">{t.account?.name}</p>
          </div>
          <b className="shrink-0 text-sm font-black tabular-nums text-ll-ink">
            {sign}
            {Math.abs(t.amount).toLocaleString()}원
          </b>
        </div>
        <div className="flex w-full items-center justify-between gap-2 text-[10px] text-ll-pencil">
          <span>실제 잔액에 맞춤</span>
          {showRunningBalances && <span>조정 후 {won(t.runningAccountBalance)}</span>}
        </div>
      </ReceiptRow>
    );
  }

  // 일반 수입·지출 — 기존 transactionUtils 부호/색 규칙 재사용(§8).
  const sign = getTransactionSign(t, selectedAccountId || undefined);
  const colorClass = getTransactionColor(t, selectedAccountId || undefined);

  return (
    <ReceiptRow onClick={onClick} className="flex-col gap-1.5 px-3.5 py-3">
      <div className="flex w-full items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="shrink-0 rounded bg-sky-100 px-1.5 py-0.5 text-[9px] font-black text-sky-700">
            {categoryLabel}
          </span>
          <p className="truncate text-sm font-bold text-ll-ink">{t.description || "메모 없음"}</p>
        </div>
        <b className={`shrink-0 text-sm font-black tabular-nums ${colorClass}`}>
          {sign}
          {Math.abs(t.amount).toLocaleString()}원
        </b>
      </div>
      <div className="flex w-full items-center justify-between gap-2 text-[10px] text-ll-pencil">
        <span className="truncate">{t.account?.name}</span>
        {showRunningBalances && (
          <span className="shrink-0 text-right">
            계좌 거래 후 {won(t.runningAccountBalance)}
            {isGlobalView && t.runningTotalBalance !== undefined && (
              <>
                <br />
                전체 거래 후 {won(t.runningTotalBalance)}
              </>
            )}
          </span>
        )}
      </div>
    </ReceiptRow>
  );
}
