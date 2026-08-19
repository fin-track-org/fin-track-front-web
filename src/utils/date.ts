export function formatMonth(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

/** "8월 19일 수요일" 형태의 한 줄 인사 날짜(책상형 모바일 홈 인사 영역). */
export function formatKoreanDateWithWeekday(date: Date) {
  return `${date.getMonth() + 1}월 ${date.getDate()}일 ${WEEKDAY_LABELS[date.getDay()]}요일`;
}
