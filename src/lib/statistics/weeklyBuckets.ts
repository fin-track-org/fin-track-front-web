/**
 * "주간 흐름" 섹션 — 일별 API(`DashboardDaily[]`)를 달력 주가 아니라 `1–7일`, `8–14일`,
 * `15–21일`, `22–28일`, `29일–말일`로 고정 집계한다(IMPLEMENTATION_BRIEF_019 §7, DECISION_016 §5
 * "주의 경계는 달력 주가 아니라... 고정해 달마다 해석이 흔들리지 않게 한다").
 *
 * 입력 배열은 mutate하지 않는다. 주간 막대에는 `income`/`expense`만 합산한다 — `savingsIncome`/
 * `savingsExpense`는 절대 섞지 않는다(§7).
 */

export interface WeeklyBucket {
  label: string;
  startDay: number;
  endDay: number;
  income: number;
  expense: number;
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const YEAR_MONTH = /^(\d{4})-(\d{2})$/;

/** "yyyy-MM"의 실제 일수. 형식이 비정상이면 예외를 던지지 않고 31(가장 넓은 안전값)로 폴백한다. */
function daysInMonth(month: string): number {
  const match = YEAR_MONTH.exec(month);
  if (!match) return 31;
  const year = Number(match[1]);
  const monthNum = Number(match[2]);
  if (!Number.isFinite(year) || !Number.isFinite(monthNum) || monthNum < 1 || monthNum > 12) return 31;
  return new Date(year, monthNum, 0).getDate();
}

/** "yyyy-MM-dd"에서 일(day)만 안전하게 추출한다. 형식이 비정상이면 null(제외 대상)을 반환한다. */
function safeDayOfMonth(dateStr: string): number | null {
  const match = ISO_DATE.exec(dateStr);
  if (!match) return null;
  const day = Number(match[3]);
  if (!Number.isFinite(day) || day < 1 || day > 31) return null;
  return day;
}

/**
 * 1~4주는 항상 존재하고(1–7, 8–14, 15–21, 22–28), 5주(29일–말일)는 해당 월에 29일 이상이
 * 실제로 있을 때만(28일까지인 2월 등은 제외) 추가한다.
 */
function buildEmptyBuckets(month: string): WeeklyBucket[] {
  const buckets: WeeklyBucket[] = [
    { label: "1주", startDay: 1, endDay: 7, income: 0, expense: 0 },
    { label: "2주", startDay: 8, endDay: 14, income: 0, expense: 0 },
    { label: "3주", startDay: 15, endDay: 21, income: 0, expense: 0 },
    { label: "4주", startDay: 22, endDay: 28, income: 0, expense: 0 },
  ];
  const lastDay = daysInMonth(month);
  if (lastDay >= 29) {
    buckets.push({ label: "5주", startDay: 29, endDay: lastDay, income: 0, expense: 0 });
  }
  return buckets;
}

export function aggregateDailyToWeekly(daily: DashboardDaily[], month: string): WeeklyBucket[] {
  const buckets = buildEmptyBuckets(month);

  for (const entry of daily) {
    const day = safeDayOfMonth(entry.date);
    if (day == null) continue; // 비정상 날짜는 예외 없이 제외한다(§7).
    const bucket = buckets.find((b) => day >= b.startDay && day <= b.endDay);
    if (!bucket) continue; // 월 길이를 벗어난 날짜(방어적 안전 처리)
    bucket.income += entry.income;
    bucket.expense += entry.expense;
  }

  return buckets;
}
