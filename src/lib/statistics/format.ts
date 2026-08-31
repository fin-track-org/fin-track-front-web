/** `/home/statistics` 모바일·데스크톱 뷰가 함께 쓰는 표시용 포맷터. 계산 로직은 없다. */

export function formatWon(amount: number): string {
  return `${Math.round(amount).toLocaleString("ko-KR")}원`;
}

/** 부호를 항상 명시한다(§12 "색만으로 양수·음수... 구분하지 않는다" — 부호 문자가 색을 보완). */
export function formatSignedWon(amount: number): string {
  const rounded = Math.round(amount);
  return `${rounded >= 0 ? "+" : "-"}${Math.abs(rounded).toLocaleString("ko-KR")}원`;
}

export function monthNumberOf(monthKey: string): number {
  const match = /^\d{4}-(\d{2})$/.exec(monthKey);
  return match ? Number(match[1]) : NaN;
}

export function monthLabel(date: Date): string {
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월`;
}
