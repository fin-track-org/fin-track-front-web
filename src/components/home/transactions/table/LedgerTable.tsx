"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import {
  DndContext,
  closestCenter,
  DragEndEvent,
  MouseSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { restrictToVerticalAxis, restrictToParentElement } from "@dnd-kit/modifiers";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, CreditCard } from "lucide-react";
import LedgerRow from "./LedgerRow";
import SkeletonRow from "../SkeletonRow";
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
  transactions: Transaction[];
  loading: boolean;
  error: string | null;
  onEdit: (t: Transaction) => void;
  onDelete: (id: string) => void;
  onReorder: (transactionIds: string[]) => void;
  currentAccountId?: string;
  isExcelView?: boolean;
  openingBalanceAmount?: number;
}

/* ────────────────────────── Sortable wrappers ────────────────────────── */

function SortableLedgerRow({
  transaction,
  onEdit,
  onDelete,
  currentAccountId,
  isExcelView,
}: {
  transaction: Transaction;
  onEdit: (t: Transaction) => void;
  onDelete: (id: string) => void;
  currentAccountId?: string;
  isExcelView?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: transaction.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : undefined,
    backgroundColor: isDragging ? "#f0f9ff" : undefined,
    position: "relative",
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <LedgerRow
      ref={setNodeRef}
      style={style}
      transaction={transaction}
      onEdit={onEdit}
      onDelete={onDelete}
      currentAccountId={currentAccountId}
      dragHandleAttributes={attributes}
      dragHandleListeners={listeners}
      isExcelView={isExcelView}
    />
  );
}

function SortableMobileCard({
  transaction,
  onEdit,
  onDelete,
  isExcelView,
  currentAccountId,
}: {
  transaction: Transaction;
  onEdit: (t: Transaction) => void;
  onDelete: (id: string) => void;
  isExcelView?: boolean;
  currentAccountId?: string;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: transaction.id });

  const amountAbs = Math.abs(transaction.amount).toLocaleString();

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="rounded-lg border bg-white p-2.5 sm:p-3 shadow-sm flex gap-2"
    >
      {/* 드래그 핸들 */}
      <button
        {...attributes}
        {...listeners}
        className="shrink-0 cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-400 self-center"
        style={{ touchAction: 'pan-y' }}
        title="드래그하여 순서 변경"
        aria-label="순서 변경"
      >
        <GripVertical className="w-5 h-5" />
      </button>

      <div className="flex flex-1 items-start justify-between gap-2 min-w-0">
        <div className="min-w-0 pt-0.5 flex-1">
          <div className="flex items-center gap-2">
            <span className="shrink-0 rounded bg-sky-100 text-sky-700 px-1.5 py-0.5 text-[11px] font-medium">
              {transaction.subcategory?.name 
                ? `${transaction.category.name} > ${transaction.subcategory.name}` 
                : transaction.category.name}
            </span>
            <p className="font-semibold text-[14px] text-gray-800 truncate">{transaction.description}</p>
          </div>
          <div className="mt-1 flex flex-wrap gap-1.5 text-[11px]">
            {transaction.transferDetail ? (
              <div className="flex flex-wrap items-center gap-1 mt-0.5 text-[10px]">
                <span className="flex items-center gap-1 rounded bg-gray-100 px-1.5 py-0.5 text-gray-600 font-medium border border-gray-200">
                  <span>{getAccountIcon(transaction.transferDetail.fromAccount.type)}</span>
                  {transaction.transferDetail.fromAccount.name}
                  {transaction.type === "EXPENSE" && transaction.runningAccountBalance !== undefined ? ` (잔액: ${transaction.runningAccountBalance.toLocaleString()}원)` : ""}
                  {transaction.type === "INCOME" && transaction.runningLinkedAccountBalance !== undefined ? ` (잔액: ${transaction.runningLinkedAccountBalance.toLocaleString()}원)` : ""}
                </span>
                <div className="flex items-center gap-1">
                  <span className="text-gray-400 text-[9px]">▶</span>
                  <span className="flex items-center gap-1 rounded bg-sky-50 px-1.5 py-0.5 text-sky-700 font-medium border border-sky-100">
                    <span>{getAccountIcon(transaction.transferDetail.toAccount.type)}</span>
                    {transaction.transferDetail.toAccount.name}
                    {transaction.type === "EXPENSE" && transaction.runningLinkedAccountBalance !== undefined ? ` (잔액: ${transaction.runningLinkedAccountBalance.toLocaleString()}원)` : ""}
                    {transaction.type === "INCOME" && transaction.runningAccountBalance !== undefined ? ` (잔액: ${transaction.runningAccountBalance.toLocaleString()}원)` : ""}
                  </span>
                </div>
              </div>
            ) : (
              transaction.account?.name && (
                <span className="flex items-center gap-1 rounded bg-gray-100 px-1.5 py-0.5 text-gray-700 font-medium">
                  <span>{getAccountIcon(transaction.account.type)}</span>
                  {transaction.account.name}
                  {transaction.runningAccountBalance !== undefined ? ` (잔액: ${transaction.runningAccountBalance.toLocaleString()}원)` : ""}
                </span>
              )
            )}
          </div>
        </div>

        <div className="shrink-0 text-right">
          {(() => {
            const sign = getTransactionSign(transaction as any, currentAccountId);
            const colorClass = getTransactionColor(transaction as any, currentAccountId);
            return (
              <div className="flex items-center justify-end gap-1.5">
                <span className={`text-[13px] font-bold ${colorClass}`}>
                  {sign}{amountAbs}원
                </span>
                <span className="text-gray-300 text-[11px]">|</span>
                <span className="text-[10px] text-gray-500 font-medium">
                  총 {transaction.runningTotalBalance?.toLocaleString() ?? "-"}원
                </span>
              </div>
            );
          })()}

          <div className="mt-1.5 flex justify-end gap-1.5">
            <button
              onClick={() => onEdit(transaction)}
              className="rounded-md bg-gray-100 px-2.5 py-1 text-[11px] font-medium hover:bg-gray-200"
            >
              수정
            </button>
            <button
              onClick={() => onDelete(transaction.id)}
              className="rounded-md bg-red-50 px-2.5 py-1 text-[11px] font-medium text-red-600 hover:bg-red-100"
            >
              삭제
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────── Main component ────────────────────────── */

export default function LedgerTable({
  transactions,
  loading,
  error,
  onEdit,
  onDelete,
  onReorder,
  currentAccountId,
  isExcelView = true,
  openingBalanceAmount = 0,
}: Props) {
  const [localTransactions, setLocalTransactions] =
    useState<Transaction[]>(transactions);

  // Per-date debounce timers
  const debounceRefs = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Sync local state when server data changes
  useEffect(() => {
    setLocalTransactions(transactions);
  }, [transactions]);

  // Group by date, preserving ascending order
  const groupedByDate = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    for (const t of localTransactions) {
      if (!map.has(t.date)) map.set(t.date, []);
      map.get(t.date)!.push(t);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [localTransactions]);

  // Calculate statistics for the visible period
  const stats = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const t of localTransactions) {
      const sign = getTransactionSign(t as any, currentAccountId);
      if (sign === "+") income += Math.abs(t.amount);
      else if (sign === "-") expense += Math.abs(t.amount);
    }
    // Final balance is the balance of the most recent transaction (which is at the end of the array since it's sorted ASC)
    const finalBalance = localTransactions.length > 0 ? localTransactions[localTransactions.length - 1].runningTotalBalance : undefined;
    return { income, expense, finalBalance };
  }, [localTransactions, currentAccountId]);

  const handleDragEnd = (event: DragEndEvent, date?: string) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const draggedItem = localTransactions.find((t) => t.id === active.id);
    if (!draggedItem) return;

    const targetDate = date || draggedItem.date;
    const dateItems = localTransactions.filter((t) => t.date === targetDate);

    // Prevent dragging between different dates
    const overItem = localTransactions.find((t) => t.id === over.id);
    if (overItem && overItem.date !== targetDate) return;

    const oldIndex = dateItems.findIndex((t) => t.id === active.id);
    const newIndex = dateItems.findIndex((t) => t.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(dateItems, oldIndex, newIndex);
    const reorderedIds = reordered.map((t) => t.id);

    // Optimistic update
    setLocalTransactions((prev) => {
      const result: Transaction[] = [];
      let inserted = false;
      for (const t of prev) {
        if (t.date === targetDate) {
          if (!inserted) {
            result.push(...reordered);
            inserted = true;
          }
        } else {
          result.push(t);
        }
      }
      return result;
    });

    // Debounced API call (1.5s after last drag in this date group)
    const existing = debounceRefs.current.get(targetDate);
    if (existing) clearTimeout(existing);
    debounceRefs.current.set(
      targetDate,
      setTimeout(() => {
        onReorder(reorderedIds);
        debounceRefs.current.delete(targetDate);
      }, 1500),
    );
  };

  return (
    <>
      {/* ✅ 모바일: 카드 (엑셀 뷰가 아닐 때만 노출) */}
      <div className={`${isExcelView ? "hidden" : "md:hidden"} space-y-2.5`}>
        {loading &&
          Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border bg-white p-4 animate-pulse h-24"
            />
          ))}

        {!loading && error && (
          <div className="py-12 flex flex-col items-center text-center">
            <p className="text-red-500 font-medium mb-2">
              데이터를 불러오지 못했어요
            </p>
            <p className="text-sm text-gray-500 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 text-sm"
            >
              다시 시도
            </button>
          </div>
        )}

        {!loading && !error && localTransactions.length === 0 && (
          <div className="py-12 text-center text-gray-400 bg-white border border-gray-100 rounded-xl shadow-sm">
            <p className="mb-1">거래 내역이 없습니다</p>
            <p className="text-sm">새 거래를 추가해보세요 ✨</p>
          </div>
        )}

        {!loading &&
          !error &&
          groupedByDate.map(([date, items]) => (
            <div key={date} className="pt-1">
              <p className="text-xs font-semibold text-gray-500 mb-1 px-1 tracking-tight">
                {formatDateFriendly(date)}
              </p>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={(e) => handleDragEnd(e, date)}
                modifiers={[restrictToVerticalAxis, restrictToParentElement]}
              >
                <SortableContext
                  items={items.map((t) => t.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-1.5">
                    {items.map((t) => (
                      <SortableMobileCard
                        key={t.id}
                        transaction={t}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        currentAccountId={currentAccountId}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          ))}

        {/* 모바일 뷰 통계 요약 카드 */}
        {!loading && !error && localTransactions.length > 0 && (
          <div className="mt-4 p-3.5 rounded-xl border border-gray-200 bg-gray-50 flex flex-col gap-1.5 shadow-sm">
            <h3 className="text-[11px] font-bold text-gray-500 uppercase mb-0.5">현재 기간 합계</h3>
            <div className="flex justify-between items-center text-[13px]">
              <span className="text-gray-600 font-medium">시작 잔액</span>
              <span className="font-semibold text-gray-900">{openingBalanceAmount.toLocaleString()}원</span>
            </div>
            <div className="flex justify-between items-center text-[13px]">
              <span className="text-gray-600 font-medium">총 수입</span>
              <span className="font-semibold text-blue-600">+{stats.income.toLocaleString()}원</span>
            </div>
            <div className="flex justify-between items-center text-[13px]">
              <span className="text-gray-600 font-medium">총 지출</span>
              <span className="font-semibold text-red-600">-{stats.expense.toLocaleString()}원</span>
            </div>
            <div className="h-px bg-gray-200 my-1.5" />
            <div className="flex justify-between items-center">
              <span className="text-gray-700 font-semibold text-[13px]">최종 잔액</span>
              <span className="font-bold text-gray-900 text-[14px]">{stats.finalBalance !== undefined ? `${stats.finalBalance.toLocaleString()}원` : "-"}</span>
            </div>
          </div>
        )}
      </div>

      {/* ✅ 데스크탑/공통: 테이블 (엑셀 뷰일 땐 모바일에서도 노출) */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        modifiers={[restrictToVerticalAxis, restrictToParentElement]}
      >
        <div className={`${isExcelView ? "block" : "hidden md:block"} bg-white overflow-x-auto border-x border-b border-gray-200`}>
          <table className={`w-full ${isExcelView ? "md:min-w-full min-w-max border-collapse border border-gray-300 text-xs md:text-sm" : "min-w-full"}`}>
            <thead className={`sticky top-0 z-30 ${isExcelView ? "bg-[#f3f4f6] text-gray-700 shadow-sm" : "bg-gray-50 text-gray-500 text-sm shadow-sm"}`}>
              <tr>
                <th className={`${isExcelView ? "border border-gray-300 px-1 md:px-2 py-1.5 md:py-2 w-6 md:w-8 text-center" : "px-3 py-3 w-8"} text-[10px] md:text-xs font-semibold uppercase hidden md:table-cell`}>#</th>
                <th className={`${isExcelView ? "border border-gray-300 px-1 md:px-4 py-1.5 md:py-2 text-center" : "px-6 py-3 text-left"} text-[10px] md:text-xs font-semibold uppercase hidden md:table-cell`}>날짜</th>
                <th className={`${isExcelView ? "border border-gray-300 px-1 md:px-4 py-1.5 md:py-2 text-center whitespace-nowrap" : "px-6 py-3 text-left"} text-[10px] md:text-xs font-semibold uppercase`}>카테고리</th>
                <th className={`${isExcelView ? "border border-gray-300 px-1 md:px-4 py-1.5 md:py-2 text-center w-auto md:w-[150px]" : "px-6 py-3 text-left"} text-[10px] md:text-xs font-semibold uppercase`}>설명</th>
                <th className={`${isExcelView ? "border border-gray-300 px-1 md:px-4 py-1.5 md:py-2 text-center whitespace-nowrap" : "px-6 py-3 text-right"} text-[10px] md:text-xs font-semibold uppercase text-blue-600`}>수입</th>
                <th className={`${isExcelView ? "border border-gray-300 px-1 md:px-4 py-1.5 md:py-2 text-center whitespace-nowrap" : "px-6 py-3 text-right"} text-[10px] md:text-xs font-semibold uppercase text-red-600`}>지출</th>
                <th className={`${isExcelView ? "border border-gray-300 px-1 md:px-4 py-1.5 md:py-2 text-center whitespace-nowrap" : "px-6 py-3 text-right"} text-[10px] md:text-xs font-semibold uppercase text-gray-700`}>거래 후 잔액</th>
                <th className={`${isExcelView ? "border border-gray-300 px-1 md:px-4 py-1.5 md:py-2 text-center whitespace-nowrap" : "px-6 py-3 text-right"} text-[10px] md:text-xs font-semibold uppercase text-sky-700`}>계좌 잔액</th>
                <th className={`${isExcelView ? "border border-gray-300 px-1 md:px-4 py-1.5 md:py-2 text-center whitespace-nowrap" : "px-6 py-3 text-left"} text-[10px] md:text-xs font-semibold uppercase`}>결제수단</th>
                <th className={`${isExcelView ? "border border-gray-300 px-1 md:px-2 py-1.5 md:py-2 text-center whitespace-nowrap" : "px-6 py-3"} text-[10px] md:text-xs font-semibold uppercase`}>관리</th>
              </tr>
            </thead>

            {loading && (
              <tbody>
                {Array.from({ length: 6 }).map((_, i) => (
                  <SkeletonRow key={i} />
                ))}
              </tbody>
            )}

            {!loading && error && (
              <tbody>
                <tr>
                  <td colSpan={10}>
                    <div className="py-12 flex flex-col items-center text-center">
                      <p className="text-red-500 font-medium mb-2">
                        데이터를 불러오지 못했어요
                      </p>
                      <p className="text-sm text-gray-500 mb-4">{error}</p>
                      <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 text-sm"
                      >
                        다시 시도
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            )}

            {!loading && !error && localTransactions.length === 0 && (
              <tbody>
                <tr>
                  <td colSpan={10}>
                    <div className="py-12 text-center text-gray-400">
                      <p className="mb-1">거래 내역이 없습니다</p>
                      <p className="text-sm">새 거래를 추가해보세요 ✨</p>
                    </div>
                  </td>
                </tr>
              </tbody>
            )}

            {!loading && !error && (
              <>

                {groupedByDate.map(([date, items]) => (
                  <tbody key={date}>
                    <tr>
                      <td
                        colSpan={8}
                        className={`md:hidden ${isExcelView ? "border border-gray-300 py-1.5 bg-[#f3f4f6] text-xs font-bold text-gray-500 text-left pl-8" : "py-2 bg-gray-50 text-[13px] font-bold text-gray-600 border-t border-b border-gray-100 text-left pl-8"}`}
                      >
                        {formatDateFriendly(date)}
                      </td>
                      <td
                        colSpan={10}
                        className={`hidden md:table-cell ${isExcelView ? "border border-gray-300 py-1.5 bg-[#f3f4f6] text-xs font-bold text-gray-500 text-left pl-[180px]" : "py-2 bg-gray-50 text-[13px] font-bold text-gray-600 border-t border-b border-gray-100 text-left pl-[180px]"}`}
                      >
                        {formatDateFriendly(date)}
                      </td>
                    </tr>
                    <SortableContext
                      items={items.map((t) => t.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {items.map((t) => (
                        <SortableLedgerRow
                          key={t.id}
                          transaction={t}
                          onEdit={onEdit}
                          onDelete={onDelete}
                          isExcelView={isExcelView}
                        />
                      ))}
                    </SortableContext>
                  </tbody>
                ))}

                <tfoot>
                  <tr>
                    <td colSpan={2} className={`${isExcelView ? "border border-gray-300 px-4 py-2" : "px-6 py-3"} text-center font-bold text-gray-700 bg-gray-100 hidden md:table-cell`}>
                      현재 기간 합계
                    </td>
                    <td colSpan={2} className={`${isExcelView ? "border border-gray-300 px-4 py-2" : "px-6 py-3"} text-center font-bold text-gray-700 bg-gray-100 md:hidden`}>
                      합계
                    </td>
                    <td className={`${isExcelView ? "border border-gray-300 px-1 md:px-4 py-2" : "px-6 py-3"} text-right font-semibold text-gray-800 bg-gray-50/50`}>
                      <span className="text-[10px] text-gray-500 block">시작 잔액</span>
                      {openingBalanceAmount.toLocaleString()}원
                    </td>
                    <td className={`${isExcelView ? "border border-gray-300 px-1 md:px-4 py-2" : "px-6 py-3"} text-right font-semibold text-blue-600 bg-blue-50/50`}>
                      <span className="text-[10px] text-blue-400 block">총 수입</span>
                      +{stats.income.toLocaleString()}원
                    </td>
                    <td className={`${isExcelView ? "border border-gray-300 px-1 md:px-4 py-2" : "px-6 py-3"} text-right font-semibold text-red-600 bg-red-50/50`}>
                      <span className="text-[10px] text-red-400 block">총 지출</span>
                      -{stats.expense.toLocaleString()}원
                    </td>
                    <td className={`${isExcelView ? "border border-gray-300 px-1 md:px-4 py-2" : "px-6 py-3"} text-right font-bold text-gray-800 bg-gray-100`}>
                      <span className="text-[10px] text-gray-500 block">최종 잔액</span>
                      {stats.finalBalance !== undefined ? `${stats.finalBalance.toLocaleString()}원` : "-"}
                    </td>
                    <td colSpan={3} className={`${isExcelView ? "border border-gray-300 px-4 py-2" : "px-6 py-3"} bg-gray-100`}></td>
                  </tr>
                </tfoot>
              </>
            )}
          </table>
        </div>
      </DndContext>
    </>
  );
}

