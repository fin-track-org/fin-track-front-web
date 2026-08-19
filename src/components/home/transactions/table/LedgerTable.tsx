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
import { GripVertical, Pencil, Trash2 } from "lucide-react";
import LedgerRow from "./LedgerRow";
import SkeletonRow from "../SkeletonRow";
import { getTransactionColor, getTransactionSign, getAccountIcon } from "@/src/lib/transactionUtils";
import { ReceiptCard, ReceiptRow, DateTape } from "@/src/components/ledger/ReceiptList";
import { StatePanel } from "@/src/components/ledger/StatePanel";

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
  onViewDetail?: (t: Transaction) => void;
  currentAccountId?: string;
  isExcelView?: boolean;
  openingBalanceAmount?: number;
  /** false면 거래 후 잔액 관련 열/텍스트를 전부 "—"로 표시한다(QA_REVIEW_027 P1 — 검색·필터
   * 결과에는 이미 이 값이 계산되지 않은 채로 들어온다, 기본값 true로 데스크톱은 영향 없음). */
  showRunningBalances?: boolean;
  /** false면 드래그 핸들을 숨기고 drag-and-drop 순서 변경을 막는다(QA_REVIEW_028 P1 —
   * 검색·필터 결과에는 같은 날짜의 일부 거래만 담길 수 있어, 그 배열의 id만으로 순서를
   * 바꾸면 화면에 없는 같은 날짜 거래가 서버에서 밀려날 위험이 있다). 기본값 true로
   * 일반 장부 엑셀은 영향 없음. */
  allowReorder?: boolean;
  /** 모바일 엑셀 헤더의 동적 sticky 위치(px, IMPLEMENTATION_BRIEF_013 §4). 데스크톱 호출부는
   * 이 prop 자체를 넘기지 않는다(`undefined`) — 그러면 기존 `sticky top-0 z-30` 동작이 완전히
   * 그대로 유지된다. 모바일 호출부는 항상 값을 넘긴다: 아직 측정 전이면 `null`(헤더를 일시
   * 비고정 상태로 둬 `top:0` 깜빡임을 막는다), 측정됐으면 실제 px 숫자(잔액 선반 실제 하단
   * offset)를 넘긴다. */
  mobileStickyHeaderTop?: number | null;
}

/* ────────────────────────── Sortable wrappers ────────────────────────── */

function SortableLedgerRow({
  transaction,
  onEdit,
  onDelete,
  currentAccountId,
  isExcelView,
  showRunningBalances,
  allowReorder = true,
}: {
  transaction: Transaction;
  onEdit: (t: Transaction) => void;
  onDelete: (id: string) => void;
  currentAccountId?: string;
  isExcelView?: boolean;
  showRunningBalances?: boolean;
  allowReorder?: boolean;
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
      // 검색 결과에서는 handle 자체를 렌더링하지 않고(showDragHandle) dnd-kit 리스너도
      // 아예 붙이지 않는다 — 드래그를 시작할 수 있는 요소가 화면에 존재하지 않게 한다.
      dragHandleAttributes={allowReorder ? attributes : undefined}
      dragHandleListeners={allowReorder ? listeners : undefined}
      showDragHandle={allowReorder}
      isExcelView={isExcelView}
      showRunningBalances={showRunningBalances}
    />
  );
}

function SortableMobileCard({
  transaction,
  onEdit,
  onDelete,
  onViewDetail,
  isExcelView,
  currentAccountId,
  showRunningBalances = true,
  allowReorder = true,
}: {
  transaction: Transaction;
  onEdit: (t: Transaction) => void;
  onDelete: (id: string) => void;
  onViewDetail?: (t: Transaction) => void;
  isExcelView?: boolean;
  currentAccountId?: string;
  showRunningBalances?: boolean;
  allowReorder?: boolean;
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
    backgroundColor: isDragging ? "var(--color-ll-cream)" : undefined,
  };

  return (
    <ReceiptRow
      ref={setNodeRef}
      style={style}
      onClick={onViewDetail ? () => onViewDetail(transaction) : undefined}
      className="items-center gap-1.5 px-3 py-2.5"
    >
      {/* 드래그 핸들: 보조 기능이라 시각적으로 옅게 처리. 검색·필터 결과에서는 렌더링 자체를
          하지 않는다(allowReorder=false) — 리스너를 붙일 요소가 없으니 드래그를 시작할 방법도
          없다(QA_REVIEW_028 P1). */}
      {allowReorder && (
        <button
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          className="shrink-0 cursor-grab active:cursor-grabbing text-gray-200 hover:text-gray-400 self-stretch flex items-center px-0.5 -ml-1"
          style={{ touchAction: 'pan-y' }}
          title="드래그하여 순서 변경"
          aria-label="순서 변경"
        >
          <GripVertical className="w-4 h-4" />
        </button>
      )}

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
                  {showRunningBalances && transaction.type === "EXPENSE" && transaction.runningAccountBalance !== undefined ? ` (잔액: ${transaction.runningAccountBalance.toLocaleString()}원)` : ""}
                  {showRunningBalances && transaction.type === "INCOME" && transaction.runningLinkedAccountBalance !== undefined ? ` (잔액: ${transaction.runningLinkedAccountBalance.toLocaleString()}원)` : ""}
                </span>
                <div className="flex items-center gap-1">
                  <span className="text-gray-400 text-[9px]">▶</span>
                  <span className="flex items-center gap-1 rounded bg-sky-50 px-1.5 py-0.5 text-sky-700 font-medium border border-sky-100">
                    <span>{getAccountIcon(transaction.transferDetail.toAccount.type)}</span>
                    {transaction.transferDetail.toAccount.name}
                    {showRunningBalances && transaction.type === "EXPENSE" && transaction.runningLinkedAccountBalance !== undefined ? ` (잔액: ${transaction.runningLinkedAccountBalance.toLocaleString()}원)` : ""}
                    {showRunningBalances && transaction.type === "INCOME" && transaction.runningAccountBalance !== undefined ? ` (잔액: ${transaction.runningAccountBalance.toLocaleString()}원)` : ""}
                  </span>
                </div>
              </div>
            ) : (
              transaction.account?.name && (
                <span className="flex items-center gap-1 rounded bg-gray-100 px-1.5 py-0.5 text-gray-700 font-medium">
                  <span>{getAccountIcon(transaction.account.type)}</span>
                  {transaction.account.name}
                  {showRunningBalances && transaction.runningAccountBalance !== undefined ? ` (잔액: ${transaction.runningAccountBalance.toLocaleString()}원)` : ""}
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
                <span className={`text-[14px] font-bold ${colorClass}`}>
                  {sign}{amountAbs}원
                </span>
                <span className="text-gray-300 text-[11px]">|</span>
                <span className="text-[10px] text-gray-500 font-medium">
                  총 {showRunningBalances ? (transaction.runningTotalBalance?.toLocaleString() ?? "-") : "—"}원
                </span>
              </div>
            );
          })()}

          <div className="mt-1.5 flex justify-end gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(transaction);
              }}
              className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              title="수정"
              aria-label="수정"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(transaction.id);
              }}
              className="p-2 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600"
              title="삭제"
              aria-label="삭제"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </ReceiptRow>
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
  onViewDetail,
  currentAccountId,
  isExcelView = true,
  openingBalanceAmount = 0,
  showRunningBalances = true,
  allowReorder = true,
  mobileStickyHeaderTop,
}: Props) {
  // `mobileStickyHeaderTop`이 넘어온 호출부(모바일)만 동적 offset 로직을 쓴다 — 데스크톱
  // 호출부는 이 prop 자체를 넘기지 않으므로 `isMobileHeaderContext`가 항상 false라
  // 기존 `sticky top-0 z-30` 스타일이 그대로 유지된다(IMPLEMENTATION_BRIEF_013 §4).
  const isMobileHeaderContext = mobileStickyHeaderTop !== undefined;
  const isMobileHeaderMeasured = isMobileHeaderContext && mobileStickyHeaderTop !== null;
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
    // 이중 방어 — 핸들을 숨겨 드래그를 시작할 수 없게 했지만(allowReorder=false), 혹시라도
    // 이벤트가 들어와도 onReorder는 절대 호출하지 않는다(QA_REVIEW_028 P1).
    if (!allowReorder) return;
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
          <StatePanel
            tone="neutral"
            title="첫 금액을 남기면 이번 달 흐름을 보여드릴게요."
            description="빠른 기록으로 지금 바로 남겨보세요."
          />
        )}

        {!loading &&
          !error &&
          groupedByDate.map(([date, items]) => (
            <div key={date} className="pt-1">
              <DateTape label={formatDateFriendly(date)} className="mb-1.5" />
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
                  <ReceiptCard>
                    {items.map((t) => (
                      <SortableMobileCard
                        key={t.id}
                        transaction={t}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        onViewDetail={onViewDetail}
                        currentAccountId={currentAccountId}
                        showRunningBalances={showRunningBalances}
                        allowReorder={allowReorder}
                      />
                    ))}
                  </ReceiptCard>
                </SortableContext>
              </DndContext>
            </div>
          ))}

        {/* 모바일 뷰 통계 요약 카드 */}
        {!loading && !error && localTransactions.length > 0 && (
          <div className="mt-4 p-3.5 rounded-xl border border-gray-200 bg-gray-50 flex flex-col gap-1.5 shadow-sm">
            <h3 className="text-[11px] font-bold text-gray-500 uppercase mb-0.5">
              {showRunningBalances ? "현재 기간 합계" : "검색 결과 합계"}
            </h3>
            <div className="flex justify-between items-center text-[13px]">
              <span className="text-gray-600 font-medium">시작 잔액</span>
              <span className="font-semibold text-gray-900">
                {showRunningBalances ? `${openingBalanceAmount.toLocaleString()}원` : "—"}
              </span>
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
              <span className="font-bold text-gray-900 text-[14px]">
                {!showRunningBalances ? "—" : stats.finalBalance !== undefined ? `${stats.finalBalance.toLocaleString()}원` : "-"}
              </span>
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
            <thead
              className={[
                // 데스크톱(mobileStickyHeaderTop 미전달)은 기존 동작 그대로: 항상 sticky top-0 z-30.
                // 모바일은 측정 전에는 sticky를 아예 켜지 않고(top:0 깜빡임 방지), 측정 후에만
                // sticky를 켜되 top은 실측값(inline style), z-index는 필터 도구(z-8)·잔액
                // 선반(z-7)보다 낮은 z-[6]로 둔다(IMPLEMENTATION_BRIEF_013 §4.4 "필터 도구 >
                // 잔액 선반 > 엑셀 열 헤더 > 거래 행").
                !isMobileHeaderContext
                  ? "sticky top-0 z-30"
                  : isMobileHeaderMeasured
                    ? "sticky z-[6]"
                    : "",
                isExcelView ? "bg-[#f3f4f6] text-gray-700 shadow-sm" : "bg-gray-50 text-gray-500 text-sm shadow-sm",
              ].join(" ")}
              style={isMobileHeaderMeasured ? { top: mobileStickyHeaderTop as number } : undefined}
            >
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
                      <p className="mb-1 font-medium text-gray-600">첫 금액을 남기면 이번 달 흐름을 보여드릴게요.</p>
                      <p className="text-sm">빠른 기록으로 지금 바로 남겨보세요 ✨</p>
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
                          showRunningBalances={showRunningBalances}
                          allowReorder={allowReorder}
                        />
                      ))}
                    </SortableContext>
                  </tbody>
                ))}

                <tfoot>
                  <tr>
                    <td colSpan={2} className={`${isExcelView ? "border border-gray-300 px-4 py-2" : "px-6 py-3"} text-center font-bold text-gray-700 bg-gray-100 hidden md:table-cell`}>
                      {showRunningBalances ? "현재 기간 합계" : "검색 결과 합계"}
                    </td>
                    <td colSpan={2} className={`${isExcelView ? "border border-gray-300 px-4 py-2" : "px-6 py-3"} text-center font-bold text-gray-700 bg-gray-100 md:hidden`}>
                      {showRunningBalances ? "합계" : "검색 결과"}
                    </td>
                    <td className={`${isExcelView ? "border border-gray-300 px-1 md:px-4 py-2" : "px-6 py-3"} text-right font-semibold text-gray-800 bg-gray-50/50`}>
                      <span className="text-[10px] text-gray-500 block">시작 잔액</span>
                      {showRunningBalances ? `${openingBalanceAmount.toLocaleString()}원` : "—"}
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
                      {!showRunningBalances ? "—" : stats.finalBalance !== undefined ? `${stats.finalBalance.toLocaleString()}원` : "-"}
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

