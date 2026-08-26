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

/** 데스크톱(및 이 컴포넌트의 기존 반응형 표) 전용 열 정의 — IMPLEMENTATION_BRIEF_015 이후
 * 모바일은 완전히 별도 구조(`MOBILE_LEDGER_COLUMNS` 이하)를 쓰므로, 이 컴포넌트는 더 이상
 * 모바일 분기를 갖지 않는다. */
function LedgerTableHeaderRow({ isExcelView }: { isExcelView: boolean }) {
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
      {cells.map((cell) => (
        <th key={cell.label} className={cell.className}>
          {cell.label}
        </th>
      ))}
    </tr>
  );
}

/* ────────────────────────── 모바일 엑셀 헤더·본문 분리(IMPLEMENTATION_BRIEF_015) ──────────────────────────
 * 모바일 엑셀뷰는 데스크톱과 완전히 다른 DOM을 쓴다 — 헤더 전용 table과 거래 행 전용 table을
 * 분리하고, 둘 다 아래 같은 열 정의(`MOBILE_LEDGER_COLUMNS`)를 `<colgroup>`으로 공유해
 * 폭을 강제로 일치시킨다. `#`(드래그 핸들)·`날짜` 열은 기존에도 `hidden md:table-cell`로
 * 모바일에서 보이지 않았으므로 이 정의 자체에 포함하지 않는다(브리프 §6). */
const ALIGN_CLASS = { left: "text-left", center: "text-center", right: "text-right" } as const;

const MOBILE_LEDGER_COLUMNS = [
  { key: "category", label: "카테고리", width: 92, align: "center", colorClass: "text-gray-700" },
  { key: "description", label: "설명", width: 140, align: "left", colorClass: "text-gray-700" },
  { key: "income", label: "수입", width: 88, align: "right", colorClass: "text-blue-600" },
  { key: "expense", label: "지출", width: 88, align: "right", colorClass: "text-red-600" },
  { key: "runningBalance", label: "거래 후 잔액", width: 108, align: "right", colorClass: "text-gray-700" },
  { key: "accountBalance", label: "계좌 잔액", width: 108, align: "right", colorClass: "text-sky-700" },
  { key: "account", label: "결제수단", width: 96, align: "left", colorClass: "text-gray-700" },
  { key: "actions", label: "관리", width: 64, align: "center", colorClass: "text-gray-700" },
] as const satisfies readonly { key: string; label: string; width: number; align: keyof typeof ALIGN_CLASS; colorClass: string }[];

/** 두 table에 그대로 적용할 명시적 전체 table 폭(QA_REVIEW_035 P1). `table-layout: fixed`는
 * table 자체의 `width`가 명시돼야 안정적으로 동작한다 — `min-w-max`(=`min-width: max-content`)
 * 만으로는 `width`가 여전히 `auto`라 콘텐츠에 따라 auto layout처럼 재계산될 수 있다. 각 col
 * width의 합과 이 값이 항상 일치하도록 `MOBILE_LEDGER_COLUMNS`에서 직접 계산한다 — 별도로
 * 하드코딩하지 않는다. */
const MOBILE_LEDGER_TABLE_WIDTH = MOBILE_LEDGER_COLUMNS.reduce((sum, column) => sum + column.width, 0);

/** 헤더 table과 거래 행 table이 함께 렌더링하는 공통 colgroup(§6) — 열 너비를 이 한 곳에서만
 * 정의한다. `table-layout: fixed`와 함께 써야 지정한 폭이 내용과 무관하게 그대로 적용된다. */
function MobileLedgerColGroup() {
  return (
    <colgroup>
      {MOBILE_LEDGER_COLUMNS.map((column) => (
        <col key={column.key} style={{ width: column.width }} />
      ))}
    </colgroup>
  );
}

/** `srOnly`가 없으면(기본값) 잔액 선반 아래 고정되는 시각적 헤더 table의 내용이다.
 * `srOnly`면 거래 행 table 안에 넣는 스크린리더 전용 열 머리글이다(QA_REVIEW_035 P2-2) —
 * 같은 라벨 정의(`MOBILE_LEDGER_COLUMNS`)를 재사용해 두 헤더가 어긋나지 않는다. */
function MobileLedgerHeaderCells({ srOnly = false }: { srOnly?: boolean }) {
  return (
    <tr>
      {MOBILE_LEDGER_COLUMNS.map((column) => (
        <th
          key={column.key}
          scope="col"
          className={
            srOnly
              ? "sr-only"
              : `border border-gray-300 px-2 py-1.5 text-[10px] font-semibold uppercase whitespace-nowrap ${ALIGN_CLASS[column.align]} ${column.colorClass}`
          }
        >
          {column.label}
        </th>
      ))}
    </tr>
  );
}

/** 거래 행 전용 table의 본문 행 — `LedgerRow`와 같은 유형별 표시 규칙(이체/저축/잔액조정
 * 구분, 러닝 잔액 숨김 등)을 그대로 따르되, 모바일에서 항상 숨겨져 있던 드래그 핸들·`#`·
 * 날짜 열은 처음부터 렌더링하지 않는다(§5, §6). 드래그 핸들이 이미 `hidden md:table-cell`로
 * 모바일에서 보이지도, 포커스할 수도 없었으므로 이 표는 애초에 DnD 컨텍스트로 감싸지
 * 않는다 — 기존에 동작하던 기능을 제거하는 것이 아니라, 모바일에서 원래도 쓸 수 없던
 * 진입점을 다시 만들지 않는 것이다(§10 "검색 결과 reorder 비활성화"는 데스크톱에서만
 * 의미 있는 안전장치였고, 그 로직 자체는 데스크톱 표에 그대로 남아 있다). */
function MobileLedgerRow({
  transaction,
  onEdit,
  onDelete,
  currentAccountId,
  showRunningBalances,
}: {
  transaction: Transaction;
  onEdit: (t: Transaction) => void;
  onDelete: (id: string) => void;
  currentAccountId?: string;
  showRunningBalances: boolean;
}) {
  // getTransactionSign/getTransactionColor의 매개변수는 이미 `any`로 선언돼 있어(transactionUtils.ts)
  // 여기서 추가로 캐스팅할 필요가 없다 — 기존 코드(LedgerRow.tsx 등)의 `as any`는 불필요한
  // 캐스트였다(이전 라운드에서 확인된 사실, 새 코드에는 반복하지 않는다).
  const sign = getTransactionSign(transaction, currentAccountId);
  const colorClass = getTransactionColor(transaction, currentAccountId);
  const amountStr = Math.abs(transaction.amount).toLocaleString() + "원";

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="border border-gray-300 px-2 py-1.5 text-center whitespace-nowrap overflow-hidden text-ellipsis">
        <span className="inline-flex items-center font-medium bg-sky-100 text-sky-600 px-2 py-0.5 rounded text-[9px] truncate max-w-full">
          {transaction.subcategory?.name
            ? `${transaction.category.name} > ${transaction.subcategory.name}`
            : transaction.category.name}
        </span>
      </td>
      <td className="border border-gray-300 px-2 py-1.5 text-[10px] text-gray-700">
        <div className="truncate whitespace-nowrap">{transaction.description}</div>
      </td>
      {sign === "+" ? (
        <>
          <td className={`border border-gray-300 px-2 py-1.5 whitespace-nowrap text-right text-[10px] font-semibold ${colorClass}`}>
            +{amountStr}
          </td>
          <td className="border border-gray-300 px-2 py-1.5" />
        </>
      ) : sign === "-" ? (
        <>
          <td className="border border-gray-300 px-2 py-1.5" />
          <td className={`border border-gray-300 px-2 py-1.5 whitespace-nowrap text-right text-[10px] font-semibold ${colorClass}`}>
            -{amountStr}
          </td>
        </>
      ) : (
        <td colSpan={2} className={`border border-gray-300 px-2 py-1.5 whitespace-nowrap text-center text-[10px] font-medium ${colorClass}`}>
          {amountStr}
        </td>
      )}
      <td className="border border-gray-300 px-2 py-1.5 whitespace-nowrap text-right text-[10px] font-bold text-gray-700">
        {!showRunningBalances
          ? "—"
          : transaction.runningTotalBalance !== undefined
            ? `${transaction.runningTotalBalance.toLocaleString()}원`
            : "-"}
      </td>
      <td className="border border-gray-300 px-2 py-1.5 whitespace-nowrap text-right text-[10px] font-bold text-sky-700 bg-sky-50/30">
        {!showRunningBalances ? (
          "—"
        ) : transaction.runningLinkedAccountBalance !== undefined ? (
          <div className="flex flex-col gap-0.5 items-end">
            <span className="text-gray-500">{transaction.runningAccountBalance !== undefined ? `${transaction.runningAccountBalance.toLocaleString()}원` : "-"}</span>
            <span>{`${transaction.runningLinkedAccountBalance.toLocaleString()}원`}</span>
          </div>
        ) : (
          transaction.runningAccountBalance !== undefined ? `${transaction.runningAccountBalance.toLocaleString()}원` : "-"
        )}
      </td>
      <td className="border border-gray-300 px-2 py-1.5 text-center whitespace-nowrap text-[10px] text-gray-600 overflow-hidden text-ellipsis">
        {transaction.transferDetail && transaction.runningLinkedAccountBalance !== undefined ? (
          <div className="flex flex-col gap-0.5 items-center">
            <span className="text-gray-500 truncate max-w-[80px]">{getAccountIcon(transaction.transferDetail.fromAccount.type)} {transaction.transferDetail.fromAccount.name}(출금)</span>
            <span className="font-medium text-sky-700 truncate max-w-[80px]">{getAccountIcon(transaction.transferDetail.toAccount.type)} {transaction.transferDetail.toAccount.name}(입금)</span>
          </div>
        ) : transaction.transferDetail ? (
          <div className="flex items-center gap-0.5 justify-center">
            <span className="text-gray-500 truncate max-w-[50px]">{getAccountIcon(transaction.transferDetail.fromAccount.type)} {transaction.transferDetail.fromAccount.name}</span>
            <span className="text-gray-300">→</span>
            <span className="font-medium px-1 py-0.5 rounded text-[9px] truncate max-w-[50px] text-gray-700 bg-gray-100">{getAccountIcon(transaction.transferDetail.toAccount.type)} {transaction.transferDetail.toAccount.name}</span>
          </div>
        ) : (
          <div className="flex items-center justify-center">
            <span className="truncate max-w-[70px]">{getAccountIcon(transaction.account?.type || "")} {transaction.account?.name}</span>
          </div>
        )}
      </td>
      <td className="border border-gray-300 px-2 py-1.5 text-center whitespace-nowrap">
        <div className="flex items-center gap-0.5 justify-center">
          <button
            onClick={() => onEdit(transaction)}
            className="p-1 rounded-md hover:bg-yellow-50 text-yellow-600"
            title="수정"
            aria-label="수정"
          >
            <Pencil className="w-3 h-3" />
          </button>
          <button
            onClick={() => onDelete(transaction.id)}
            className="p-1 rounded-md hover:bg-red-50 text-red-600"
            title="삭제"
            aria-label="삭제"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </td>
    </tr>
  );
}

/** 모바일 거래 행 table 전용 로딩 skeleton(QA_REVIEW_035 P2-1) — 데스크톱용 `SkeletonRow`는
 * `#`·날짜를 포함한 10개 `<td>`를 렌더링해 모바일의 8열 colgroup과 맞지 않았다. 열 순서와
 * 개수를 `MOBILE_LEDGER_COLUMNS`와 동일하게 맞춰, 로딩 중에도 헤더와 skeleton 열이
 * 일치하고 로딩 완료 시 table 폭이 바뀌지 않게 한다. 데스크톱 `SkeletonRow`는 건드리지
 * 않았다. */
function MobileLedgerSkeletonRow() {
  return (
    <tr className="animate-pulse">
      <td className="border border-gray-300 px-2 py-1.5">
        <div className="h-4 w-14 bg-gray-200 rounded mx-auto" />
      </td>
      <td className="border border-gray-300 px-2 py-1.5">
        <div className="h-4 w-20 bg-gray-200 rounded" />
      </td>
      <td className="border border-gray-300 px-2 py-1.5">
        <div className="h-4 w-12 bg-gray-200 rounded ml-auto" />
      </td>
      <td className="border border-gray-300 px-2 py-1.5">
        <div className="h-4 w-12 bg-gray-200 rounded ml-auto" />
      </td>
      <td className="border border-gray-300 px-2 py-1.5">
        <div className="h-4 w-16 bg-gray-200 rounded ml-auto" />
      </td>
      <td className="border border-gray-300 px-2 py-1.5">
        <div className="h-4 w-16 bg-gray-200 rounded ml-auto" />
      </td>
      <td className="border border-gray-300 px-2 py-1.5">
        <div className="h-4 w-14 bg-gray-200 rounded" />
      </td>
      <td className="border border-gray-300 px-2 py-1.5">
        <div className="h-4 w-8 bg-gray-200 rounded mx-auto" />
      </td>
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
   * 일반 장부 엑셀은 영향 없음. 모바일 표는 애초에 드래그 핸들을 렌더링하지 않으므로
   * 이 prop을 참조하지 않는다(§10 "검색 결과 reorder 비활성화"는 데스크톱 표에서만
   * 의미가 있었고 계속 그렇다). */
  allowReorder?: boolean;
  /** 모바일 엑셀 헤더 table의 sticky top 위치(px, IMPLEMENTATION_BRIEF_015 §4). 데스크톱
   * 호출부는 이 prop 자체를 넘기지 않는다(`undefined`) — 그러면 모바일 전용 두 -table
   * 구조 자체가 렌더링되지 않고 기존 단일 table 구조만 쓴다. 모바일 호출부는 항상 값을
   * 넘긴다: 아직 측정 전이면 `null`(헤더에 sticky 위치를 아직 적용하지 않는다 — top:0
   * 깜빡임 방지), 측정됐으면 실제 px 숫자(잔액 선반 실제 하단 offset)를 넘긴다.
   *
   * REPORT_032~033에서 쓰던 `mobileFloatingHeaderTop`(IntersectionObserver로 조건부
   * 표시하던 fixed 복제 헤더의 top)을 대체한다 — 이 브리프는 그 구조 전체(fixed 위치,
   * 원본 헤더 통과 감지, 표 종료 감지, 열 너비 실측 ResizeObserver)를 제거하고, 헤더가
   * 항상 DOM에 존재하는 별도 table + CSS sticky로 바꿨다(§1, §3). */
  mobileHeaderStickyTop?: number | null;
}

/* ────────────────────────── Sortable wrappers (데스크톱 전용) ────────────────────────── */

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
  mobileHeaderStickyTop,
}: Props) {
  // `mobileHeaderStickyTop`이 넘어온 호출부(모바일)만 헤더·본문 분리 구조를 쓴다 — 데스크톱
  // 호출부는 이 prop 자체를 넘기지 않으므로 `isMobileLedgerContext`가 항상 false라 모바일
  // 전용 두 table을 전혀 렌더링하지 않는다(IMPLEMENTATION_BRIEF_015 §9 "모바일 헤더 전용
  // table을 렌더링하지 않음").
  const isMobileLedgerContext = mobileHeaderStickyTop !== undefined;
  // 엑셀 헤더는 모바일 context에서 항상 `position: sticky`다(QA_REVIEW_037 P1-1) — 측정 성공
  // 여부가 sticky 활성화 자체를 결정하면, `ResizeObserver`의 최초 callback이 늦거나 발생하지
  // 않는 환경에서 헤더가 계속 일반 block으로 남아 거래 행과 함께 사라진다(사용자가 재현한
  // 증상). `hasResolvedMobileHeaderTop`은 sticky 여부가 아니라 "아직 올바른 top 값이 없는
  // 아주 짧은 구간에 헤더를 잠깐 숨길지"만 결정한다(§687 wrapper의 `visibility`).
  const hasResolvedMobileHeaderTop = mobileHeaderStickyTop !== null && mobileHeaderStickyTop !== undefined;

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

  /* ── 모바일 가로 스크롤 동기화(§7) ──────────────────────────────────────────
   * 거래 행 wrapper의 scrollLeft를 유일한 기준으로 삼아 헤더 table을 그만큼 translateX한다.
   * 헤더가 이제 항상 DOM에 존재하므로(§4 "조건부로 나타나는 overlay가 아니다"), 이전
   * REPORT_033처럼 "복제 헤더가 나중에 마운트되는" 시점을 따로 챙길 필요가 없다 — plain
   * ref만으로 마운트 시점에 이미 헤더 table이 존재하니 effect의 최초 호출이 곧바로
   * 반영된다(§7 "헤더는 항상 마운트되므로 조건부 마운트 시점 동기화는 필요 없다"). */
  const mobileScrollWrapperRef = useRef<HTMLDivElement>(null);
  const mobileHeaderTableRef = useRef<HTMLTableElement>(null);

  useEffect(() => {
    if (!isMobileLedgerContext) return;
    const wrapperEl = mobileScrollWrapperRef.current;
    if (!wrapperEl) return;

    const syncScroll = () => {
      const headerTable = mobileHeaderTableRef.current;
      if (headerTable) headerTable.style.transform = `translateX(-${wrapperEl.scrollLeft}px)`;
    };
    syncScroll(); // 헤더가 항상 마운트돼 있어 최초 호출이 즉시 현재 위치를 반영한다.
    wrapperEl.addEventListener("scroll", syncScroll, { passive: true });

    return () => wrapperEl.removeEventListener("scroll", syncScroll);
  }, [isMobileLedgerContext]);

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
    // 이벤트가 들어와도 onReorder는 절대 호출하지 않는다(QA_REVIEW_028 P1). 데스크톱
    // 표에서만 실제로 호출될 수 있다 — 모바일 표는 DndContext로 감싸지 않는다.
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

  /* ── 모바일 엑셀뷰: 헤더·본문 분리 구조(IMPLEMENTATION_BRIEF_015) ──────────────────── */
  if (isMobileLedgerContext) {
    const mobileTableAriaLabel = "거래 내역 — 카테고리, 설명, 수입, 지출, 거래 후 잔액, 계좌 잔액, 결제수단, 관리 순";

    return (
      // "모바일 엑셀 장부 영역" — 세로 overflow를 주지 않는다(§4 "상위 장부 영역에는 vertical
      // overflow: auto/hidden/scroll을 주지 않는다"). 이 영역의 실제 높이(헤더 + 모든 거래
      // 행)가 헤더의 containing block이 돼, 장부 전체가 스크롤되는 동안 헤더가 머무를 공간을
      // 충분히 제공한다 — 장부가 끝나면 이 영역 자체가 끝나므로 헤더도 자연히 함께 사라진다
      // (§2, §11 7번 "장부 마지막을 지나면 헤더도 자연스럽게 사라진다") — 별도 감지 로직이
      // 필요 없다.
      <div>
        {/* 헤더 전용 table — 조건부 overlay가 아니라 항상 DOM에 존재한다(§4). sticky는 측정값과
            무관하게 항상 걸려 있다(QA_REVIEW_037 P1-1) — 앱바·잔액 선반과 마찬가지로 이
            헤더도 모바일 엑셀 context에서는 처음부터 세 번째 sticky 층이어야 하고, 측정
            성공 여부가 그 자체를 좌우해서는 안 된다. 아직 올바른 top 값이 없는 아주 짧은
            구간에는(§687 `hasResolvedMobileHeaderTop`) top:0으로 잘못 고정된 모습이 잠깐
            보이는 대신 `visibility: hidden`으로 숨기되 레이아웃 높이는 그대로 차지해(표가
            밀리지 않게) 값이 들어오는 즉시 올바른 위치에서 나타나게 한다. z-index는
            앱바(8) > 잔액 선반(7) > 헤더(6) 순서를 그대로 따른다. `width`/`minWidth`를
            명시해야 `table-fixed`가 실제로 안정적으로 동작한다(QA_REVIEW_035 P1 —
            `min-w-max`만으로는 table의 `width` 자체가 `auto`로 남아 콘텐츠에 따라 재계산될
            수 있었다). 아래 거래 행 table의 실제 접근 가능한 열 머리글(스크린리더 전용
            thead)이 따로 있으므로, 이 시각적 헤더는 중복 낭독을 막기 위해 `aria-hidden`으로
            접근성 트리에서 제외한다(QA_REVIEW_035 P2-2). */}
        <div
          className="sticky z-[6] overflow-hidden border border-gray-300 bg-[#f3f4f6] shadow-sm"
          style={{
            top: hasResolvedMobileHeaderTop ? (mobileHeaderStickyTop as number) : 0,
            visibility: hasResolvedMobileHeaderTop ? "visible" : "hidden",
          }}
        >
          <table
            ref={mobileHeaderTableRef}
            aria-hidden="true"
            className="table-fixed border-collapse text-xs"
            style={{ width: MOBILE_LEDGER_TABLE_WIDTH, minWidth: MOBILE_LEDGER_TABLE_WIDTH }}
          >
            <MobileLedgerColGroup />
            <thead>
              <MobileLedgerHeaderCells />
            </thead>
          </table>
        </div>

        {/* 거래 행 전용 table — 가로 스크롤은 이 wrapper만 담당한다(§5). 시각적으로는 헤더를
            중복 렌더링하지 않지만(위 헤더 table이 유일하게 "보이는" 열 머리글이다, §8),
            스크린리더가 각 셀의 열을 알 수 있도록 이 table 내부에 실제 접근 가능한
            `<thead>`를 별도로 둔다(QA_REVIEW_035 P2-2) — `sr-only`로 시각적 공간은 차지하지
            않는다. 열 폭은 `table-layout: fixed` + 명시적 table width + colgroup만으로
            결정되므로(위 주석 참고) 이 thead의 내용은 폭 계산에 영향을 주지 않는다. */}
        <div ref={mobileScrollWrapperRef} className="overflow-x-auto bg-white border-x border-b border-gray-200">
          <table
            aria-label={mobileTableAriaLabel}
            className="table-fixed border-collapse border border-gray-300 text-xs"
            style={{ width: MOBILE_LEDGER_TABLE_WIDTH, minWidth: MOBILE_LEDGER_TABLE_WIDTH }}
          >
            <MobileLedgerColGroup />
            <thead>
              <MobileLedgerHeaderCells srOnly />
            </thead>

            {loading && (
              <tbody>
                {Array.from({ length: 6 }).map((_, i) => (
                  <MobileLedgerSkeletonRow key={i} />
                ))}
              </tbody>
            )}

            {!loading && error && (
              <tbody>
                <tr>
                  <td colSpan={MOBILE_LEDGER_COLUMNS.length}>
                    <div className="py-12 flex flex-col items-center text-center">
                      <p className="text-red-500 font-medium mb-2">데이터를 불러오지 못했어요</p>
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
                  <td colSpan={MOBILE_LEDGER_COLUMNS.length}>
                    <div className="py-12 text-center text-gray-400">
                      <p className="mb-1 font-medium text-gray-600">첫 금액을 남기면 이번 달 흐름을 보여드릴게요.</p>
                      <p className="text-sm">빠른 기록으로 지금 바로 남겨보세요 ✨</p>
                    </div>
                  </td>
                </tr>
              </tbody>
            )}

            {!loading && !error && groupedByDate.map(([date, items]) => (
              <tbody key={date}>
                <tr>
                  <td colSpan={MOBILE_LEDGER_COLUMNS.length} className="border border-gray-300 py-1.5 bg-[#f3f4f6] text-xs font-bold text-gray-500 text-left pl-3">
                    {formatDateFriendly(date)}
                  </td>
                </tr>
                {items.map((t) => (
                  <MobileLedgerRow
                    key={t.id}
                    transaction={t}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    currentAccountId={currentAccountId}
                    showRunningBalances={showRunningBalances}
                  />
                ))}
              </tbody>
            ))}

            {!loading && !error && (
              <tfoot>
                <tr>
                  <td colSpan={2} className="border border-gray-300 px-3 py-2 text-center font-bold text-gray-700 bg-gray-100">
                    {showRunningBalances ? "현재 기간 합계" : "검색 결과 합계"}
                  </td>
                  <td className="border border-gray-300 px-2 py-2 text-right font-semibold text-blue-600 bg-blue-50/50">
                    <span className="text-[10px] text-blue-400 block">총 수입</span>
                    +{stats.income.toLocaleString()}원
                  </td>
                  <td className="border border-gray-300 px-2 py-2 text-right font-semibold text-red-600 bg-red-50/50">
                    <span className="text-[10px] text-red-400 block">총 지출</span>
                    -{stats.expense.toLocaleString()}원
                  </td>
                  <td className="border border-gray-300 px-2 py-2 text-right font-bold text-gray-800 bg-gray-100">
                    <span className="text-[10px] text-gray-500 block">최종 잔액</span>
                    {!showRunningBalances ? "—" : stats.finalBalance !== undefined ? `${stats.finalBalance.toLocaleString()}원` : "-"}
                  </td>
                  <td className="border border-gray-300 px-2 py-2 text-right font-semibold text-gray-800 bg-gray-50/50">
                    <span className="text-[10px] text-gray-500 block">시작 잔액</span>
                    {showRunningBalances ? `${openingBalanceAmount.toLocaleString()}원` : "—"}
                  </td>
                  <td colSpan={2} className="border border-gray-300 px-3 py-2 bg-gray-100" />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    );
  }

  /* ── 데스크톱: 기존 단일 table 구조(변경 없음) ──────────────────────────────────── */
  return (
    <>
      {/* ✅ 모바일: 카드 (엑셀 뷰가 아닐 때만 노출) — 이 브랜치는 모바일 호출부가 항상
          isExcelView를 true로 넘기고, 이제 모바일 엑셀뷰는 위 분기에서 완전히 빠져나가므로
          실제로는 도달하지 않는 기존 코드다(REPORT_027 이전부터의 사실 — lg/md breakpoint
          차이로 이미 도달 불가능했다). 제거 대상으로 지시받지 않아 그대로 둔다. */}
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

      {/* ✅ 데스크탑/공통: 테이블 */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        modifiers={[restrictToVerticalAxis, restrictToParentElement]}
      >
        <div className={`${isExcelView ? "block" : "hidden md:block"} bg-white overflow-x-auto border-x border-b border-gray-200`}>
          <table className={`w-full ${isExcelView ? "md:min-w-full min-w-max border-collapse border border-gray-300 text-xs md:text-sm" : "min-w-full"}`}>
            <thead className={`sticky top-0 z-30 ${isExcelView ? "bg-[#f3f4f6] text-gray-700 shadow-sm" : "bg-gray-50 text-gray-500 text-sm shadow-sm"}`}>
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
    </>
  );
}
