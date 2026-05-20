"use client";

import { useMemo } from "react";

interface CalendarData {
  date: string;
  income: number;
  expense: number;
  balance: number;
}

interface MonthlyCalendarProps {
  data: CalendarData[];
  currentMonth: Date;
  summary?: {
    balance: number;
    income: number;
    expense: number;
  };
}

export default function MonthlyCalendar({
  data,
  currentMonth,
  summary,
}: MonthlyCalendarProps) {
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    // 해당 월의 첫날과 마지막날
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // 첫날의 요일 (0=일요일)
    const startDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    // 날짜별 데이터 맵 생성
    const dataMap = new Map<string, CalendarData>();
    data.forEach((item) => {
      const dateKey = item.date.substring(8, 10); // "DD" 추출
      dataMap.set(dateKey, item);
    });

    // 달력 배열 생성 (앞 빈칸 + 실제 날짜들)
    const days: Array<{
      day: number | null;
      data: CalendarData | null;
    }> = [];

    // 앞쪽 빈칸 채우기
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push({ day: null, data: null });
    }

    // 실제 날짜 채우기
    for (let day = 1; day <= daysInMonth; day++) {
      const dayStr = day.toString().padStart(2, "0");
      const dayData = dataMap.get(dayStr) || null;
      days.push({ day, data: dayData });
    }

    return days;
  }, [data, currentMonth]);

  const weekDays = ["일", "월", "화", "수", "목", "금", "토"];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 xl:flex-2">
      <h3 className="text-lg font-bold text-gray-900 mb-4">이번 달 거래 현황</h3>

      {/* 요약 정보 */}
      {summary && (
        <div className="flex items-center gap-4 mb-4 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500">수입</span>
            <span className="text-sm font-semibold text-blue-600">
              +{summary.income.toLocaleString()}원
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500">지출</span>
            <span className="text-sm font-semibold text-red-600">
              -{summary.expense.toLocaleString()}원
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500">전체</span>
            <span className={`text-sm font-semibold ${summary.balance >= 0 ? "text-gray-800" : "text-orange-600"}`}>
              {summary.balance >= 0 ? "+" : ""}{summary.balance.toLocaleString()}원
            </span>
          </div>
        </div>
      )}

      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 gap-0 sm:gap-2 mb-2">
        {weekDays.map((day, idx) => (
          <div
            key={day}
            className={`text-center text-xs font-semibold py-2 ${
              idx === 0
                ? "text-red-500"
                : idx === 6
                ? "text-blue-500"
                : "text-gray-600"
            }`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* 달력 날짜 */}
      <div className="grid grid-cols-7 gap-0 sm:gap-2">
        {calendarDays.map((item, idx) => {
          const isWeekend = idx % 7 === 0 || idx % 7 === 6;
          const isSunday = idx % 7 === 0;

          return (
            <div
              key={idx}
              className={`min-h-20 sm:rounded-lg border transition-colors ${
                item.day
                  ? "border-gray-200 hover:border-sky-300 hover:shadow-sm bg-white"
                  : "border-transparent"
              }`}
            >
              {item.day && (
                <div className="p-2 h-full flex flex-col">
                  {/* 날짜 */}
                  <div
                    className={`text-sm font-semibold mb-1 ${
                      isSunday
                        ? "text-red-500"
                        : isWeekend
                        ? "text-blue-500"
                        : "text-gray-700"
                    }`}
                  >
                    {item.day}
                  </div>

                  {/* 수입/지출 데이터 */}
                  {item.data && (item.data.income > 0 || item.data.expense > 0) ? (
                    <div className="flex-1 flex flex-col gap-1 text-xs">
                      {item.data.income > 0 && (
                        <div className="flex items-center justify-end bg-blue-50 sm:rounded px-1 sm:px-1.5 py-0.5">
                          <span className="text-blue-700 font-semibold text-[9px] sm:text-xs">
                            +{item.data.income.toLocaleString()}
                          </span>
                        </div>
                      )}
                      {item.data.expense > 0 && (
                        <div className="flex items-center justify-end bg-red-50 sm:rounded px-1 sm:px-1.5 py-0.5">
                          <span className="text-red-700 font-semibold text-[9px] sm:text-xs">
                            -{item.data.expense.toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-center">
                      <span className="text-gray-300 text-xs">-</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 범례 */}
      <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-center gap-6 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-100 rounded"></div>
          <span className="text-gray-600">수입</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-100 rounded"></div>
          <span className="text-gray-600">지출</span>
        </div>
      </div>
    </div>
  );
}
