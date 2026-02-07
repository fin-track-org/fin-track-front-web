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
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              날짜
            </th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              카테고리
            </th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              설명
            </th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              결제수단
            </th>
            <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
              금액
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data.map((t) => (
            <tr key={t.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                {t.date}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    t.amount > 0
                      ? "bg-green-100 text-green-800"
                      : "bg-blue-100 text-blue-800"
                  }`}
                >
                  {t.category}
                </span>
              </td>
              <td className="px-6 py-4 text-sm text-gray-700">
                {t.description}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                결제수단
              </td>
              <td
                className={`px-6 py-4 whitespace-nowrap text-sm font-semibold text-right ${
                  t.amount > 0 ? "text-green-600" : "text-gray-900"
                }`}
              >
                {t.amount > 0 ? "+" : ""}₩{Math.abs(t.amount).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
