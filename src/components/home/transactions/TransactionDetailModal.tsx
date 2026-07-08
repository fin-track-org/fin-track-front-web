"use client";

import { useEffect, useRef } from "react";
import { X, Pencil, Trash2 } from "lucide-react";
import { getTransactionColor, getTransactionSign, getAccountIcon } from "@/src/lib/transactionUtils";

function formatDateFriendly(dateStr: string) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;

  const days = ["일", "월", "화", "수", "목", "금", "토"];
  const month = d.getMonth() + 1;
  const date = d.getDate();
  const day = days[d.getDay()];

  return `${month}월 ${date}일 (${day})`;
}

interface Props {
  transaction: Transaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (t: Transaction) => void;
  onDelete: (id: string) => void;
  currentAccountId?: string;
}

export default function TransactionDetailModal({
  transaction,
  open,
  onOpenChange,
  onEdit,
  onDelete,
  currentAccountId,
}: Props) {
  // AddTransactionModal과 동일한 뒤로가기(popstate) 처리 패턴
  const isPopStateTriggered = useRef(false);
  const onOpenChangeRef = useRef(onOpenChange);
  const isOpenRef = useRef(open);

  useEffect(() => {
    onOpenChangeRef.current = onOpenChange;
  }, [onOpenChange]);

  useEffect(() => {
    isOpenRef.current = open;
  }, [open]);

  useEffect(() => {
    if (open) {
      isPopStateTriggered.current = false;

      if (window.history.state?.modal !== "TransactionDetailModal") {
        window.history.pushState({ modal: "TransactionDetailModal" }, "", window.location.href);
      }

      const handlePopState = () => {
        isPopStateTriggered.current = true;
        onOpenChangeRef.current(false);
      };

      window.addEventListener("popstate", handlePopState);

      return () => {
        window.removeEventListener("popstate", handlePopState);
        if (!isPopStateTriggered.current) {
          setTimeout(() => {
            if (!isOpenRef.current && window.history.state?.modal === "TransactionDetailModal") {
              window.history.back();
            }
          }, 50);
        }
      };
    }
  }, [open]);

  if (!open || !transaction) return null;

  const sign = getTransactionSign(transaction as any, currentAccountId);
  const colorClass = getTransactionColor(transaction as any, currentAccountId);
  const amountAbs = Math.abs(transaction.amount).toLocaleString();
  const canEdit =
    transaction.category?.code !== "BALANCE_ADJUST_EXPENSE" &&
    transaction.category?.code !== "BALANCE_ADJUST_INCOME";

  return (
    <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center">
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />

      <div className="relative w-full sm:max-w-md mx-auto bg-white rounded-t-[1.75rem] sm:rounded-2xl shadow-[0_-8px_30px_rgba(0,0,0,0.12)] p-5 sm:p-6 pb-[calc(1rem+env(safe-area-inset-bottom))] flex flex-col animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:fade-in-0 duration-300 max-h-[85dvh]">
        {/* 모바일 손잡이 */}
        <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-5 sm:hidden" />

        <div className="flex items-center justify-between pb-1">
          <h2 className="text-xl font-bold text-gray-800">거래 상세</h2>
          <button
            onClick={() => onOpenChange(false)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="닫기"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-5 mt-4">
          {/* 금액 */}
          <div className="text-center py-3">
            <p className="text-sm text-gray-500 mb-1">{formatDateFriendly(transaction.date)}</p>
            <p className={`text-3xl font-extrabold ${colorClass}`}>
              {sign}{amountAbs}원
            </p>
          </div>

          {/* 카테고리 / 메모 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">카테고리</span>
              <span className="inline-flex items-center font-medium bg-sky-100 text-sky-700 px-2 py-0.5 rounded-full text-xs">
                {transaction.subcategory?.name
                  ? `${transaction.category.name} > ${transaction.subcategory.name}`
                  : transaction.category.name}
              </span>
            </div>

            {transaction.description && (
              <div className="flex items-start justify-between text-sm gap-4">
                <span className="text-gray-500 shrink-0">메모</span>
                <span className="text-gray-800 text-right break-words">{transaction.description}</span>
              </div>
            )}

            {/* 계좌 / 이체 정보 */}
            {transaction.transferDetail ? (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">계좌</span>
                <div className="flex items-center gap-1.5 text-right">
                  <span className="rounded bg-gray-100 px-1.5 py-0.5 text-gray-700 font-medium text-xs">
                    {getAccountIcon(transaction.transferDetail.fromAccount.type)} {transaction.transferDetail.fromAccount.name}
                  </span>
                  <span className="text-gray-400 text-xs">→</span>
                  <span className="rounded bg-sky-50 px-1.5 py-0.5 text-sky-700 font-medium text-xs">
                    {getAccountIcon(transaction.transferDetail.toAccount.type)} {transaction.transferDetail.toAccount.name}
                  </span>
                </div>
              </div>
            ) : (
              transaction.account?.name && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">결제수단</span>
                  <span className="rounded bg-gray-100 px-1.5 py-0.5 text-gray-700 font-medium text-xs">
                    {getAccountIcon(transaction.account.type)} {transaction.account.name}
                  </span>
                </div>
              )
            )}

            {transaction.runningTotalBalance !== undefined && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">거래 후 총 잔액</span>
                <span className="font-semibold text-gray-800">
                  {transaction.runningTotalBalance.toLocaleString()}원
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 액션 */}
        <div className="flex gap-2.5 pt-4 mt-auto">
          <button
            onClick={() => onDelete(transaction.id)}
            className="flex-1 h-12 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 font-bold text-sm flex items-center justify-center gap-1.5"
          >
            <Trash2 size={16} /> 삭제
          </button>
          {canEdit && (
            <button
              onClick={() => onEdit(transaction)}
              className="flex-[2] h-12 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-sm flex items-center justify-center gap-1.5"
            >
              <Pencil size={16} /> 수정
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
