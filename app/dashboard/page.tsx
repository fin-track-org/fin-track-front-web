"use client"; // 👈 (1) "use client"로 변경 (이벤트 핸들러, 라우터 사용)

import { useRouter } from 'next/navigation'; // 👈 (2) useRouter 임포트
import { createClient } from '../../lib/supabase/client'; // 👈 (3) Supabase 클라이언트 임포트 (경로 수정)

export default function Home() {
  const router = useRouter(); // 👈 (4) 라우터 기능 준비
  const supabase = createClient(); // 👈 (5) Supabase 클라이언트 준비

  // (6) 로그아웃 버튼 클릭 시 실행될 함수
  const handleLogout = async () => {
    // (7) Supabase에서 로그아웃 (쿠키/세션 삭제)
    await supabase.auth.signOut();
    // (8) 로그인 페이지로 강제 이동
    router.push('/login');
  };

  // 나중에는 이 데이터가 Spring Boot API로부터 오게 됩니다.
  const sampleTransactions = [
    { id: 1, date: "2025-11-04", description: "스타벅스 (커피)", amount: -5500 },
    { id: 2, date: "2025-11-03", description: "편의점 (간식)", amount: -2100 },
    { id: 3, date: "2025-11-01", description: "월급", amount: 3000000 },
  ];

  return (
    // 전체 페이지 배경 (옅은 회색)
    <div className="min-h-screen bg-gray-50">

      {/* 1. 상단 헤더 (GNB) */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <nav className="container mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-sky-700">
            FinTrack
          </h1>
          {/* (9) 로그아웃 버튼에 onClick 이벤트 핸들러 연결 */}
          <button 
            onClick={handleLogout} 
            className="bg-sky-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-sky-600 transition-colors"
          >
            로그아웃
          </button>
        </nav>
      </header>

      {/* 2. 메인 컨텐츠 영역 */}
      <main className="container mx-auto px-6 py-8">

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
            <button className="bg-sky-500 text-white px-5 py-2 rounded-lg font-medium hover:bg-sky-600 transition-colors">
              + 새 거래 추가
            </button>
          </div>

          {/* 테이블 */}
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

          {/* 테이블 푸터 (더보기) */}
          <div className="p-4 text-center">
            <a href="#" className="text-sky-600 font-medium hover:text-sky-500">
              모든 내역 보기
            </a>
          </div>
        </section>

      </main>
    </div>
  );
}