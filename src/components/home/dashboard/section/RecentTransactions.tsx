import Link from "next/link";

interface Transaction {
  id: number;
  date: string;
  category: string;
  description: string;
  amount: number;
}

export default function RecentTransactions({ data }: { data: Transaction[] }) {
  return (
    <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-100 flex justify-between items-center">
        <h3 className="text-lg font-bold text-gray-800">최근 거래 내역</h3>
        <Link
          href="/home/transactions"
          className="text-sm text-sky-600 hover:underline"
        >
          더보기 &rarr;
        </Link>
      </div>

      <table className="w-full">
        <thead className="bg-gray-50 text-gray-500 text-sm">
          <tr>
            <th className="py-3 px-6 text-left">날짜</th>
            <th className="py-3 px-6 text-left">카테고리</th>
            <th className="py-3 px-6 text-left">내역</th>
            <th className="py-3 px-6 text-right">금액</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data.length === 0 ? (
            <tr>
              <td colSpan={4} className="py-8 text-center text-gray-400">
                거래 내역이 없습니다.
              </td>
            </tr>
          ) : (
            data.map((t) => (
              <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                <td className="py-4 px-6 text-gray-600">{t.date}</td>
                <td className="py-4 px-6">
                  <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs">
                    {t.category}
                  </span>
                </td>
                <td className="py-4 px-6 font-medium text-gray-800">
                  {t.description}
                </td>
                <td
                  className={`py-4 px-6 text-right font-bold ${
                    t.amount > 0 ? "text-blue-600" : "text-red-500"
                  }`}
                >
                  {t.amount > 0 ? "+" : ""}
                  {t.amount.toLocaleString()}원
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </section>
  );
}
