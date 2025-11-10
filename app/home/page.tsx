// "use client", import, 로직 모두 제거 (layout.tsx로 이동)

import Link from "next/link";

export default function DashboardPage() {
  // 샘플 데이터 (나중에 API로 가져올 부분)
  const sampleTransactions = [
    { id: 1, date: "2025-11-04", description: "스타벅스 (커피)", amount: -5500 },
    { id: 2, date: "2025-11-03", description: "편의점 (간식)", amount: -2100 },
    { id: 3, date: "2025-11-01", description: "월급", amount: 3000000 },
  ];

  return (
    // 래퍼 <div>나 <main> 태그가 필요 없습니다. layout.tsx가 감싸주기 때문입니다.
    // Fragment(<></>)로 컨텐츠를 감싸줍니다.
    <>
      {/* 2-1. 요약 대시보드 (엑셀 느낌의 '셀' 카드) */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-lg font-semibold text-gray-700 mb-2">총 수입</h2>
          <p className="text-3xl font-bold text-sky-600">₩3,000,000</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-lg font-semibold text-gray-700 mb-2">총 지출</h2>
          <p className="text-3xl font-bold text-red-500">-₩7,600</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-lg font-semibold text-gray-700 mb-2">잔액</h2>
          <p className="text-3xl font-bold text-gray-800">₩2,992,400</p>
        </div>
      </section>

      {/* 2-2. 최근 거래 내역 (엑셀 '시트' 느낌의 테이블) */}
      <section className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-6 flex justify-between items-center border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">
            최근 거래 내역
          </h2>
          {/* "새 거래 추가" 버튼은 '가계부' 페이지로 옮겼습니다. */}
        </div>

        <table className="w-full min-w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="text-left p-4 font-semibold text-gray-600">날짜</th>
              <th className="text-left p-4 font-semibold text-gray-600">내역</th>
              <th className="text-right p-4 font-semibold text-gray-600">금액</th>
            </tr>
          </thead>
          <tbody>
            {sampleTransactions.map((item) => (
              <tr key={item.id} className="border-b border-gray-200 hover:bg-gray-50">
                <td className="p-4 text-gray-700">{item.date}</td>
                <td className="p-4 text-gray-900 font-medium">{item.description}</td>
                <td
                  className={`p-4 font-medium text-right ${item.amount > 0 ? 'text-sky-600' : 'text-red-500'
                    }`}
                >
                  {item.amount.toLocaleString()}원
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="p-4 text-center">
          <Link href="/home/transactions" className="text-sky-600 font-medium hover:text-sky-500">
            가계부에서 모든 내역 보기
          </Link>
        </div>
      </section>
    </>
  );
}