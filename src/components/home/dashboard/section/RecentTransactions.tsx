"use client";

import Link from "next/link";
import { useMemo } from "react";

export default function RecentTransactions({
  data,
  categories,
}: {
  data: RecentTransaction[];
  categories: Category[];
}) {
  const categoryNameById = useMemo(() => {
    return Object.fromEntries(categories.map((c) => [c.id, c.name]));
  }, [categories]);

  const hasData = data && data.length > 0;

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

      {/* 데이터 없을 때 */}
      {!hasData && (
        <div className="py-16 text-center text-gray-400">
          <p className="mb-2">최근 거래 내역이 없습니다</p>
          <p className="text-sm">첫 거래를 추가해보세요 ✨</p>
        </div>
      )}

      {/* 모바일 카드 */}
      {hasData && (
        <div className="md:hidden divide-y divide-gray-100">
          {data.map((t) => {
            const label = categoryNameById[t.category] ?? t.category;
            const isExpense = t.type === "EXPENSE";
            const absAmount = Math.abs(t.amount).toLocaleString();

            return (
              <div key={t.id} className="p-4 flex justify-between items-start">
                <div className="min-w-0">
                  <p className="text-xs text-gray-500">{t.date}</p>
                  <p className="font-medium truncate mt-1">{t.description}</p>
                  <div className="mt-2 flex gap-2 flex-wrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {label}
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <p
                    className={`font-semibold ${
                      isExpense ? "text-red-600" : "text-green-600"
                    }`}
                  >
                    {isExpense ? "-" : "+"}₩{absAmount}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 데스크탑 테이블 */}
      {hasData && (
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full min-w-[700px]">
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
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase">
                  금액
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {data.map((t) => {
                const label = categoryNameById[t.category] ?? t.category;
                const isExpense = t.type === "EXPENSE";
                const absAmount = Math.abs(t.amount).toLocaleString();

                return (
                  <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {t.date}
                    </td>

                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-sky-100 text-sky-800">
                        {label}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-sm text-gray-700">
                      {t.description}
                    </td>

                    <td
                      className={`px-6 py-4 text-sm font-semibold text-right ${
                        isExpense ? "text-red-600" : "text-green-600"
                      }`}
                    >
                      {isExpense ? "-" : "+"}₩{absAmount}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
