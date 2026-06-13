"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

export default function MonthSelector({
  currentMonth,
  onPrev,
  onNext,
  compact = false,
}: {
  currentMonth: Date;
  onPrev: () => void;
  onNext: () => void;
  compact?: boolean;
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
    <div className={`w-full ${compact ? 'flex items-center' : ''}`}>
      {/* 상단: 월 이동 + 타이틀 */}
      <div className={`flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between`}>
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={onPrev}
            className={`inline-flex items-center justify-center ${compact ? 'w-8 h-8' : 'w-9 h-9 sm:w-10 sm:h-10'} hover:bg-gray-200 rounded-lg transition-colors`}
            aria-label="이전 달"
          >
            <ChevronLeft className={`${compact ? 'w-4 h-4' : 'w-5 h-5 sm:w-6 sm:h-6'} text-gray-600`} />
          </button>

          <h1 className={`${compact ? 'text-lg sm:text-xl' : 'text-2xl sm:text-3xl'} font-bold text-gray-900 leading-tight min-w-[100px] text-center`}>
            {monthName}
          </h1>

          <button
            onClick={onNext}
            className={`inline-flex items-center justify-center ${compact ? 'w-8 h-8' : 'w-9 h-9 sm:w-10 sm:h-10'} hover:bg-gray-200 rounded-lg transition-colors`}
            aria-label="다음 달"
          >
            <ChevronRight className={`${compact ? 'w-4 h-4' : 'w-5 h-5 sm:w-6 sm:h-6'} text-gray-600`} />
          </button>
        </div>
      </div>

      {/* 하단: 오늘 문구 (compact 모드일 땐 숨김) */}
      {!compact && (
        <div className="mt-1 sm:mt-2 ml-2 text-gray-500 text-sm sm:text-base wrap-break-word">
          오늘은 <span className="font-medium text-gray-600">{today}</span>{" "}
          입니다.
        </div>
      )}
    </div>
  );
}
