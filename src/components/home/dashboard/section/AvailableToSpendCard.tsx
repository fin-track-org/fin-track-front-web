/* eslint-disable react-hooks/purity */
"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Wallet, Settings, AlertTriangle } from "lucide-react";
import { getDashboardAvailable } from "@/src/lib/api/dashboard/available";

export default function AvailableToSpendCard() {
  const router = useRouter();

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

  if (!data.hasBudget) {
    return (
      <section className="p-6 bg-white rounded-xl shadow-sm border border-gray-100 flex items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-medium text-gray-500 mb-1">
            오늘 사용 가능한 금액
          </h3>
          <p className="text-sm text-gray-600">
            아직 변동비 예산을 설정하지 않았어요
          </p>
        </div>
        <button
          onClick={() => router.push("/home/profile")}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition text-sm font-medium whitespace-nowrap"
        >
          <Settings className="w-4 h-4" />
          예산 설정하기
        </button>
      </section>
    );
  }

  const isOverBudget = data.remainingThisMonth === 0;

  return (
    <section className="p-6 bg-white rounded-xl shadow-sm border border-gray-100">
      {isOverBudget ? (
        <div className="flex items-center gap-2 mb-4 text-red-600">
          <AlertTriangle className="w-4 h-4" />
          <span className="text-sm font-medium">
            이번 달 변동비 예산을 초과했어요
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
              isOverBudget ? "text-red-600" : "text-gray-900"
            }`}
          >
            {data.todayAvailable.toLocaleString("ko-KR")}원
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">이번 주</p>
          <p
            className={`text-xl lg:text-2xl font-bold ${
              isOverBudget ? "text-red-600" : "text-gray-900"
            }`}
          >
            {data.weekAvailable.toLocaleString("ko-KR")}원
          </p>
        </div>
      </div>

      <p className="text-xs text-gray-400 mt-4">
        설정하신 변동비 예산(고정비 제외) 기준으로 계산돼요
      </p>
    </section>
  );
}
