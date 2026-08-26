#!/usr/bin/env node
/**
 * IMPLEMENTATION_BRIEF_018 §14 "필수 자동 검증" — 필수 fixture 1~12.
 *
 * 이 저장소에는 프론트엔드 테스트 러너(jest/vitest 등)가 설치돼 있지 않고, 새 테스트 도구
 * 설치도 이번 범위가 아니어서, `scripts/verify-transaction-entry.ts`와 같은 방식으로
 * Node의 네이티브 TypeScript 실행(`node scripts/verify-draft-classification.ts`, 타입
 * 스트리핑만 하고 별도 트랜스파일 도구가 필요 없다)과 `node:assert`만으로 실제로 실행되는
 * 검증을 작성했다.
 *
 * 실행: `node scripts/verify-draft-classification.ts` (cwd: ftweb/)
 */

import assert from "node:assert/strict";
import {
  findNextPendingIndex,
  findPreviousPendingIndex,
  resolveStartIndex,
  sortDraftsOldestFirst,
} from "../src/lib/draftClassificationQueue.ts";

let passCount = 0;
function ok(label: string) {
  console.log(`OK  ${label}`);
  passCount++;
}

function draft(id: string, date: string, sortOrder: number): DraftTransaction {
  return {
    id,
    date,
    amount: 1000,
    type: "EXPENSE",
    category: null,
    subcategory: null,
    description: id,
    sortOrder,
    account: null,
  };
}

/* 1. 날짜가 다른 draft가 오래된 순으로 정렬된다. ------------------------------ */
{
  const input = [draft("c", "2026-08-20", 0), draft("a", "2026-07-01", 0), draft("b", "2026-08-01", 0)];
  const sorted = sortDraftsOldestFirst(input);
  assert.deepEqual(
    sorted.map((d) => d.id),
    ["a", "b", "c"],
  );
  ok("1.날짜가 다른 draft가 오래된 순으로 정렬된다");
}

/* 2. 같은 날짜는 sortOrder 오름차순이다. -------------------------------------- */
{
  const input = [draft("a", "2026-08-01", 3), draft("b", "2026-08-01", 1), draft("c", "2026-08-01", 2)];
  const sorted = sortDraftsOldestFirst(input);
  assert.deepEqual(
    sorted.map((d) => d.id),
    ["b", "c", "a"],
  );
  ok("2.같은 날짜는 sortOrder 오름차순이다");
}

/* 3. 동률은 원래 순서를 유지한다. --------------------------------------------- */
{
  const input = [draft("a", "2026-08-01", 1), draft("b", "2026-08-01", 1), draft("c", "2026-08-01", 1)];
  const sorted = sortDraftsOldestFirst(input);
  assert.deepEqual(
    sorted.map((d) => d.id),
    ["a", "b", "c"],
  );
  ok("3.동률은 원래 순서를 유지한다");
}

/* 4. 입력 배열을 mutate하지 않는다. -------------------------------------------- */
{
  const input = [draft("b", "2026-08-02", 0), draft("a", "2026-08-01", 0)];
  const snapshot = input.map((d) => d.id);
  sortDraftsOldestFirst(input);
  assert.deepEqual(
    input.map((d) => d.id),
    snapshot,
  );
  ok("4.입력 배열을 mutate하지 않는다");
}

/* 4b. 비정상/빈 날짜에도 예외를 던지지 않고, 유효 항목을 먼저 오래된 순으로 두고 비정상
   항목은 원본 순서 그대로 뒤에 둔다(QA_REVIEW_041 P2-2 — doesNotThrow만으로는 결과 순서를
   검증하지 못하므로 정확한 ID 배열을 assert한다). ------------------------------------- */
{
  const input = [draft("a", "", 0), draft("b", "2026-08-01", 0), draft("c", "", 0)];
  assert.doesNotThrow(() => sortDraftsOldestFirst(input));
  const sorted = sortDraftsOldestFirst(input);
  assert.deepEqual(
    sorted.map((d) => d.id),
    ["b", "a", "c"], // 유효 항목(b) 먼저, 비정상 항목(a, c)은 원본 순서 그대로 뒤에
  );
  ok("4b.비정상/빈 날짜에도 예외를 던지지 않고 유효 항목을 먼저, 비정상은 원본 순서로 뒤에 둔다");
}

/* 4c. QA_REVIEW_041 P2-2 재현 예시 — 유효 날짜 사이에 비정상 날짜가 끼어도 유효 항목끼리는
   여전히 정확한 날짜순이고, 결과가 결정적(deterministic)이다(형식 검증 없이 comparator가
   0/비0을 섞어 반환하면 sort 엔진의 비교 호출 순서에 따라 유효 항목 순서까지 흔들릴 수
   있었다). "not-a-date"처럼 비어 있지 않지만 형식이 아닌 문자열도 비정상으로 취급한다. --- */
{
  const input = [
    draft("invalidA", "invalid-A", 0),
    draft("aug20", "2026-08-20", 0),
    draft("jul01", "2026-07-01", 0),
    draft("notADate", "not-a-date", 0),
  ];
  const sorted = sortDraftsOldestFirst(input);
  assert.deepEqual(
    sorted.map((d) => d.id),
    ["jul01", "aug20", "invalidA", "notADate"],
  );
  ok("4c.유효 날짜 사이에 비정상 날짜가 섞여도 유효 항목은 정확한 날짜순, 결과는 결정적이다");
}

/* 5. 이전 탐색이 연속된 완료 항목을 건너뛴다. --------------------------------- */
{
  const queue = [draft("1", "2026-08-01", 0), draft("2", "2026-08-02", 0), draft("3", "2026-08-03", 0), draft("4", "2026-08-04", 0)];
  const completed = new Set(["2", "3"]);
  assert.equal(findPreviousPendingIndex(queue, 3, completed), 0);
  ok("5.이전 탐색이 연속된 완료 항목을 건너뛴다");
}

/* 6. 다음 탐색도 연속된 완료 항목을 건너뛴다. --------------------------------- */
{
  const queue = [draft("1", "2026-08-01", 0), draft("2", "2026-08-02", 0), draft("3", "2026-08-03", 0), draft("4", "2026-08-04", 0)];
  const completed = new Set(["2", "3"]);
  assert.equal(findNextPendingIndex(queue, 0, completed), 3);
  ok("6.다음 탐색도 연속된 완료 항목을 건너뛴다");
}

/* 7. 첫 항목에는 이전 결과가 없다. -------------------------------------------- */
{
  const queue = [draft("1", "2026-08-01", 0), draft("2", "2026-08-02", 0)];
  assert.equal(findPreviousPendingIndex(queue, 0, new Set()), null);
  ok("7.첫 항목에는 이전 결과가 없다");
}

/* 8. 마지막 미완료 뒤에는 다음 결과가 없다. ----------------------------------- */
{
  const queue = [draft("1", "2026-08-01", 0), draft("2", "2026-08-02", 0), draft("3", "2026-08-03", 0)];
  const completed = new Set(["3"]);
  assert.equal(findNextPendingIndex(queue, 1, completed), null);
  ok("8.마지막 미완료 뒤에는 다음 결과가 없다");
}

/* 9. "1 skip → 2 saved → 3 skip → 4 → prev → 3 → prev → 1 → next → 3" 시나리오 (브리프 §8). */
{
  const queue = [draft("1", "2026-08-01", 0), draft("2", "2026-08-02", 0), draft("3", "2026-08-03", 0), draft("4", "2026-08-04", 0)];
  const completed = new Set(["2"]); // 2만 정식 저장 완료, 1·3은 "나중에"로 넘긴 draft
  let index = 3; // 4(index 3)가 현재 위치

  const prev1 = findPreviousPendingIndex(queue, index, completed);
  assert.equal(prev1, 2); // → 3
  index = prev1!;

  const prev2 = findPreviousPendingIndex(queue, index, completed);
  assert.equal(prev2, 0); // → 완료된 2(index 1)를 건너뛰고 1
  index = prev2!;

  const next1 = findNextPendingIndex(queue, index, completed);
  assert.equal(next1, 2); // 1에서 나중에 → 완료된 2를 건너뛰고 3
  ok('9."1 skip → 2 saved → 3 skip → 4 → prev → 3 → prev → 1 → next → 3" 시나리오');
}

/* 9b. 이전만 완료 건너뛰고 다음은 index+1만 하는 비대칭 구현을 금지(§8) — 다음도 동일 규칙. */
{
  const queue = [draft("1", "2026-08-01", 0), draft("2", "2026-08-02", 0), draft("3", "2026-08-03", 0)];
  const completed = new Set(["2"]);
  assert.equal(findNextPendingIndex(queue, 0, completed), 2); // 단순 index+1(=1)이 아니라 완료 건너뛴 2
  ok("9b.다음 탐색도 이전과 동일하게 완료 항목을 건너뛴다(비대칭 금지)");
}

/* 10. 선택한 draft ID가 정렬 후에도 정확한 시작 항목을 가리킨다. ---------------- */
{
  const raw = [draft("c", "2026-08-20", 0), draft("a", "2026-07-01", 0), draft("b", "2026-08-01", 0)];
  const sorted = sortDraftsOldestFirst(raw);
  const startIndex = resolveStartIndex(sorted, "b");
  assert.equal(startIndex, 1); // 정렬 후 [a,b,c] 중 b는 index 1
  assert.equal(sorted[startIndex].id, "b");
  ok("10.선택한 draft ID가 정렬 후에도 정확한 시작 항목을 가리킨다");
}

/* 11. 없는 시작 ID는 첫 미완료 항목으로 폴백한다. ------------------------------ */
{
  const sorted = sortDraftsOldestFirst([draft("a", "2026-07-01", 0), draft("b", "2026-08-01", 0)]);
  assert.equal(resolveStartIndex(sorted, "does-not-exist"), 0);
  assert.equal(resolveStartIndex(sorted, undefined), 0);
  ok("11.없는 시작 ID는 첫 미완료 항목으로 폴백한다");
}

/* 12. 부분 저장 항목은 완료로 취급되지 않아 이전 대상이다. --------------------- */
{
  const queue = [draft("1", "2026-08-01", 0), draft("2", "2026-08-02", 0)];
  // "1"은 부분 저장(기억난 만큼 적고 다음)만 했을 뿐 completedIds에는 들어가지 않는다.
  const completed = new Set<string>();
  assert.equal(findPreviousPendingIndex(queue, 1, completed), 0);
  ok("12.부분 저장 항목은 완료로 취급되지 않아 이전 대상이다");
}

/* 13. QA_REVIEW_041 P2-1 — 뒤쪽 pending은 없고 앞쪽 pending만 있는 완료 상태에서 "넘긴 기록
    다시 보기"가 사용하는 findPreviousPendingIndex가 연속된 완료 ID를 건너뛰고 가장 가까운
    미완료 항목을 정확히 찾는다(1 나중에 → 2·3·4 분류 완료 → 5 현재 시나리오). --------------- */
{
  const queue = [
    draft("1", "2026-08-01", 0),
    draft("2", "2026-08-02", 0),
    draft("3", "2026-08-03", 0),
    draft("4", "2026-08-04", 0),
    draft("5", "2026-08-05", 0),
  ];
  const completed = new Set(["2", "3", "4"]); // 5가 마지막(현재) 위치, 뒤쪽에 더 볼 항목 없음
  const returnIndex = findPreviousPendingIndex(queue, 4, completed);
  assert.equal(returnIndex, 0); // 완료된 2·3·4를 모두 건너뛰고 1로 복귀
  ok('13."넘긴 기록 다시 보기"가 연속된 완료 ID를 건너뛰고 가장 가까운 미완료 항목으로 복귀한다');
}

/* 14. QA_REVIEW_041 P2-1 — 앞쪽 항목까지 모두 완료된 경우 "넘긴 기록 다시 보기" 대상이
    없다(완료 화면에 그 CTA를 렌더링하지 않을 근거). ------------------------------------- */
{
  const queue = [draft("1", "2026-08-01", 0), draft("2", "2026-08-02", 0), draft("3", "2026-08-03", 0)];
  const completed = new Set(["1", "2"]); // 3(현재) 앞의 1·2가 모두 완료
  assert.equal(findPreviousPendingIndex(queue, 2, completed), null);
  ok('14.앞쪽까지 모두 완료된 경우 "넘긴 기록 다시 보기" 복귀 대상이 없다');
}

console.log(`\n총 ${passCount}개 통과`);
