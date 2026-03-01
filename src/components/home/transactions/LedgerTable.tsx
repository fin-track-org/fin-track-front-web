import LedgerRow from "./LedgerRow";
import SkeletonRow from "./SkeletonRow";

interface Props {
  transactions: Transaction[];
  loading: boolean;
  error: string | null;
  onEdit: (t: Transaction) => void;
  onDelete: (id: number) => void;
}

function MobileTransactionCard({
  t,
  onEdit,
  onDelete,
}: {
  t: Transaction;
  onEdit: (t: Transaction) => void;
  onDelete: (id: number) => void;
}) {
  const isExpense = t.amount < 0;
  const amountAbs = Math.abs(t.amount).toLocaleString();

  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-gray-500">{t.date}</p>
          <p className="mt-1 font-semibold truncate">{t.description}</p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <span className="rounded-md px-2 py-1 bg-sky-100 text-sky-600">
              {t.category}
            </span>
            {/* TODO(api 확장): 결제수단 표시 */}
            <span className="rounded-md bg-gray-100 px-2 py-1 text-gray-700">
              결제수단(추가예정)
            </span>
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
              onClick={() => onEdit(t)}
              className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs hover:bg-gray-200"
            >
              수정
            </button>
            <button
              onClick={() => onDelete(t.id)}
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

export default function LedgerTable({
  transactions,
  loading,
  error,
  onEdit,
  onDelete,
}: Props) {
  // ✅ 모바일: 카드 리스트
  return (
    <>
      <div className="md:hidden space-y-3">
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

        {!loading && !error && transactions.length === 0 && (
          <div className="py-12 text-center text-gray-400">
            <p className="mb-1">거래 내역이 없습니다</p>
            <p className="text-sm">새 거래를 추가해보세요 ✨</p>
          </div>
        )}

        {!loading &&
          !error &&
          transactions.map((t) => (
            <MobileTransactionCard
              key={t.id}
              t={t}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
      </div>

      {/* ✅ 데스크탑: 테이블 */}
      <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full min-w-[900px]">
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
            {loading &&
              Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)}

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

            {!loading && !error && transactions.length === 0 && (
              <tr>
                <td colSpan={5}>
                  <div className="py-12 text-center text-gray-400">
                    <p className="mb-1">거래 내역이 없습니다</p>
                    <p className="text-sm">새 거래를 추가해보세요 ✨</p>
                  </div>
                </td>
              </tr>
            )}

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
      </div>
    </>
  );
}
