/**
 * "나중에 분류" 순차 처리 큐의 순수 함수 모음(IMPLEMENTATION_BRIEF_018 §4, §6).
 *
 * `SequentialCategorizer`가 세션을 열 때 이 함수들로 정렬된 snapshot을 만들고,
 * 이후 이전/다음 탐색은 컴포넌트 안의 while문 대신 아래 순수 함수로만 계산한다
 * (테스트는 `scripts/verify-draft-classification.ts`).
 */

// ISO `YYYY-MM-DD` 형식만 "유효한 날짜"로 인정한다(QA_REVIEW_041 P2-2 — "날짜 문자열은
// 형식까지 확인해야 한다. 단순히 비어 있지 않은 문자열인지만 확인하면 `not-a-date`도 정상
// 문자열처럼 사전식 정렬된다"). 같은 형식끼리는 사전식 비교가 곧 날짜순 비교와 같다.
const ISO_DATE_FORMAT = /^\d{4}-\d{2}-\d{2}$/;

function isValidDateString(value: unknown): value is string {
  return typeof value === "string" && ISO_DATE_FORMAT.test(value);
}

/**
 * 안정 정렬: 거래일(date) 오름차순 → sortOrder 오름차순 → 원본 배열 순서 유지.
 *
 * 입력 배열은 mutate하지 않는다(새 배열을 반환한다, React Query 캐시 배열 보호).
 *
 * 비정상 날짜 처리 정책(QA_REVIEW_041 P2-2): 하나의 comparator에 유효/비정상 날짜를
 * 섞어 `Array.prototype.sort`에 맡기면, 비정상 값끼리는 "동률(0)"을 반환하면서도 유효
 * 값끼리는 실제 날짜순을 반환해 comparator가 추이성(transitivity)을 보장하지 못하고
 * 결과가 엔진의 비교 호출 순서에 의존하게 된다. 이를 피하려고 정렬 자체를 하나의
 * comparator로 하지 않는다 — 유효한 날짜 항목과 비정상 날짜 항목을 먼저 분리한 뒤,
 * 유효 항목만 (date ASC → sortOrder ASC → 원본 index ASC) 진짜 전순서(total order)로
 * 정렬하고, 비정상 항목은 원본 index 순서 그대로 뒤에 그대로 붙인다. 두 그룹을 별도로
 * 정렬해 concat하므로 결과는 항상 결정적이다.
 */
export function sortDraftsOldestFirst(drafts: DraftTransaction[]): DraftTransaction[] {
  const withIndex = drafts.map((draft, originalIndex) => ({ draft, originalIndex }));

  const valid = withIndex.filter((entry) => isValidDateString(entry.draft.date));
  const invalid = withIndex.filter((entry) => !isValidDateString(entry.draft.date));

  valid.sort((a, b) => {
    // 둘 다 형식이 검증된 같은 길이의 ISO 문자열이므로 사전식 비교가 곧 날짜순 비교다.
    if (a.draft.date !== b.draft.date) return a.draft.date < b.draft.date ? -1 : 1;

    const sortOrderCompare = compareSortOrder(a.draft.sortOrder, b.draft.sortOrder);
    if (sortOrderCompare !== 0) return sortOrderCompare;

    // 동률: 최초 API 응답(원본 배열) 순서를 유지한다.
    return a.originalIndex - b.originalIndex;
  });

  // 비정상 날짜 항목은 정렬 대상에서 제외하고 원본 순서를 그대로 유지한다.
  invalid.sort((a, b) => a.originalIndex - b.originalIndex);

  return [...valid, ...invalid].map((entry) => entry.draft);
}

/**
 * sortOrder 비교 — 유효한 숫자는 정상적으로 비교하고, 비정상(비숫자·NaN) 값은 항상 유효한
 * 숫자보다 뒤로 보낸다(둘 다 비정상이면 0, 상위의 원본 index tie-break로 넘어간다). "한쪽만
 * 비정상이면 항상 뒤로 간다"는 규칙 자체가 순서쌍과 무관하게 일관되므로 추이성이 보장된다.
 */
function compareSortOrder(a: unknown, b: unknown): number {
  const aIsValid = typeof a === "number" && !Number.isNaN(a);
  const bIsValid = typeof b === "number" && !Number.isNaN(b);
  if (aIsValid && bIsValid) return (a as number) - (b as number);
  if (aIsValid) return -1;
  if (bIsValid) return 1;
  return 0;
}

/**
 * 시작 draft ID로 정렬된 큐의 시작 index를 찾는다.
 *
 * - `startDraftId`가 없으면 첫 항목(index 0, "전체 정리" CTA)부터 시작한다.
 * - `startDraftId`가 정렬 큐에 없으면(최신 query에서 사라졌거나 잘못된 값이면)
 *   마찬가지로 첫 항목으로 안전하게 폴백한다.
 * - 큐가 비어 있으면 0을 반환한다(호출부에서 `finished` 여부로 따로 처리).
 */
export function resolveStartIndex(queue: DraftTransaction[], startDraftId?: string): number {
  if (queue.length === 0 || !startDraftId) return 0;
  const found = queue.findIndex((d) => d.id === startDraftId);
  return found >= 0 ? found : 0;
}

/**
 * 이전 미완료 index. 현재 위치(currentIndex)는 검사하지 않고 그 앞쪽만 본다.
 * `completedIds`에 있는 항목은 연속되더라도 모두 건너뛴다. 없으면 null.
 */
export function findPreviousPendingIndex(
  queue: DraftTransaction[],
  currentIndex: number,
  completedIds: ReadonlySet<string>,
): number | null {
  for (let i = currentIndex - 1; i >= 0; i--) {
    if (!completedIds.has(queue[i].id)) return i;
  }
  return null;
}

/**
 * 다음 미완료 index. 현재 위치(currentIndex)는 검사하지 않고 그 뒤쪽만 본다.
 * `completedIds`에 있는 항목은 연속되더라도 모두 건너뛴다. 없으면 null.
 */
export function findNextPendingIndex(
  queue: DraftTransaction[],
  currentIndex: number,
  completedIds: ReadonlySet<string>,
): number | null {
  for (let i = currentIndex + 1; i < queue.length; i++) {
    if (!completedIds.has(queue[i].id)) return i;
  }
  return null;
}
