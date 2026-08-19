"use client";

import { useMemo, useRef } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { getRecentTransactions } from "@/src/lib/api/dashboard/recent";
import { getTransactionColor, getTransactionSign } from "@/src/lib/transactionUtils";
import DeskObjectSheet from "./DeskObjectSheet";
import { useAuthErrorRedirect } from "@/src/hook/useAuthErrorRedirect";

const DESKTOP_LIMIT = 10;
const CLOSED_PREVIEW = 2;
const OPEN_PREVIEW = 5;

interface ReceiptStackProps {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  onQuickRecord: () => void;
}

function describeTransaction(t: Transaction) {
  if (t.description) return t.description;
  return t.category?.name || "메모 없음";
}

function accountLabel(t: Transaction) {
  if (t.transferDetail) {
    return `${t.transferDetail.fromAccount.name} → ${t.transferDetail.toAccount.name}`;
  }
  return t.account?.name ?? "";
}

/**
 * 책상 위 "영수증 묶음" — 데스크톱이 쓰는 10건 응답(`["recentTransactions"]`, 같은 query
 * key라 캐시 공유)을 그대로 재사용하고 모바일에서만 앞부분을 slice한다(§9).
 */
export default function ReceiptStack({ isOpen, onOpen, onClose, onQuickRecord }: ReceiptStackProps) {
  // QA_REVIEW_021 P2-2 / QA_REVIEW_022: 빈 상태에서 "빠르게 기록하기"를 누르면 영수증
  // sheet가 열린 채로 GlobalQuickAdd의 quick modal이 그 위에 열려, 포스트잇과 같은 중첩
  // dialog Escape 문제가 생겼다. 이 sheet에는(포스트잇과 달리) quick modal이 열린 상태를
  // 알려줄 통로가 없으므로 `hasNestedDialog`로 공유하는 대신, 애초에 두 레이어가 동시에
  // 존재하지 않도록 sheet를 먼저 닫고 그 history entry가 **실제로** 해소된 뒤에만 quick
  // modal을 연다 — `setTimeout`으로 시점을 추정하면 `history.back()`이 늦게 끝나는 기기에서
  // quick modal의 history push까지 되돌아가는 경쟁 조건이 생길 수 있어(QA_REVIEW_022),
  // `DeskObjectSheet`가 실제 popstate를 보고 알려주는 `onAfterHistoryClose`를 쓴다.
  const pendingQuickRecordRef = useRef(false);

  const handleEmptyStateQuickRecord = () => {
    if (pendingQuickRecordRef.current) return; // 연타로 두 번 여는 것 방지
    pendingQuickRecordRef.current = true;
    onClose();
  };

  const handleAfterHistoryClose = () => {
    if (!pendingQuickRecordRef.current) return; // 일반적인 닫기(닫기버튼/backdrop/Escape 등)는 무시
    pendingQuickRecordRef.current = false;
    onQuickRecord();
  };

  const {
    data: transactions = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["recentTransactions"],
    queryFn: () => getRecentTransactions(DESKTOP_LIMIT),
  });
  useAuthErrorRedirect(error);

  const closedPreview = useMemo(() => transactions.slice(0, CLOSED_PREVIEW), [transactions]);
  const openPreview = useMemo(() => transactions.slice(0, OPEN_PREVIEW), [transactions]);
  const hasData = transactions.length > 0;

  return (
    <>
      {isError ? (
        <div className="relative col-span-2 min-h-[128px] border-x-2 border-ll-ink bg-ll-paper p-4 shadow-[4px_5px_0_rgba(32,40,58,0.2)]">
          <span className="text-sm font-extrabold text-ll-ink">최근 영수증</span>
          <p className="mt-2 text-sm text-ll-ink/70">최근 기록을 불러오지 못했어요</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-2 min-h-[32px] text-xs font-bold underline"
          >
            다시 시도
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={onOpen}
          aria-haspopup="dialog"
          className="relative col-span-2 min-h-[128px] border-x-2 border-ll-ink bg-ll-paper p-4 text-left shadow-[4px_5px_0_rgba(32,40,58,0.2)] transition-transform active:translate-y-0.5 focus-visible:outline focus-visible:outline-3 focus-visible:outline-ll-periwinkle focus-visible:outline-offset-4"
        >
          <div className="flex items-center justify-between border-b border-dashed border-ll-ink/25 pb-2 text-[13px] font-extrabold text-ll-ink">
            <span>최근 영수증</span>
            {hasData && <span>{transactions.length}건</span>}
          </div>

          {isLoading ? (
            <div className="mt-2.5 space-y-2" aria-hidden="true">
              <div className="h-3 w-full animate-pulse rounded bg-ll-ink/10" />
              <div className="h-3 w-3/4 animate-pulse rounded bg-ll-ink/10" />
            </div>
          ) : !hasData ? (
            <p className="mt-2.5 text-xs text-ll-pencil break-keep">첫 기록이 영수증으로 모여요</p>
          ) : (
            closedPreview.map((t) => (
              <div key={t.id} className="mt-2 flex items-center justify-between gap-3 text-[11px]">
                <span className="truncate text-ll-ink/85">{describeTransaction(t)}</span>
                <b className={`shrink-0 tabular-nums ${getTransactionColor(t)}`}>
                  {getTransactionSign(t)}
                  {Math.abs(t.amount).toLocaleString()}원
                </b>
              </div>
            ))
          )}
        </button>
      )}

      <DeskObjectSheet
        open={isOpen}
        onClose={onClose}
        titleId="desk-sheet-receipt-title"
        title="최근 영수증"
        description={hasData ? `최근에 남긴 기록 ${transactions.length}건이에요.` : "아직 기록이 없어요."}
        toneClassName="bg-ll-paper"
        onAfterHistoryClose={handleAfterHistoryClose}
      >
        {isError ? (
          <div className="py-6 text-center">
            <p className="text-sm text-ll-ink/70">최근 기록을 불러오지 못했어요.</p>
            <button
              type="button"
              onClick={() => refetch()}
              className="mt-3 min-h-[44px] rounded-full border-2 border-ll-ink px-4 text-sm font-bold"
            >
              다시 시도
            </button>
          </div>
        ) : !hasData ? (
          <div className="py-6 text-center">
            <p className="text-sm text-ll-ink/70 break-keep">첫 기록이 영수증으로 모여요</p>
            <button
              type="button"
              onClick={handleEmptyStateQuickRecord}
              className="mt-4 min-h-[50px] w-full rounded-2xl bg-ll-tomato text-sm font-extrabold text-white"
            >
              빠르게 기록하기
            </button>
          </div>
        ) : (
          <>
            <div className="border-t-2 border-ll-ink">
              {openPreview.map((t) => (
                <div
                  key={t.id}
                  className="grid min-h-[56px] grid-cols-[1fr_auto] items-center gap-3 border-b border-ll-ink/20 py-2"
                >
                  <div className="min-w-0">
                    <strong className="block truncate text-sm font-semibold text-ll-ink">
                      {describeTransaction(t)}
                    </strong>
                    <small className="mt-0.5 block truncate text-[11px] text-ll-pencil">
                      {t.date} · {accountLabel(t)}
                    </small>
                  </div>
                  <b className={`text-[13px] font-extrabold tabular-nums ${getTransactionColor(t)}`}>
                    {getTransactionSign(t)}
                    {Math.abs(t.amount).toLocaleString()}원
                  </b>
                </div>
              ))}
            </div>
            <Link
              href="/home/transactions"
              className="mt-4 flex min-h-[50px] w-full items-center justify-center rounded-2xl bg-ll-ink text-sm font-extrabold text-ll-paper"
            >
              전체 내역 보기
            </Link>
          </>
        )}
      </DeskObjectSheet>
    </>
  );
}
