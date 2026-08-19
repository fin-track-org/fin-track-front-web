"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getDashboardDaily } from "@/src/lib/api/dashboard/daily";
import { getTodayAttendance } from "@/src/lib/api/attendanceApi";
import { formatMonth } from "@/src/utils/date";
import AttendanceBanner from "../section/AttendanceBanner";
import DeskObjectSheet from "./DeskObjectSheet";
import { useAuthErrorRedirect } from "@/src/hook/useAuthErrorRedirect";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

interface DeskCalendarProps {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
}

/**
 * 책상 위 "탁상 달력" — 닫힌 상태는 항상 오늘을 보여주는 물건이다(선택 월과 무관).
 * `dashboardDaily`를 오늘이 속한 달로 조회해 재사용하고, 날짜 그리드 계산은
 * `MonthlyCalendar.tsx`와 같은 접근(월의 첫 요일 기준 앞쪽 공백 채우기)을 따르되
 * 그 컴포넌트의 내부 fixed popup은 가져오지 않는다 — 선택 날짜 요약을 같은 sheet
 * 안에서 갱신한다(IMPLEMENTATION_BRIEF_010 §7).
 */
export default function DeskCalendar({ isOpen, onOpen, onClose }: DeskCalendarProps) {
  const today = useMemo(() => new Date(), []);
  const todayMonth = useMemo(() => formatMonth(today), [today]);
  const todayDateStr = useMemo(
    () =>
      `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`,
    [today],
  );

  const [selectedDay, setSelectedDay] = useState<number | null>(today.getDate());

  const {
    data: dailyData = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["dashboardDaily", todayMonth],
    queryFn: () => getDashboardDaily(todayMonth),
    retry: false,
  });
  useAuthErrorRedirect(error);

  // 출석 도장 — 실패해도 도장만 숨기고 달력 전체를 실패시키지 않는다.
  const { data: hasCheckedToday, isError: isAttendanceError } = useQuery({
    queryKey: ["attendanceToday"],
    queryFn: getTodayAttendance,
    retry: false,
  });

  const todayRow = useMemo(
    () => dailyData.find((d) => d.date === todayDateStr) ?? null,
    [dailyData, todayDateStr],
  );

  const calendarDays = useMemo(() => {
    const year = today.getFullYear();
    const month = today.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const dataByDay = new Map<number, DashboardDaily>();
    dailyData.forEach((item) => {
      const day = Number(item.date.substring(8, 10));
      dataByDay.set(day, item);
    });

    const cells: Array<{ day: number | null; data: DashboardDaily | null }> = [];
    for (let i = 0; i < startDayOfWeek; i++) cells.push({ day: null, data: null });
    for (let day = 1; day <= daysInMonth; day++) {
      cells.push({ day, data: dataByDay.get(day) ?? null });
    }
    return cells;
  }, [dailyData, today]);

  const selectedData = useMemo(
    () => (selectedDay ? (calendarDays.find((c) => c.day === selectedDay)?.data ?? null) : null),
    [calendarDays, selectedDay],
  );

  const weekdayLabel = WEEKDAYS[today.getDay()];

  return (
    <>
      <button
        type="button"
        onClick={onOpen}
        aria-haspopup="dialog"
        className="relative min-h-[166px] overflow-hidden rounded-md border-2 border-ll-ink bg-ll-paper px-3 pb-3 text-left shadow-[4px_5px_0_rgba(32,40,58,0.24)] transition-transform active:translate-y-0.5 focus-visible:outline focus-visible:outline-3 focus-visible:outline-ll-periwinkle focus-visible:outline-offset-4"
      >
        <div
          aria-hidden="true"
          className="-mx-3 mb-2 h-[19px] border-b-2 border-ll-ink"
          style={{
            background:
              "repeating-linear-gradient(90deg, transparent 0 13px, var(--color-ll-ink) 14px 17px, transparent 18px 31px)",
          }}
        />
        <div className="text-center text-[11px] font-extrabold text-ll-tomato">
          {today.getFullYear()}년 {today.getMonth() + 1}월
        </div>
        <div className="my-0.5 text-center text-[40px] font-black leading-none text-ll-ink">
          {today.getDate()}
        </div>
        <div className="text-center text-[11px] text-ll-pencil">{weekdayLabel}요일</div>

        <div className="mt-2 border-t border-ll-ink/20 pt-1.5 text-center text-[11px]">
          {isLoading ? (
            <span className="inline-block h-3 w-20 animate-pulse rounded bg-ll-ink/10" aria-hidden="true" />
          ) : isError ? (
            <span className="font-semibold text-ll-ink/60">오늘 정보를 불러오지 못했어요</span>
          ) : todayRow && todayRow.expense > 0 ? (
            <>
              오늘 지출 <b className="font-extrabold">{todayRow.expense.toLocaleString()}원</b>
            </>
          ) : (
            <span className="text-ll-pencil">오늘 기록 없음</span>
          )}
        </div>

        {!isAttendanceError && hasCheckedToday && (
          <span className="absolute bottom-2 right-2 -rotate-[10deg] rounded-full border-2 border-ll-tomato px-1 py-1 text-[9px] font-black leading-none text-ll-tomato">
            출석
            <br />
            완료
          </span>
        )}
      </button>

      <DeskObjectSheet
        open={isOpen}
        onClose={onClose}
        titleId="desk-sheet-calendar-title"
        title={`${today.getFullYear()}년 ${today.getMonth() + 1}월`}
        description="날짜를 누르면 그날의 수입과 지출을 보여드려요."
        toneClassName="bg-ll-paper"
      >
        {isError ? (
          <div className="py-6 text-center">
            <p className="text-sm text-ll-ink/70">이번 달 정보를 불러오지 못했어요.</p>
            <button
              type="button"
              onClick={() => refetch()}
              className="mt-3 min-h-[44px] rounded-full border-2 border-ll-ink px-4 text-sm font-bold"
            >
              다시 시도
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-7 text-center text-[11px] text-ll-pencil">
              {WEEKDAYS.map((w, i) => (
                <b
                  key={w}
                  className={`py-1.5 font-bold ${i === 0 ? "text-ll-tomato" : i === 6 ? "text-ll-periwinkle" : ""}`}
                >
                  {w}
                </b>
              ))}
            </div>
            <div className="mt-1 grid grid-cols-7 gap-1">
              {calendarDays.map((cell, idx) => {
                if (!cell.day) return <div key={idx} aria-hidden="true" />;
                const hasFlow =
                  !!cell.data &&
                  (cell.data.income > 0 ||
                    cell.data.expense > 0 ||
                    cell.data.savingsIncome > 0 ||
                    cell.data.savingsExpense > 0);
                const isSelected = cell.day === selectedDay;
                const isToday = cell.day === today.getDate();
                const netFlow = cell.data
                  ? cell.data.income + cell.data.savingsIncome - cell.data.expense - cell.data.savingsExpense
                  : 0;
                const accessibleLabel = hasFlow
                  ? `${today.getMonth() + 1}월 ${cell.day}일, 순변동 ${netFlow >= 0 ? "플러스" : "마이너스"} ${Math.abs(netFlow).toLocaleString()}원`
                  : `${today.getMonth() + 1}월 ${cell.day}일, 기록 없음`;
                return (
                  <button
                    key={idx}
                    type="button"
                    aria-pressed={isSelected}
                    aria-label={accessibleLabel}
                    onClick={() => setSelectedDay(cell.day)}
                    className={[
                      "flex min-h-[40px] flex-col items-center justify-center rounded-full text-[12px]",
                      isSelected ? "border-2 border-ll-ink bg-ll-butter font-extrabold" : "",
                      isToday && !isSelected ? "font-extrabold text-ll-tomato" : "",
                    ].join(" ")}
                  >
                    <span>{cell.day}</span>
                    {hasFlow && (
                      <span
                        aria-hidden="true"
                        className={`mt-0.5 h-1 w-1 rounded-full ${netFlow >= 0 ? "bg-ll-mint" : "bg-ll-tomato"}`}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 border-t-2 border-ll-ink pt-1">
              {selectedData && selectedDay ? (
                <div className="grid min-h-[58px] grid-cols-[1fr_auto] items-center gap-3 border-b border-ll-ink/20 py-2">
                  <div>
                    <strong className="block text-sm font-semibold text-ll-ink">
                      {today.getMonth() + 1}월 {selectedDay}일
                    </strong>
                    <small className="mt-0.5 block text-[11px] text-ll-pencil">
                      수입 +{selectedData.income.toLocaleString()}원 · 지출 -
                      {selectedData.expense.toLocaleString()}원
                    </small>
                  </div>
                  <b className="text-[13px] font-extrabold tabular-nums text-ll-ink">
                    {(selectedData.income +
                      selectedData.savingsIncome -
                      selectedData.expense -
                      selectedData.savingsExpense >=
                    0
                      ? "+"
                      : "-") +
                      Math.abs(
                        selectedData.income +
                          selectedData.savingsIncome -
                          selectedData.expense -
                          selectedData.savingsExpense,
                      ).toLocaleString()}
                    원
                  </b>
                </div>
              ) : (
                <p className="py-2 text-center text-xs text-ll-pencil">
                  {selectedDay ? "이 날은 기록이 없어요." : "날짜를 선택해보세요."}
                </p>
              )}
            </div>

            {/* 출석은 닫힌 상태에선 도장만, 열린 상태에서는 기존 배너를 그대로 재사용해
                실제 체크인 동작(§15 "출석 및 퀘스트 진행" 보존)까지 제공한다. */}
            <div className="mt-4">
              <AttendanceBanner />
            </div>
          </>
        )}
      </DeskObjectSheet>
    </>
  );
}
