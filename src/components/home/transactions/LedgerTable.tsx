import LedgerRow from "./LedgerRow";
import SkeletonRow from "./SkeletonRow";

interface Props {
  transactions: Transaction[];
  loading: boolean;
  error: string | null;
  onEdit: (t: Transaction) => void;
  onDelete: (id: number) => void;
}

export default function LedgerTable({
  transactions,
  loading,
  error,
  onEdit,
  onDelete,
}: Props) {
  return (
    <table className="w-full min-w-full">
      <thead className="bg-gray-50 text-gray-500 text-sm">
        <tr>
          <th className="px-6 py-3 text-left text-xs font-semibold uppercase">
            날짜
          </th>
          <th className="px-6 py-3 text-left text-xs font-semibold uppercase">
            카테고리
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

      <tbody>
        {/* Loading */}
        {loading &&
          Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)}

        {/* Error */}
        {!loading && error && (
          <tr>
            <td colSpan={6}>
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
        )}

        {/* Empty */}
        {!loading && !error && transactions.length === 0 && (
          <tr>
            <td colSpan={6}>
              <div className="py-12 text-center text-gray-400">
                <p className="mb-1">거래 내역이 없습니다</p>
                <p className="text-sm">새 거래를 추가해보세요 ✨</p>
              </div>
            </td>
          </tr>
        )}

        {/* Data */}
        {!loading &&
          !error &&
          transactions.map((t) => (
            <LedgerRow
              key={t.id}
              transaction={t}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
      </tbody>
    </table>
  );
}
