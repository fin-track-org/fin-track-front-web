"use client";

import { useMemo, useState } from "react";

interface CalendarData {
  date: string;
  income: number;
  expense: number;
  savingsIncome: number;
  savingsExpense: number;
  balance: number;
}

interface MonthlyCalendarProps {
  data: CalendarData[];
  currentMonth: Date;
  summary?: {
    balance: number;
    income: number;
    expense: number;
    savingsIncome: number;
    savingsExpense: number;
  };
}

export default function MonthlyCalendar({
  data,
  currentMonth,
  summary,
}: MonthlyCalendarProps) {
  const [selectedDateData, setSelectedDateData] = useState<CalendarData | null>(null);
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

  // 금액 축약 포맷터 (예: 1,500,000 -> 150만)
  const formatCompact = (num: number) => {
    if (num === 0) return "";
    const abs = Math.abs(num);
    if (abs >= 10000) {
      return (num < 0 ? "-" : "+") + Math.floor(abs / 10000) + "만";
    }
    return (num > 0 ? "+" : "") + num.toLocaleString();
  };

  const weekDays = ["일", "월", "화", "수", "목", "금", "토"];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 sm:p-6 xl:flex-[3] flex flex-col w-full overflow-hidden">
      <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4 px-1">이번 달 거래 현황</h3>

      {/* 요약 정보 */}
      {summary && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mb-4 pb-4 border-b border-gray-100 px-1">
          <div className="flex items-center gap-1">
            <span className="text-[11px] sm:text-xs text-gray-500">수입</span>
            <span className="text-xs sm:text-sm font-semibold text-green-600">
              +{summary.income.toLocaleString()}원
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[11px] sm:text-xs text-gray-500">지출</span>
            <span className="text-xs sm:text-sm font-semibold text-red-600">
              -{summary.expense.toLocaleString()}원
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[11px] sm:text-xs text-gray-500">저축/투자</span>
            <span className="text-xs sm:text-sm font-semibold text-purple-600">
              -{summary.savingsExpense.toLocaleString()}원
            </span>
          </div>
          <div className="flex items-center gap-1 border-l border-gray-200 pl-3 ml-auto">
            <span className="text-[11px] sm:text-xs text-gray-500">전체</span>
            <span className={`text-xs sm:text-sm font-semibold ${summary.balance >= 0 ? "text-gray-900" : "text-gray-900"}`}>
              {summary.balance > 0 ? "+" : ""}{summary.balance.toLocaleString()}원
            </span>
          </div>
        </div>
      )}

      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 mb-1 px-[1px]">
        {weekDays.map((day, idx) => (
          <div
            key={day}
            className={`text-center text-[10px] sm:text-xs font-semibold py-1.5 ${
              idx === 0
                ? "text-red-500"
                : idx === 6
                ? "text-blue-500"
                : "text-gray-500"
            }`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* 달력 날짜 (gap-1px 트릭으로 1px 단일 보더 구현) */}
      <div className="grid grid-cols-7 gap-[1px] bg-gray-100 border border-gray-100 sm:rounded-lg overflow-hidden flex-1">
        {calendarDays.map((item, idx) => {
          const isWeekend = idx % 7 === 0 || idx % 7 === 6;
          const isSunday = idx % 7 === 0;

          return (
            <div
              key={idx}
              className={`min-h-[4.5rem] sm:min-h-[6rem] bg-white relative transition-colors ${
                item.day ? "hover:bg-sky-50 cursor-pointer" : ""
              }`}
              onClick={() => {
                if (item.data && (item.data.income > 0 || item.data.expense > 0 || item.data.savingsIncome > 0 || item.data.savingsExpense > 0)) {
                  setSelectedDateData(prev => prev?.date === item.data?.date ? null : item.data);
                }
              }}
            >
              {item.day && (
                <div className="p-1 sm:p-2 h-full flex flex-col">
                  {/* 날짜 */}
                  <div
                    className={`text-[10px] sm:text-sm font-semibold mb-0.5 sm:mb-1 pl-0.5 ${
                      isSunday
                        ? "text-red-500"
                        : isWeekend
                        ? "text-blue-500"
                        : "text-gray-700"
                    }`}
                  >
                    {item.day}
                  </div>

                  {/* 수입/지출/저축 데이터 (일일 순수익 + 도트) */}
                  {item.data && (item.data.income > 0 || item.data.expense > 0 || item.data.savingsIncome > 0 || item.data.savingsExpense > 0) ? (
                    (() => {
                      const dailyNetFlow = item.data.income + item.data.savingsIncome - item.data.expense - item.data.savingsExpense;
                      return (
                        <div className="flex-1 flex flex-col items-center justify-center gap-0.5 sm:gap-1.5 mt-0.5">
                          {/* 일일 순수익 금액 */}
                          <span className={`text-[8.5px] sm:text-xs font-bold truncate w-full text-center tracking-tighter sm:tracking-normal ${
                            dailyNetFlow === 0 ? "text-gray-400" : "text-gray-700"
                          }`}>
                            {formatCompact(dailyNetFlow)}
                          </span>
                          <div className="flex flex-wrap justify-center gap-[2px] sm:gap-1 px-0.5">
                            {item.data.income > 0 && <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-green-500"></div>}
                            {item.data.expense > 0 && <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-red-500"></div>}
                            {item.data.savingsIncome > 0 && <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-sky-500"></div>}
                            {item.data.savingsExpense > 0 && <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-purple-500"></div>}
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    <div className="flex-1 flex items-center justify-center">
                      <span className="text-gray-200 text-[10px]">-</span>
                    </div>
                  )}

                  {/* 날짜 클릭 시 뜨는 상세 요약 모달 (기존 말풍선 대체) */}
                  {selectedDateData?.date === item.data?.date && item.data && (
                    <>
                      {/* 외부 클릭 감지용 반투명 배경 */}
                      <div 
                        className="fixed inset-0 z-40 bg-black/10 sm:bg-transparent backdrop-blur-[1px] sm:backdrop-blur-none" 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDateData(null);
                        }}
                      />
                      
                      {/* 중앙 팝업 카드 */}
                      <div 
                        className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[220px] bg-white/95 backdrop-blur-md rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-gray-100/50 p-4 animate-in fade-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="text-[13px] font-bold text-gray-800">{item.data.date.substring(5).replace('-', '/')} 요약</h4>
                        </div>
                        
                        <div className="space-y-2">
                          {item.data.income > 0 && (
                            <div className="flex justify-between items-center text-[11px]">
                              <span className="text-gray-500 flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>수입
                              </span>
                              <span className="font-semibold text-green-600">+{item.data.income.toLocaleString()}</span>
                            </div>
                          )}
                          {item.data.expense > 0 && (
                            <div className="flex justify-between items-center text-[11px]">
                              <span className="text-gray-500 flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>지출
                              </span>
                              <span className="font-semibold text-red-600">-{item.data.expense.toLocaleString()}</span>
                            </div>
                          )}
                          {item.data.savingsIncome > 0 && (
                            <div className="flex justify-between items-center text-[11px]">
                              <span className="text-gray-500 flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 bg-sky-500 rounded-full"></div>수익/회수
                              </span>
                              <span className="font-semibold text-sky-600">+{item.data.savingsIncome.toLocaleString()}</span>
                            </div>
                          )}
                          {item.data.savingsExpense > 0 && (
                            <div className="flex justify-between items-center text-[11px]">
                              <span className="text-gray-500 flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 bg-purple-500 rounded-full"></div>저축/투자
                              </span>
                              <span className="font-semibold text-purple-600">-{item.data.savingsExpense.toLocaleString()}</span>
                            </div>
                          )}
                        </div>

                        <div className="border-t border-gray-100 pt-2.5 mt-3 flex justify-between items-center">
                          <span className="text-[11px] font-semibold text-gray-500">하루 결산</span>
                          {(() => {
                            const dailyNetFlow = item.data.income + item.data.savingsIncome - item.data.expense - item.data.savingsExpense;
                            return (
                              <span className={`text-xs font-bold ${dailyNetFlow === 0 ? "text-gray-400" : "text-gray-800"}`}>
                                {dailyNetFlow > 0 ? "+" : ""}{dailyNetFlow.toLocaleString()}원
                              </span>
                            );
                          })()}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 범례 */}
      <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap items-center justify-center gap-6 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span className="text-gray-600">수입</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-red-600 rounded-full"></div>
          <span className="text-gray-600">지출</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-sky-500 rounded-full"></div>
          <span className="text-gray-600">수익/회수</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
          <span className="text-gray-600">저축/투자</span>
        </div>
      </div>

    </div>
  );
}
