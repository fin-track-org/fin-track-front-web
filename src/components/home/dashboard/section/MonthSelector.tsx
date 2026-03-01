"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

export default function MonthSelector({
  currentMonth,
  onPrev,
  onNext,
}: {
  currentMonth: Date;
  onPrev: () => void;
  onNext: () => void;
}) {
  const monthName = currentMonth.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
  });

  const today = new Date().toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  return (
    <div className="w-full">
      {/* 상단: 월 이동 + 타이틀 */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 sm:gap-4">
          <button
            onClick={onPrev}
            className="inline-flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 hover:bg-gray-200 rounded-lg transition-colors"
            aria-label="이전 달"
          >
            <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />
          </button>

          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight">
            {monthName}
          </h1>

          <button
            onClick={onNext}
            className="inline-flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 hover:bg-gray-200 rounded-lg transition-colors"
            aria-label="다음 달"
          >
            <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />
          </button>
        </div>
      </div>

      {/* 하단: 오늘 문구 */}
      <div className="mt-1 sm:mt-2 text-gray-500 text-xs sm:text-sm wrap-break-word">
        오늘은 <span className="font-medium text-gray-600">{today}</span>{" "}
        입니다.
      </div>
    </div>
  );
}
