import { GripVertical, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { forwardRef, useState } from "react";
import { getTransactionColor, getTransactionSign, getAccountIcon } from "@/src/lib/transactionUtils";
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
  isExcelView?: boolean;
}

const LedgerRow = forwardRef<HTMLTableRowElement, Props>(function LedgerRow(
  { transaction, onEdit, onDelete, dragHandleAttributes, dragHandleListeners, style, currentAccountId, isExcelView = true },
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
      <td className={`${isExcelView ? "border border-gray-300 px-1 md:px-2 py-1 md:py-1.5 w-6 md:w-8 text-center hidden md:table-cell" : "pl-3 pr-0 py-4 w-8"}`}>
        <button
          {...dragHandleAttributes}
          {...dragHandleListeners}
          className={`cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 touch-none p-1 rounded transition-colors ${isExcelView ? "inline-block" : ""}`}
          title="드래그하여 순서 변경"
          aria-label="순서 변경"
        >
          <GripVertical className="w-4 h-4" />
        </button>
      </td>

      <td className={`${isExcelView ? "border border-gray-300 px-1 md:px-4 py-1 md:py-1.5 text-center text-gray-700" : "px-6 py-4 text-gray-700"} whitespace-nowrap text-[10px] md:text-sm hidden md:table-cell`}>
        {transaction.date}
      </td>
      <td className={`${isExcelView ? "border border-gray-300 px-1 md:px-4 py-1 md:py-1.5 text-center" : "px-6 py-4"} whitespace-nowrap max-w-[80px] md:max-w-none overflow-hidden text-ellipsis`}>
        <span className={`inline-flex items-center font-medium bg-sky-100 text-sky-600 ${isExcelView ? "px-1 md:px-2 py-0.5 rounded text-[9px] md:text-xs truncate max-w-full" : "px-2.5 py-0.5 rounded-full text-sm"}`}>
          {transaction.subcategory?.name 
            ? `${transaction.category.name} > ${transaction.subcategory.name}` 
            : transaction.category.name}
        </span>
      </td>
      <td className={`${isExcelView ? "border border-gray-300 px-1 md:px-4 py-1 md:py-1.5" : "px-6 py-4 hidden sm:table-cell"} text-[10px] md:text-sm text-gray-700 max-w-[80px] md:max-w-[200px] truncate`}>
        {transaction.description}
      </td>

      {(() => {
        const sign = getTransactionSign(transaction as any, currentAccountId);
        const colorClass = getTransactionColor(transaction as any, currentAccountId);
        const amountStr = Math.abs(transaction.amount).toLocaleString() + "원";

        if (sign === "+") {
          return (
            <>
              <td className={`${isExcelView ? "border border-gray-300 px-1 md:px-4 py-1 md:py-1.5" : "px-6 py-4"} whitespace-nowrap text-right text-[10px] md:text-sm font-semibold ${colorClass}`}>
                +{amountStr}
              </td>
              <td className={`${isExcelView ? "border border-gray-300 px-1 md:px-4 py-1 md:py-1.5" : "px-6 py-4"} whitespace-nowrap text-right text-[10px] md:text-sm font-semibold text-gray-300`}>
              </td>
            </>
          );
        } else if (sign === "-") {
          return (
            <>
              <td className={`${isExcelView ? "border border-gray-300 px-1 md:px-4 py-1 md:py-1.5" : "px-6 py-4"} whitespace-nowrap text-right text-[10px] md:text-sm font-semibold text-gray-300`}>
              </td>
              <td className={`${isExcelView ? "border border-gray-300 px-1 md:px-4 py-1 md:py-1.5" : "px-6 py-4"} whitespace-nowrap text-right text-[10px] md:text-sm font-semibold ${colorClass}`}>
                -{amountStr}
              </td>
            </>
          );
        } else {
          // Transfer without global balance change
          return (
            <td colSpan={2} className={`${isExcelView ? "border border-gray-300 px-1 md:px-4 py-1 md:py-1.5" : "px-6 py-4"} whitespace-nowrap text-center text-[10px] md:text-sm font-medium ${colorClass}`}>
              {amountStr}
            </td>
          );
        }
      })()}
      <td className={`${isExcelView ? "border border-gray-300 px-1 md:px-4 py-1 md:py-1.5" : "px-6 py-4"} whitespace-nowrap text-right text-[10px] md:text-sm font-bold text-gray-700`}>
        {transaction.runningTotalBalance !== undefined ? `${transaction.runningTotalBalance.toLocaleString()}원` : "-"}
      </td>
      <td className={`${isExcelView ? "border border-gray-300 px-1 md:px-4 py-1 md:py-1.5" : "px-6 py-4"} whitespace-nowrap text-right text-[10px] md:text-sm font-bold text-sky-700 bg-sky-50/30`}>
        {transaction.runningLinkedAccountBalance !== undefined ? (
          <div className="flex flex-col gap-1 items-end">
            <span className="text-gray-500">{transaction.runningAccountBalance !== undefined ? `${transaction.runningAccountBalance.toLocaleString()}원` : "-"}</span>
            <span>{`${transaction.runningLinkedAccountBalance.toLocaleString()}원`}</span>
          </div>
        ) : (
          transaction.runningAccountBalance !== undefined ? `${transaction.runningAccountBalance.toLocaleString()}원` : "-"
        )}
      </td>
      <td className={`${isExcelView ? "border border-gray-300 px-1 md:px-4 py-1 md:py-1.5 text-center" : "px-6 py-4"} whitespace-nowrap text-[10px] md:text-sm text-gray-600 overflow-hidden text-ellipsis`}>
        {transaction.transferDetail && transaction.runningLinkedAccountBalance !== undefined ? (
          <div className={`flex flex-col gap-1 ${isExcelView ? "items-center" : "items-start"}`}>
            <span className="text-gray-500 truncate max-w-[100px]">{getAccountIcon(transaction.transferDetail.fromAccount.type)} {transaction.transferDetail.fromAccount.name} (출금)</span>
            <span className="font-medium text-sky-700 truncate max-w-[100px]">{getAccountIcon(transaction.transferDetail.toAccount.type)} {transaction.transferDetail.toAccount.name} (입금)</span>
          </div>
        ) : transaction.transferDetail ? (
          <div className={`flex items-center gap-0.5 md:gap-1.5 ${isExcelView ? "justify-center" : ""}`}>
            <span className="text-gray-500 truncate max-w-[50px] md:max-w-[80px]">{getAccountIcon(transaction.transferDetail.fromAccount.type)} {transaction.transferDetail.fromAccount.name}</span>
            <span className="text-gray-300">→</span>
            <span className={`font-medium px-1 md:px-1.5 py-0.5 rounded text-[9px] md:text-xs truncate max-w-[50px] md:max-w-[80px] ${isExcelView ? "text-gray-700 bg-gray-100" : "text-sky-700 bg-sky-50"}`}>{getAccountIcon(transaction.transferDetail.toAccount.type)} {transaction.transferDetail.toAccount.name}</span>
          </div>
        ) : (
          <span>{getAccountIcon(transaction.account?.type || "")} {transaction.account?.name}</span>
        )}
      </td>
      <td className={`${isExcelView ? "border border-gray-300 px-1 md:px-2 py-1 md:py-1.5 text-center" : "px-6 py-4 text-right"} whitespace-nowrap`}>
        <div className={`flex items-center gap-0.5 md:gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity ${isExcelView ? "justify-center" : "justify-end"}`}>
          <button
            onClick={() => onEdit(transaction)}
            className="p-1 md:p-2 rounded-md hover:bg-yellow-50 text-yellow-600"
            title="수정"
            aria-label="수정"
          >
            <Pencil className="w-3 h-3 md:w-4 md:h-4" />
          </button>

          <button
            onClick={() => onDelete(transaction.id)}
            className="p-1 md:p-2 rounded-md hover:bg-red-50 text-red-600"
            title="삭제"
            aria-label="삭제"
          >
            <Trash2 className="w-3 h-3 md:w-4 md:h-4" />
          </button>
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
