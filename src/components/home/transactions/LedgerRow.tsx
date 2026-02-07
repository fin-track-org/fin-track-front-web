import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";

interface Props {
  transaction: Transaction;
  onEdit: (t: Transaction) => void;
  onDelete: (id: number) => void;
}

export default function LedgerRow({ transaction, onEdit, onDelete }: Props) {
  return (
    <tr
      key={transaction.id}
      className="group hover:bg-gray-50 transition-colors"
    >
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
        {transaction.date}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            transaction.amount > 0
              ? "bg-green-100 text-green-800"
              : "bg-blue-100 text-blue-800"
          }`}
        >
          {transaction.category}
        </span>
      </td>
      <td className="px-6 py-4 text-sm text-gray-700">
        {transaction.description}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        결제수단
      </td>
      <td
        className={`px-6 py-4 whitespace-nowrap text-sm font-semibold text-right ${
          transaction.amount > 0 ? "text-green-600" : "text-gray-900"
        }`}
      >
        {transaction.amount > 0 ? "+" : ""}₩
        {Math.abs(transaction.amount).toLocaleString()}
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
}

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
