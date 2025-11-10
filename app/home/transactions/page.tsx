// "use client"; // 나중에 CRUD 기능을 위해 클라이언트 컴포넌트로 변경해야 할 수 있습니다.

// 가짜 엑셀 시트 데이터 (나중에 Spring Boot API로 받아올 데이터)
const fullLedgerData = [
    { id: 1, date: "2025-11-04", category: "식비", description: "스타벅스 (커피)", amount: -5500 },
    { id: 2, date: "2025-11-03", category: "간식", description: "편의점 (간식)", amount: -2100 },
    { id: 3, date: "2025-11-01", category: "급여", description: "월급", amount: 3000000 },
    { id: 4, date: "2025-10-30", category: "교통", description: "택시비 (야근)", amount: -12000 },
    { id: 5, date: "2025-10-28", category: "문화생활", description: "영화 관람", amount: -15000 },
];

export default function LedgerPage() {
    return (
        <section className="bg-white rounded-lg shadow-md overflow-hidden">

            {/* 페이지 헤더 (새 거래 추가 버튼) */}
            <div className="p-6 flex justify-between items-center border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-800">
                    전체 가계부 내역
                </h2>
                <button className="bg-sky-500 text-white px-5 py-2 rounded-lg font-medium hover:bg-sky-600 transition-colors">
                    + 새 거래 추가
                </button>
            </div>

            {/* 필터 및 검색 (선택 사항) */}
            <div className="p-4 bg-gray-50 border-b border-gray-200">
                <input
                    type="text"
                    placeholder="내역 검색..."
                    className="px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                />
                {/* ... (날짜 필터 등) ... */}
            </div>

            {/* 엑셀 시트형 테이블 (더 많은 열 추가) */}
            <table className="w-full min-w-full">
                <thead className="bg-gray-100">
                    <tr>
                        <th className="text-left p-4 font-semibold text-gray-600">날짜</th>
                        <th className="text-left p-4 font-semibold text-gray-600">카테고리</th>
                        <th className="text-left p-4 font-semibold text-gray-600">내역</th>
                        <th className="text-right p-4 font-semibold text-gray-600">금액</th>
                        <th className="text-center p-4 font-semibold text-gray-600">관리</th>
                    </tr>
                </thead>
                <tbody>
                    {fullLedgerData.map((item) => (
                        <tr key={item.id} className="border-b border-gray-200 hover:bg-gray-50">
                            <td className="p-4 text-gray-700">{item.date}</td>
                            <td className="p-4 text-gray-700">{item.category}</td>
                            <td className="p-4 text-gray-900 font-medium">{item.description}</td>
                            <td
                                className={`p-4 font-medium text-right ${item.amount > 0 ? 'text-sky-600' : 'text-red-500'
                                    }`}
                            >
                                {item.amount.toLocaleString()}원
                            </td>
                            <td className="p-4 text-center">
                                <button className="text-yellow-600 hover:underline px-2">수정</button>
                                <button className="text-red-600 hover:underline px-2">삭제</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </section>
    );
}