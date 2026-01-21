"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
// ⬇️ 상대 경로 대신 Next.js 표준 별칭(@)을 사용하여 경로 오류 방지
import { createClient } from '@/lib/supabase/client';
// 📊 차트 라이브러리 임포트
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, Legend
} from 'recharts';

const SPRING_BOOT_URL = process.env.NEXT_PUBLIC_SPRING_BOOT_URL!;

interface Transaction {
  id: number;
  date: string;
  category: string;
  description: string;
  amount: number;
}

interface Summary {
  income: number;
  expense: number;
  balance: number;
}

// 차트용 데이터 타입
interface ChartData {
  name: string;
  value: number;
  [key: string]: any;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function DashboardPage() {
  const supabase = createClient();

  const [summary, setSummary] = useState<Summary>({ income: 0, expense: 0, balance: 0 });
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  // 📊 차트용 상태 추가
  const [pieData, setPieData] = useState<ChartData[]>([]);
  const [barData, setBarData] = useState<any[]>([]); // 일별 추이 데이터

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("로그인이 필요합니다.");
      const token = session.access_token;

      const response = await fetch(`${SPRING_BOOT_URL}/api/v1/transactions`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error("데이터를 불러오는데 실패했습니다.");

      const responseData = await response.json();

      if (responseData.statusCode === 0 && responseData.data) {
        const allTransactions: Transaction[] = responseData.data;

        // 1. 요약 정보 계산
        const newSummary = allTransactions.reduce((acc, t) => {
          if (t.amount > 0) acc.income += t.amount;
          else acc.expense += Math.abs(t.amount); // 지출은 양수로 변환하여 합산
          return acc;
        }, { income: 0, expense: 0, balance: 0 });
        newSummary.balance = newSummary.income - newSummary.expense;
        setSummary(newSummary);

        // 2. 최근 내역 (PC용)
        setRecentTransactions(allTransactions.slice(0, 5));

        // 3. 📱 모바일용: 카테고리별 지출 (Pie Chart)
        const categoryMap: { [key: string]: number } = {};
        allTransactions.forEach(t => {
          if (t.amount < 0) { // 지출만 집계
            const amt = Math.abs(t.amount);
            categoryMap[t.category] = (categoryMap[t.category] || 0) + amt;
          }
        });
        const newPieData = Object.keys(categoryMap).map(key => ({
          name: key,
          value: categoryMap[key]
        }));
        setPieData(newPieData);

        // 4. 🖥️ PC용: 최근 7일 입출금 추이 (Bar Chart)
        // (실제로는 날짜별로 그룹핑 로직이 필요하지만, 여기서는 간단하게 최근 5건을 보여줍니다)
        const reversedTx = [...allTransactions].reverse().slice(-7); // 최근 7개
        const newBarData = reversedTx.map(t => ({
          date: t.date.substring(5), // 월-일만 표시
          income: t.amount > 0 ? t.amount : 0,
          expense: t.amount < 0 ? Math.abs(t.amount) : 0,
        }));
        setBarData(newBarData);

      } else {
        throw new Error(responseData.message || "데이터 형식이 올바르지 않습니다.");
      }

    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return (
    <div className="space-y-6">

      {/* 1. 공통 요약 카드 (반응형 그리드) */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 잔액 (가장 중요하므로 첫 번째) */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <h2 className="text-sm font-medium text-gray-500">현재 잔액</h2>
          <p className={`text-3xl font-bold ${summary.balance >= 0 ? 'text-gray-800' : 'text-red-500'}`}>
            {loading ? '...' : `${summary.balance.toLocaleString()}원`}
          </p>
        </div>

        {/* 수입/지출 (모바일에서는 작게 보임) */}
        <div className="grid grid-cols-2 gap-4 md:col-span-2">
          <div className="bg-blue-50 p-6 rounded-xl border border-blue-100">
            <h2 className="text-sm font-medium text-blue-600">이번 달 수입</h2>
            <p className="text-xl md:text-2xl font-bold text-blue-700 mt-1">
              {loading ? '...' : `+${summary.income.toLocaleString()}`}
            </p>
          </div>
          <div className="bg-red-50 p-6 rounded-xl border border-red-100">
            <h2 className="text-sm font-medium text-red-600">이번 달 지출</h2>
            <p className="text-xl md:text-2xl font-bold text-red-700 mt-1">
              {loading ? '...' : `-${summary.expense.toLocaleString()}`}
            </p>
          </div>
        </div>
      </section>

      {/* 2. 📱 모바일 전용: 시각적 통계 (Pie Chart) */}
      <section className="block md:hidden bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-bold text-gray-800 mb-4">지출 분석 (Top 5)</h3>
        <div className="h-64 w-full flex justify-center items-center">
          {loading ? <p>로딩 중...</p> : pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip formatter={(value: any) => `${value.toLocaleString()}원`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-400">지출 내역이 없습니다.</p>
          )}
        </div>
      </section>

      {/* 3. 🖥️ PC 전용: 상세 차트 및 테이블 */}
      <div className="hidden md:block space-y-6">
        {/* PC 차트 (Bar Chart) */}
        <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-6">최근 7건 흐름</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData}>
                <XAxis dataKey="date" />
                <YAxis />
                <RechartsTooltip />
                <Legend />
                <Bar dataKey="income" name="수입" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name="지출" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* 최근 거래 내역 테이블 */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center">
            <h3 className="text-lg font-bold text-gray-800">최근 거래 내역</h3>
            <Link href="/home/transactions" className="text-sm text-sky-600 hover:underline">
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
              {recentTransactions.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                  <td className="py-4 px-6 text-gray-600">{t.date}</td>
                  <td className="py-4 px-6">
                    <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs">
                      {t.category}
                    </span>
                  </td>
                  <td className="py-4 px-6 font-medium text-gray-800">{t.description}</td>
                  <td className={`py-4 px-6 text-right font-bold ${t.amount > 0 ? 'text-blue-600' : 'text-red-500'}`}>
                    {t.amount.toLocaleString()}원
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      {/* 모바일 하단 플로팅 버튼 (빠른 입력 유도) */}
      <div className="md:hidden fixed bottom-6 right-6">
        <Link href="/home/transactions">
          <button className="bg-sky-600 text-white p-4 rounded-full shadow-lg hover:bg-sky-700 transition-colors flex items-center justify-center">
            <span className="text-2xl font-bold">+</span>
          </button>
        </Link>
      </div>

    </div>
  );
}