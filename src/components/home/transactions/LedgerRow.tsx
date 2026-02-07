interface Props {
  transaction: Transaction;
  onEdit: (t: Transaction) => void;
  onDelete: (id: number) => void;
}

export default function LedgerRow({ transaction, onEdit, onDelete }: Props) {
  return (
    <tr key={transaction.id} className="hover:bg-gray-50 transition-colors">
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
      <td className="p-4 text-center">
        {/* ⬇️ (E) 수정 버튼 클릭 시 handleEdit 호출 */}
        <button
          onClick={() => onEdit(transaction)}
          className=" text-yellow-600 hover:underline px-2"
        >
          수정
        </button>
        <button
          onClick={() => onDelete(transaction.id)}
          className=" text-red-600 hover:underline px-2"
        >
          삭제
        </button>
      </td>
    </tr>
  );
}
