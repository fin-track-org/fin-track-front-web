"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
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

/**
 * 원본 `<thead>`와 모바일 복제 헤더가 함께 쓰는 열 정의(IMPLEMENTATION_BRIEF_014 §6 "같은
 * 마크업을 두 군데 직접 복사하지 않는다"). `widths`를 넘기면(복제 헤더 전용) 각 열에 실측한
 * px 폭을 강제로 적용한다 — 원본 표는 명시적 `colgroup` 없이 auto layout을 쓰기 때문에 데이터
 * 행 내용에 따라 실제 렌더 폭이 달라질 수 있고, 별도 `<table>`인 복제 헤더가 그 폭을
 * 그대로 재현하려면 원본을 그대로 측정해 강제하는 쪽이 안전하다(§6 "대안 B — 실제 열 너비
 * 측정"). 원본 호출에는 `widths`를 넘기지 않아 기존 auto layout이 그대로 유지된다.
 */
function LedgerTableHeaderRow({ isExcelView, widths }: { isExcelView: boolean; widths?: number[] }) {
  const cells = [
    { label: "#", className: `${isExcelView ? "border border-gray-300 px-1 md:px-2 py-1.5 md:py-2 w-6 md:w-8 text-center" : "px-3 py-3 w-8"} text-[10px] md:text-xs font-semibold uppercase hidden md:table-cell` },
    { label: "날짜", className: `${isExcelView ? "border border-gray-300 px-1 md:px-4 py-1.5 md:py-2 text-center" : "px-6 py-3 text-left"} text-[10px] md:text-xs font-semibold uppercase hidden md:table-cell` },
    { label: "카테고리", className: `${isExcelView ? "border border-gray-300 px-1 md:px-4 py-1.5 md:py-2 text-center whitespace-nowrap" : "px-6 py-3 text-left"} text-[10px] md:text-xs font-semibold uppercase` },
    { label: "설명", className: `${isExcelView ? "border border-gray-300 px-1 md:px-4 py-1.5 md:py-2 text-center w-auto md:w-[150px]" : "px-6 py-3 text-left"} text-[10px] md:text-xs font-semibold uppercase` },
    { label: "수입", className: `${isExcelView ? "border border-gray-300 px-1 md:px-4 py-1.5 md:py-2 text-center whitespace-nowrap" : "px-6 py-3 text-right"} text-[10px] md:text-xs font-semibold uppercase text-blue-600` },
    { label: "지출", className: `${isExcelView ? "border border-gray-300 px-1 md:px-4 py-1.5 md:py-2 text-center whitespace-nowrap" : "px-6 py-3 text-right"} text-[10px] md:text-xs font-semibold uppercase text-red-600` },
    { label: "거래 후 잔액", className: `${isExcelView ? "border border-gray-300 px-1 md:px-4 py-1.5 md:py-2 text-center whitespace-nowrap" : "px-6 py-3 text-right"} text-[10px] md:text-xs font-semibold uppercase text-gray-700` },
    { label: "계좌 잔액", className: `${isExcelView ? "border border-gray-300 px-1 md:px-4 py-1.5 md:py-2 text-center whitespace-nowrap" : "px-6 py-3 text-right"} text-[10px] md:text-xs font-semibold uppercase text-sky-700` },
    { label: "결제수단", className: `${isExcelView ? "border border-gray-300 px-1 md:px-4 py-1.5 md:py-2 text-center whitespace-nowrap" : "px-6 py-3 text-left"} text-[10px] md:text-xs font-semibold uppercase` },
    { label: "관리", className: `${isExcelView ? "border border-gray-300 px-1 md:px-2 py-1.5 md:py-2 text-center whitespace-nowrap" : "px-6 py-3"} text-[10px] md:text-xs font-semibold uppercase` },
  ];

  return (
    <tr>
      {cells.map((cell, i) => (
        <th
          key={cell.label}
          className={cell.className}
          style={widths ? { width: widths[i], minWidth: widths[i], maxWidth: widths[i] } : undefined}
        >
          {cell.label}
        </th>
      ))}
    </tr>
  );
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
  /** 모바일 엑셀 복제 헤더의 top 위치(px, IMPLEMENTATION_BRIEF_014). 데스크톱 호출부는 이
   * prop 자체를 넘기지 않는다(`undefined`) — 그러면 원본 `<thead>`가 기존 `sticky top-0
   * z-30` 그대로 유지되고 복제 헤더 로직 자체가 켜지지 않는다. 모바일 호출부는 항상 값을
   * 넘긴다: 아직 측정 전이면 `null`(복제 헤더를 아예 렌더링하지 않는다), 측정됐으면 실제
   * px 숫자(잔액 선반 실제 하단 offset)를 넘긴다.
   *
   * REPORT_030~031에서 쓰던 `mobileStickyHeaderTop`(원본 `<thead>` 자체를 모바일에서도
   * sticky로 고정하던 값)을 대체한다 — IMPLEMENTATION_BRIEF_014은 원본 `<thead>`의 모바일
   * sticky를 완전히 포기하고, 원본 헤더가 스크롤로 사라졌을 때만 보이는 별도 복제 헤더로
   * 바꿨다(§4, §11 "제거해야 할 이전 구현 흔적"). */
  mobileFloatingHeaderTop?: number | null;
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
  mobileFloatingHeaderTop,
}: Props) {
  // `mobileFloatingHeaderTop`이 넘어온 호출부(모바일)만 복제 헤더 로직을 쓴다 — 데스크톱
  // 호출부는 이 prop 자체를 넘기지 않으므로 `isMobileFloatingHeaderContext`가 항상 false라
  // observer가 생성되지도, 마운트되지도 않는다(IMPLEMENTATION_BRIEF_014 §4 "모바일 복제
  // 헤더 로직이 데스크톱에 마운트되거나 관찰자를 만들지 않게 한다").
  const isMobileFloatingHeaderContext = mobileFloatingHeaderTop !== undefined;

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

  /* ── 모바일 엑셀 복제 헤더(IMPLEMENTATION_BRIEF_014) ─────────────────────────
   * 원본 `<thead>`는 모바일에서 sticky를 포기하고 표와 함께 자연스럽게 스크롤한다. 대신
   * 원본 헤더가 화면(정확히는 복제 헤더가 붙을 기준선) 위로 완전히 지나가 사라졌을 때만,
   * 잔액 선반 바로 아래에 별도 복제 헤더를 띄운다. */
  const theadRef = useRef<HTMLTableSectionElement>(null);
  const tableWrapperRef = useRef<HTMLDivElement>(null);
  const cloneTableRef = useRef<HTMLTableElement | null>(null);
  const [columnWidths, setColumnWidths] = useState<number[] | null>(null);
  const [originalHeaderPassedTop, setOriginalHeaderPassedTop] = useState(false);
  const [tableVisible, setTableVisible] = useState(false);

  // QA_REVIEW_032 P1 — 복제 <table>이 처음 DOM에 연결되는 순간 원본 wrapper의 현재
  // scrollLeft를 즉시 반영한다. 원본 헤더가 아직 보이는 동안 미리 가로로 스크롤해 둔
  // 채로 세로 스크롤해 복제 헤더가 나중에(원본이 사라진 뒤에야) 처음 마운트되면, 그 사이
  // 새 scroll 이벤트가 없는 한 아래 scroll 리스너 effect는 다시 실행되지 않아 복제 헤더가
  // 첫 프레임에 scrollLeft=0(첫 열) 위치로 잘못 나타났다 — 표를 조금 움직여야만 정상
  // 위치로 맞춰지는 재현 가능한 버그였다. object ref 대신 callback ref를 써서, React가
  // 이 DOM 노드를 붙이는 바로 그 시점에 동기적으로 위치를 맞춘다.
  const setCloneTableRef = useCallback((node: HTMLTableElement | null) => {
    cloneTableRef.current = node;
    if (node && tableWrapperRef.current) {
      node.style.transform = `translateX(-${tableWrapperRef.current.scrollLeft}px)`;
    }
  }, []);

  // 열 너비 실측(§6 "대안 B") — 원본 `<th>` 각각을 관찰해 복제 헤더에 그대로 강제 적용한다.
  // 열 개수·순서는 항상 고정이라 마운트당 한 번만 관찰을 붙이면 되고, 이후 폭이 바뀌는
  // 원인(데이터 내용 변화, 뷰포트 폭, 폰트 로딩 등)과 무관하게 ResizeObserver가 계속 반영한다.
  useEffect(() => {
    if (!isMobileFloatingHeaderContext) return;
    const theadEl = theadRef.current;
    if (!theadEl) return;
    const ths = Array.from(theadEl.querySelectorAll("th"));
    if (ths.length === 0) return;

    const measure = () => setColumnWidths(ths.map((th) => th.getBoundingClientRect().width));
    const observer = new ResizeObserver(() => measure());
    ths.forEach((th) => observer.observe(th));
    measure();

    return () => observer.disconnect();
  }, [isMobileFloatingHeaderContext]);

  // 원본 헤더 통과 감지 — IntersectionObserver의 root를 기준선(mobileFloatingHeaderTop)만큼
  // 위에서 잘라내(`rootMargin`의 음수 top) 원본 `<thead>`가 그 선을 "위로" 지나가는 순간만
  // 정확히 잡아낸다. `isIntersecting === false`만으로는 표가 아직 화면 아래에 있어 헤더가
  // 나타나지도 않은 경우와 구분할 수 없어(§5.1), `boundingClientRect.bottom`으로 방향을
  // 직접 확인한다.
  useEffect(() => {
    // 측정 전(`null`)이거나 데스크톱(`undefined`)이면 observer를 만들지 않는다. state는
    // 일부러 리셋하지 않는다 — `shouldShowFloatingHeader`가 `mobileFloatingHeaderTop`
    // 자체도 별도 조건으로 검사하므로, 오래된 값이 남아 있어도 최종 표시 여부에는 영향이
    // 없다(effect 본문에서 곧장 setState를 호출하지 않아 `react-hooks/set-state-in-effect`도
    // 피한다 — MobileTransactionView.tsx의 선반 높이 측정과 같은 이유).
    if (!isMobileFloatingHeaderContext || mobileFloatingHeaderTop === null || mobileFloatingHeaderTop === undefined) return;
    const theadEl = theadRef.current;
    if (!theadEl) return;

    const threshold = mobileFloatingHeaderTop;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setOriginalHeaderPassedTop(false);
          return;
        }
        const rootTop = entry.rootBounds?.top ?? threshold;
        // 원본 헤더의 아래 경계가 기준선보다 위(작은 값)면 "위로 지나가서 사라진" 경우다.
        // 반대로 기준선보다 아래에 있으면 아직 화면 밑에서 올라오는 중이라는 뜻이라 false로
        // 남긴다.
        setOriginalHeaderPassedTop(entry.boundingClientRect.bottom <= rootTop);
      },
      { root: null, rootMargin: `-${threshold}px 0px 0px 0px`, threshold: 0 },
    );
    observer.observe(theadEl);

    return () => observer.disconnect();
  }, [isMobileFloatingHeaderContext, mobileFloatingHeaderTop]);

  // 표 종료 감지 — 표 wrapper 자체가 뷰포트와 조금이라도 겹치는지만 본다. 스크롤을 내려
  // 아직 표 영역에 도달하지 않았을 때도, 표의 마지막 행까지 지나쳤을 때도 겹침이 0이 되므로
  // 두 경우 모두 자연스럽게 "표시하지 않음"으로 처리된다(§5.1 5번, §9 "표의 끝을 지나면").
  useEffect(() => {
    if (!isMobileFloatingHeaderContext) return;
    const el = tableWrapperRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(([entry]) => setTableVisible(entry.isIntersecting), { threshold: 0 });
    observer.observe(el);

    return () => observer.disconnect();
  }, [isMobileFloatingHeaderContext]);

  // 가로 스크롤 동기화(§7) — 원본 표의 scrollLeft를 단일 기준으로 삼아 복제 헤더 table을
  // 그만큼 translateX한다. React state를 거치지 않고 DOM을 직접 조작해 스크롤마다 리렌더가
  // 일어나지 않게 한다(좌우 떨림 방지). 복제 헤더 자체에는 별도 scroll 리스너를 달지 않는다
  // (§7 "터치 스크롤을 가로채지 않는다").
  //
  // QA_REVIEW_032 P1 — 이 effect의 최초 `syncScroll()` 호출은 복제 `<table>`이 아직
  // DOM에 없을 때(=`shouldShowFloatingHeader`가 false일 때)는 아무 일도 하지 않는다.
  // 그래서 "복제 헤더가 실제로 보이는지와 무관하게 항상 최신 위치를 유지해 둔다"고
  // 가정하면 안 된다 — 최초 마운트 시점의 동기화는 위 `setCloneTableRef` callback ref가
  // 담당하고, 이 effect는 그 이후 실제로 발생하는 scroll 이벤트만 계속 반영한다.
  useEffect(() => {
    if (!isMobileFloatingHeaderContext) return;
    const wrapperEl = tableWrapperRef.current;
    if (!wrapperEl) return;

    const syncScroll = () => {
      const cloneTable = cloneTableRef.current;
      if (cloneTable) cloneTable.style.transform = `translateX(-${wrapperEl.scrollLeft}px)`;
    };
    syncScroll();
    wrapperEl.addEventListener("scroll", syncScroll, { passive: true });

    return () => wrapperEl.removeEventListener("scroll", syncScroll);
  }, [isMobileFloatingHeaderContext]);

  // 최종 표시 여부 — 원본 헤더가 기준선 위로 지나갔고, 표 자체는 아직 화면에 남아 있고,
  // 로딩/오류/빈 목록이 아니고, top·열 너비 측정이 끝났을 때만 보여준다(§9).
  const shouldShowFloatingHeader =
    isMobileFloatingHeaderContext &&
    mobileFloatingHeaderTop !== null &&
    mobileFloatingHeaderTop !== undefined &&
    columnWidths !== null &&
    originalHeaderPassedTop &&
    tableVisible &&
    !loading &&
    !error &&
    localTransactions.length > 0;

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
        <div
          ref={tableWrapperRef}
          className={`${isExcelView ? "block" : "hidden md:block"} bg-white overflow-x-auto border-x border-b border-gray-200`}
        >
          <table className={`w-full ${isExcelView ? "md:min-w-full min-w-max border-collapse border border-gray-300 text-xs md:text-sm" : "min-w-full"}`}>
            <thead
              ref={theadRef}
              className={[
                // 데스크톱(mobileFloatingHeaderTop 미전달)은 기존 동작 그대로: 항상
                // sticky top-0 z-30. 모바일은 이제 원본 헤더의 sticky를 완전히 포기한다 —
                // page scroll을 따라 표와 함께 자연스럽게 사라지고, 대신 아래 복제 헤더가
                // 그 역할을 대신한다(IMPLEMENTATION_BRIEF_014 §4).
                !isMobileFloatingHeaderContext ? "sticky top-0 z-30" : "",
                isExcelView ? "bg-[#f3f4f6] text-gray-700 shadow-sm" : "bg-gray-50 text-gray-500 text-sm shadow-sm",
              ].join(" ")}
            >
              <LedgerTableHeaderRow isExcelView={isExcelView} />
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

      {/* 모바일 엑셀 복제 헤더(IMPLEMENTATION_BRIEF_014 §8) — 원본 헤더가 기준선 위로 완전히
          지나갔을 때만 보이는 순수 시각 오버레이다. `aria-hidden`으로 스크린리더가 열 제목을
          두 번 읽지 않게 하고(§8, §12.12), `pointer-events-none`으로 터치 스크롤을 가로채지
          않는다(§7). z-index는 앱바(z-8) · 잔액 선반(z-7)보다 낮고 거래 행보다는 높은
          z-[6]로 REPORT_030이 쓰던 값을 그대로 재사용한다. */}
      {shouldShowFloatingHeader && (
        <div
          aria-hidden="true"
          className="fixed left-0 right-0 z-[6] overflow-hidden bg-[#f3f4f6] shadow-sm pointer-events-none motion-safe:animate-in motion-safe:fade-in motion-safe:duration-150"
          style={{ top: mobileFloatingHeaderTop as number }}
        >
          <table
            ref={setCloneTableRef}
            className="min-w-max table-fixed border-collapse border border-gray-300 text-xs"
          >
            <thead>
              <LedgerTableHeaderRow isExcelView={isExcelView} widths={columnWidths ?? undefined} />
            </thead>
          </table>
        </div>
      )}
    </>
  );
}
