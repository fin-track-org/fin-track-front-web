"use client";

import { useState } from "react";
import { earnTestPoints, useTestPoints } from "@/src/lib/api/pointApi";

export default function ShopPage() {
  // TODO(REMOVE_LATER): 테스트용 상태 (나중에 삭제 예정)
  const [testResult, setTestResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleEarn = async () => {
    try {
      setLoading(true);
      const res = await earnTestPoints(100);
      setTestResult(`[성공] ${res}`);
    } catch (e: any) {
      setTestResult(`[실패] ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUse = async () => {
    try {
      setLoading(true);
      const res = await useTestPoints(50);
      setTestResult(`[성공] ${res}`);
    } catch (e: any) {
      setTestResult(`[실패] ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center">
      <div className="flex flex-col items-center gap-6 max-w-sm">
        {/* Icon */}
        <div className="w-20 h-20 rounded-2xl bg-neutral-100 flex items-center justify-center">
          <svg
            className="w-10 h-10 text-neutral-400"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
            />
          </svg>
        </div>

        {/* Badge */}
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-600 text-xs font-semibold tracking-wide">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          개발 중
        </span>

        {/* Title & Description */}
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold text-neutral-800 tracking-tight">
            상점
          </h1>
          <p className="text-sm text-neutral-400 leading-relaxed">
            포인트를 사용해 다양한 상품을 구매할 수 있는 상점을 준비하고 있어요.
            <br />
            조금만 기다려 주세요!
          </p>
        </div>

        {/* Divider */}
        <div className="w-12 h-px bg-neutral-200" />

        <p className="text-xs text-neutral-300">Coming Soon</p>

        {/* TODO(REMOVE_LATER): 테스트용 UI 구역 (나중에 통째로 삭제 예정) */}
        <div className="mt-8 p-6 bg-white border border-rose-200 rounded-xl w-full flex flex-col gap-4 shadow-sm relative">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-rose-100 text-rose-600 text-[10px] font-bold px-2 py-0.5 rounded">
            삭제 예정 (테스트용)
          </div>
          <p className="text-sm font-semibold text-gray-700">포인트 시스템 테스트</p>
          <div className="flex gap-2 w-full">
            <button
              disabled={loading}
              onClick={handleEarn}
              className="flex-1 bg-sky-50 text-sky-600 border border-sky-200 py-2 rounded-lg text-sm font-semibold hover:bg-sky-100 transition-colors"
            >
              +100P 적립
            </button>
            <button
              disabled={loading}
              onClick={handleUse}
              className="flex-1 bg-red-50 text-red-600 border border-red-200 py-2 rounded-lg text-sm font-semibold hover:bg-red-100 transition-colors"
            >
              -50P 차감
            </button>
          </div>
          {testResult && (
            <p className={`text-xs p-2 rounded break-all ${testResult.startsWith("[성공]") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
              {testResult}
            </p>
          )}
        </div>
        {/* 테스트용 UI 구역 끝 */}

      </div>
    </div>
  );
}
