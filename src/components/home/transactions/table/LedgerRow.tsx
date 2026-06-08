import { GripVertical, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { forwardRef, useState } from "react";
import { getTransactionColor, getTransactionSign } from "@/src/lib/transactionUtils";
import type { DraggableAttributes } from "@dnd-kit/core";
import type { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities";

interface Props {
  transaction: Transaction;
  onEdit: (t: Transaction) => void;
  onDelete: (id: string) => void;
  dragHandleAttributes?: DraggableAttributes;
  dragHandleListeners?: SyntheticListenerMap;
  style?: React.CSSProperties;
  currentAccountId?: string;
}

const LedgerRow = forwardRef<HTMLTableRowElement, Props>(function LedgerRow(
  { transaction, onEdit, onDelete, dragHandleAttributes, dragHandleListeners, style, currentAccountId },
  ref,
) {
  const isExpense = transaction.type === "EXPENSE";

  return (
    <tr
      ref={ref}
      style={style}
      className="group hover:bg-gray-50 transition-colors"
    >
      {/* 드래그 핸들 */}
      <td className="pl-3 pr-0 py-4 w-8">
        <button
          {...dragHandleAttributes}
          {...dragHandleListeners}
          className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 touch-none p-1 rounded transition-colors"
          title="드래그하여 순서 변경"
          aria-label="순서 변경"
        >
          <GripVertical className="w-4 h-4" />
        </button>
      </td>

      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
        {transaction.date}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-sky-100 text-sky-600">
          {transaction.subcategory?.name 
            ? `${transaction.category.name} > ${transaction.subcategory.name}` 
            : transaction.category.name}
        </span>
      </td>
      <td className="px-6 py-4 text-sm text-gray-700">
        {transaction.description}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {transaction.transferDetail ? (
          <div className="flex items-center gap-1.5">
            <span className="text-gray-500">{transaction.transferDetail.fromAccount.name}</span>
            <span className="text-gray-300">→</span>
            <span className="text-sky-700 font-medium bg-sky-50 px-1.5 py-0.5 rounded text-xs">{transaction.transferDetail.toAccount.name}</span>
          </div>
        ) : (
          transaction.account?.name ?? "-"
        )}
      </td>
      <td
        className={`px-6 py-4 whitespace-nowrap text-sm font-semibold text-right ${getTransactionColor(transaction as any, currentAccountId)}`}
      >
        {getTransactionSign(transaction as any, currentAccountId)}
        {Math.abs(transaction.amount).toLocaleString()}원
      </td>
      <td className="px-6 py-4 text-right">
        {/* ================= Desktop (md 이상) ================= */}
        <div className="hidden md:flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit(transaction)}
            className="p-2 rounded-md hover:bg-yellow-50 text-yellow-600"
            title="수정"
            aria-label="수정"
          >
            <Pencil className="w-4 h-4" />
          </button>

          <button
            onClick={() => onDelete(transaction.id)}
            className="p-2 rounded-md hover:bg-red-50 text-red-600"
            title="삭제"
            aria-label="삭제"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {/* ================= Mobile (md 미만) ================= */}
        <div className="relative md:hidden flex justify-end">
          <MobileActionMenu
            onEdit={() => onEdit(transaction)}
            onDelete={() => onDelete(transaction.id)}
          />
        </div>
      </td>
    </tr>
  );
});

export default LedgerRow;

function MobileActionMenu({
  onEdit,
  onDelete,
}: {
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="p-2 rounded-md hover:bg-gray-100"
        aria-label="메뉴 열기"
      >
        <MoreVertical className="w-4 h-4 text-gray-500" />
      </button>

      {open && (
        <div className="absolute right-0 z-10 mt-1 w-20 bg-white border border-gray-200 rounded-md shadow-lg">
          <button
            onClick={() => {
              onEdit();
              setOpen(false);
            }}
            className="w-full px-3 py-2 text-sm text-center hover:bg-gray-50"
          >
            수정
          </button>
          <button
            onClick={() => {
              onDelete();
              setOpen(false);
            }}
            className="w-full px-3 py-2 text-sm text-center text-red-600 hover:bg-red-50"
          >
            삭제
          </button>
        </div>
      )}
    </div>
  );
}
