"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import {
  DndContext,
  closestCenter,
  DragEndEvent,
  PointerSensor,
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
import { GripVertical } from "lucide-react";
import LedgerRow from "./LedgerRow";
import SkeletonRow from "../SkeletonRow";

interface Props {
  transactions: Transaction[];
  loading: boolean;
  error: string | null;
  onEdit: (t: Transaction) => void;
  onDelete: (id: string) => void;
  onReorder: (transactionIds: string[]) => void;
}

/* ────────────────────────── Sortable wrappers ────────────────────────── */

function SortableLedgerRow({
  transaction,
  onEdit,
  onDelete,
}: {
  transaction: Transaction;
  onEdit: (t: Transaction) => void;
  onDelete: (id: string) => void;
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
      dragHandleAttributes={attributes}
      dragHandleListeners={listeners}
    />
  );
}

function SortableMobileCard({
  transaction,
  onEdit,
  onDelete,
}: {
  transaction: Transaction;
  onEdit: (t: Transaction) => void;
  onDelete: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: transaction.id });

  const isExpense = transaction.type === "EXPENSE";
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
      className="rounded-xl border bg-white p-4 shadow-sm flex gap-3"
    >
      {/* 드래그 핸들 */}
      <button
        {...attributes}
        {...listeners}
        className="shrink-0 cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-400 touch-none self-center"
        title="드래그하여 순서 변경"
        aria-label="순서 변경"
      >
        <GripVertical className="w-5 h-5" />
      </button>

      <div className="flex flex-1 items-start justify-between gap-3 min-w-0">
        <div className="min-w-0">
          <p className="text-sm text-gray-500">{transaction.date}</p>
          <p className="mt-1 font-semibold truncate">{transaction.description}</p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <span className="rounded-md px-2 py-1 bg-sky-100 text-sky-600">
              {transaction.category.name}
            </span>
            {transaction.account?.name && (
              <span className="rounded-md bg-gray-100 px-2 py-1 text-gray-700">
                {transaction.account.name}
              </span>
            )}
          </div>
        </div>

        <div className="shrink-0 text-right">
          <p
            className={`text-sm font-bold ${isExpense ? "text-red-600" : "text-green-600"}`}
          >
            {isExpense ? "-" : "+"}
            {amountAbs}원
          </p>

          <div className="mt-2 flex justify-end gap-2">
            <button
              onClick={() => onEdit(transaction)}
              className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs hover:bg-gray-200"
            >
              수정
            </button>
            <button
              onClick={() => onDelete(transaction.id)}
              className="rounded-lg bg-red-100 px-3 py-1.5 text-xs text-red-700 hover:bg-red-200"
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
}: Props) {
  const [localTransactions, setLocalTransactions] =
    useState<Transaction[]>(transactions);

  // Per-date debounce timers
  const debounceRefs = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Sync local state when server data changes
  useEffect(() => {
    setLocalTransactions(transactions);
  }, [transactions]);

  // Group by date, preserving descending order
  const groupedByDate = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    for (const t of localTransactions) {
      if (!map.has(t.date)) map.set(t.date, []);
      map.get(t.date)!.push(t);
    }
    return Array.from(map.entries()).sort(([a], [b]) => b.localeCompare(a));
  }, [localTransactions]);

  const handleDragEnd = (event: DragEndEvent, date: string) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const dateItems = localTransactions.filter((t) => t.date === date);
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
        if (t.date === date) {
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
    const existing = debounceRefs.current.get(date);
    if (existing) clearTimeout(existing);
    debounceRefs.current.set(
      date,
      setTimeout(() => {
        onReorder(reorderedIds);
        debounceRefs.current.delete(date);
      }, 1500),
    );
  };

  return (
    <>
      {/* ✅ 모바일: 카드 */}
      <div className="md:hidden space-y-4">
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
            <div key={date}>
              <p className="text-xs font-semibold text-gray-400 uppercase mb-2 px-1">
                {date}
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
                  <div className="space-y-2">
                    {items.map((t) => (
                      <SortableMobileCard
                        key={t.id}
                        transaction={t}
                        onEdit={onEdit}
                        onDelete={onDelete}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          ))}
      </div>

      {/* ✅ 데스크탑: 테이블 */}
      <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead className="bg-gray-50 text-gray-500 text-sm">
            <tr>
              <th className="px-3 py-3 w-8" />
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase">
                날짜
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase">
                카테고리
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase">
                세부 항목
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase">
                설명
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase">
                결제수단
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold uppercase">
                금액
              </th>
              <th className="px-6 py-3" />
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
                <td colSpan={8}>
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
                <td colSpan={8}>
                  <div className="py-12 text-center text-gray-400">
                    <p className="mb-1">거래 내역이 없습니다</p>
                    <p className="text-sm">새 거래를 추가해보세요 ✨</p>
                  </div>
                </td>
              </tr>
            </tbody>
          )}

          {!loading &&
            !error &&
            groupedByDate.map(([date, items]) => (
              <DndContext
                key={date}
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={(e) => handleDragEnd(e, date)}
                modifiers={[restrictToVerticalAxis, restrictToParentElement]}
              >
                <tbody>
                  <tr>
                    <td
                      colSpan={8}
                      className="px-6 py-2 bg-gray-50 text-xs font-semibold text-gray-400 uppercase border-t border-b border-gray-100"
                    >
                      {date}
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
                      />
                    ))}
                  </SortableContext>
                </tbody>
              </DndContext>
            ))}
        </table>
      </div>
    </>
  );
}

