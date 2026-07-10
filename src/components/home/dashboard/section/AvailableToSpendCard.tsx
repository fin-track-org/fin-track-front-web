/* eslint-disable react-hooks/purity */
"use client";

import { useQuery } from "@tanstack/react-query";
import { Wallet, AlertTriangle } from "lucide-react";
import { getDashboardAvailable } from "@/src/lib/api/dashboard/available";

export default function AvailableToSpendCard() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["dashboardAvailable"],
    queryFn: getDashboardAvailable,
    retry: false,
  });

  if (isLoading) {
    return (
      <section className="p-6 bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="grid grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="space-y-2 animate-pulse">
              <div className="h-4 w-20 bg-gray-200 rounded" />
              <div className="h-7 w-28 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (isError || !data) {
    return null;
  }

  // 고정비로 예약해둔 금액이 실제 잔액보다 많으면(=잔액이 고정비를 감당 못하면) 경고 표시
  const isShort = data.realSpendableBalance < data.reservedForUnpaidFixed;

  return (
    <section className="p-6 bg-white rounded-xl shadow-sm border border-gray-100">
      {isShort ? (
        <div className="flex items-center gap-2 mb-4 text-red-600">
          <AlertTriangle className="w-4 h-4" />
          <span className="text-sm font-medium">
            이번 달 고정비를 감당하기엔 잔액이 부족해요
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-2 mb-4 text-gray-500">
          <Wallet size={16} />
          <span className="text-sm font-medium">오늘/이번 주 사용 가능한 금액</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-gray-500 mb-1">오늘</p>
          <p
            className={`text-xl lg:text-2xl font-bold ${
              isShort ? "text-red-600" : "text-gray-900"
            }`}
          >
            {data.todayAvailable.toLocaleString("ko-KR")}원
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">이번 주</p>
          <p
            className={`text-xl lg:text-2xl font-bold ${
              isShort ? "text-red-600" : "text-gray-900"
            }`}
          >
            {data.weekAvailable.toLocaleString("ko-KR")}원
          </p>
        </div>
      </div>

      <p className="text-xs text-gray-400 mt-4">
        저축/투자 계좌를 제외한 실제 잔액에서, 이번 달 아직 안 나간 고정비 예산을 미리 빼고 계산돼요
      </p>
    </section>
  );
}
