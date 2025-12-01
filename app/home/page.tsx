"use client"; // 👈 (1) "use client"로 변경 (데이터 fetching, 훅 사용)

import { useState, useEffect } from 'react';
import Link from 'next/link';
// 👈 (2) 임포트 경로를 'app/' 폴더 기준으로 수정합니다.
import { createClient } from '../../lib/supabase/client'; 

// (3) .env.local에서 Spring Boot URL을 읽어옵니다. (서버 재시작 필수!)
const SPRING_BOOT_URL = process.env.NEXT_PUBLIC_SPRING_BOOT_URL!;

// (4) API 응답 데이터의 타입 정의 (Transaction 엔티티와 일치)
interface Transaction {
  id: number;
  date: string;
  category: string;
  description: string;
  amount: number;
}

// (5) 요약 정보를 저장할 타입 정의
interface Summary {
  income: number;
  expense: number;
  balance: number;
}

export default function DashboardPage() {
  const supabase = createClient();

  // (6) 샘플 데이터 대신, API 데이터를 저장할 State
  const [summary, setSummary] = useState<Summary>({ income: 0, expense: 0, balance: 0 });
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // (7) API로부터 데이터를 불러오는 함수
  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      // [JWT 가져오기]
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("로그인이 필요합니다.");
      }
      const token = session.access_token;

      // [모든 거래 내역 가져오기]
      const response = await fetch(`${SPRING_BOOT_URL}/api/v1/transactions`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error("데이터를 불러오는 데 실패했습니다.");
      }

      const responseData = await response.json();
      
      if (responseData.statusCode === 0 && responseData.data) {
        const allTransactions: Transaction[] = responseData.data;

        // [데이터 가공] --------------------------------
        
        // (8) "요약 정보" 계산하기
        const newSummary = allTransactions.reduce((acc, transaction) => {
          if (transaction.amount > 0) {
            acc.income += transaction.amount;
          } else {
            acc.expense += transaction.amount;
          }
          acc.balance = acc.income + acc.expense;
          return acc;
        }, { income: 0, expense: 0, balance: 0 });
        
        setSummary(newSummary);

        // (9) "최근 거래 내역" 3개만 자르기 (API가 이미 날짜순 정렬)
        setRecentTransactions(allTransactions.slice(0, 3));
        // ---------------------------------------------
        
      } else {
        throw new Error(responseData.message || "데이터 형식이 올바르지 않습니다.");
      }

    } catch (err: any) {
      console.error("Fetch Error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // (10) 페이지가 처음 로드될 때, 데이터를 1번 불러옵니다.
  useEffect(() => {
    fetchDashboardData();
  }, []);

  return (
    <>
      {/* 2-1. 요약 대시보드 */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-lg font-semibold text-gray-700 mb-2">총 수입</h2>
          {/* (11) 'summary' State에서 데이터 표시 */}
          <p className="text-3xl font-bold text-sky-600">
            {loading ? '...' : `${summary.income.toLocaleString()}원`}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-lg font-semibold text-gray-700 mb-2">총 지출</h2>
          <p className="text-3xl font-bold text-red-500">
            {loading ? '...' : `${summary.expense.toLocaleString()}원`}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-lg font-semibold text-gray-700 mb-2">잔액</h2>
          <p className="text-3xl font-bold text-gray-800">
            {loading ? '...' : `${summary.balance.toLocaleString()}원`}
          </p>
        </div>
      </section>

      {/* 2-2. 최근 거래 내역 */}
      <section className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-6 flex justify-between items-center border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">
            최근 거래 내역
          </h2>
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
            {/* (12) 로딩 및 에러 상태 처리 */}
            {loading && (
              <tr><td colSpan={3} className="p-4 text-center text-gray-500">데이터를 불러오는 중...</td></tr>
            )}
            {error && (
              <tr><td colSpan={3} className="p-4 text-center text-red-500">{error}</td></tr>
            )}
            {!loading && !error && recentTransactions.length === 0 && (
              <tr><td colSpan={3} className="p-4 text-center text-gray-500">최근 거래 내역이 없습니다.</td></tr>
            )}

            {/* (13) 'recentTransactions' State로 목록 렌더링 */}
            {recentTransactions.map((item) => (
              <tr key={item.id} className="border-b border-gray-200 hover:bg-gray-50">
                <td className="p-4 text-gray-700">{item.date}</td>
                <td className="p-4 text-gray-900 font-medium">{item.description}</td>
                <td
                  className={`p-4 font-medium text-right ${
                    item.amount > 0 ? 'text-sky-600' : 'text-red-500'
                  }`}
                >
                  {item.amount.toLocaleString()}원
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="p-4 text-center">
          {/* (14) Link 태그로 변경 (basePath 자동 적용) */}
          <Link href="/home/transactions" className="text-sky-600 font-medium hover:text-sky-500">
            가계부에서 모든 내역 보기
          </Link>
        </div>
      </section>
    </>
  );
}