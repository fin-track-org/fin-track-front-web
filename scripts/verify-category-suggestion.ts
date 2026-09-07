#!/usr/bin/env node
/**
 * IMPLEMENTATION_BRIEF_021 §6 "필수 순수 함수 fixture" — `src/lib/categorySuggestion.ts`의
 * `sanitizeCategorySelection`/`sanitizeSuggestion`을 실제 컴포넌트가 호출하는 그대로 검증한다.
 *
 * 이 저장소에는 프론트엔드 테스트 러너(jest/vitest 등)가 설치돼 있지 않아,
 * `scripts/verify-transaction-entry.ts`와 같은 방식으로 Node 24 네이티브 TypeScript 실행 +
 * `node:assert`만으로 실제로 실행되는 검증을 작성했다.
 *
 * 실행: `node scripts/verify-category-suggestion.ts` (cwd: ftweb/)
 */

import assert from "node:assert/strict";
import {
  sanitizeCategorySelection,
  sanitizeSuggestion,
  type CategoryLike,
  type CategorySuggestion,
  type SubCategoryLike,
} from "../src/lib/categorySuggestion.ts";

let passCount = 0;
function ok(label: string) {
  console.log(`OK  ${label}`);
  passCount++;
}

/* 테스트용 카테고리·세부항목 목록 ------------------------------------------ */
// 실제 /api/v1/categories 응답과 같은 모양: type은 INCOME/EXPENSE, code로 시스템 카테고리를 구분한다.
const categories: CategoryLike[] = [
  { id: "cat-income-salary", type: "INCOME", code: "SALARY" },
  { id: "cat-income-etc", type: "INCOME", code: "INCOME_ETC" },
  { id: "cat-expense-food", type: "EXPENSE", code: "FOOD" },
  { id: "cat-expense-transport", type: "EXPENSE", code: "TRANSPORT" },
  // 이체/저축/잔액조정용 시스템 카테고리 — 사용자가 직접 고를 수 없다.
  { id: "cat-system-transfer-out", type: "EXPENSE", code: "TRANSFER_OUT" },
  { id: "cat-system-savings-in", type: "INCOME", code: "SAVINGS_IN" },
];

// 세부항목은 category별로 분리해 보관한다 — sanitizeCategorySelection에 넘길 때
// 일부러 다른 category 소속 항목을 섞어 "소속이 다르면 버린다"를 검증한다(fixture 5).
const subCategoriesBySalary: SubCategoryLike[] = [
  { id: "sub-salary-base", categoryId: "cat-income-salary" },
  { id: "sub-salary-bonus", categoryId: "cat-income-salary" },
];
const subCategoriesByFood: SubCategoryLike[] = [
  { id: "sub-food-lunch", categoryId: "cat-expense-food" },
  { id: "sub-food-cafe", categoryId: "cat-expense-food" },
];
const accounts = [{ id: "acc-1" }, { id: "acc-2" }];

/* 1. INCOME + 수입 category + 그 category 소속 subcategory → 모두 유지 ------- */
{
  const result = sanitizeCategorySelection(
    { type: "INCOME", categoryId: "cat-income-salary", subCategoryId: "sub-salary-base" },
    categories,
    subCategoriesBySalary,
  );
  assert.deepEqual(result, { categoryId: "cat-income-salary", subCategoryId: "sub-salary-base" });
  ok("1.INCOME + 수입 category + 소속 subcategory → 모두 유지");
}

/* 2. EXPENSE + 지출 category + 그 category 소속 subcategory → 모두 유지 ------ */
{
  const result = sanitizeCategorySelection(
    { type: "EXPENSE", categoryId: "cat-expense-food", subCategoryId: "sub-food-lunch" },
    categories,
    subCategoriesByFood,
  );
  assert.deepEqual(result, { categoryId: "cat-expense-food", subCategoryId: "sub-food-lunch" });
  ok("2.EXPENSE + 지출 category + 소속 subcategory → 모두 유지");
}

/* 3. INCOME + 지출 category → category/subcategory 모두 제거 ---------------- */
{
  const result = sanitizeCategorySelection(
    { type: "INCOME", categoryId: "cat-expense-food", subCategoryId: "sub-food-lunch" },
    categories,
    subCategoriesByFood,
  );
  assert.deepEqual(result, { categoryId: "", subCategoryId: "" });
  ok("3.INCOME + 지출 category → category/subcategory 모두 제거");
}

/* 4. EXPENSE + 수입 category → category/subcategory 모두 제거 --------------- */
{
  const result = sanitizeCategorySelection(
    { type: "EXPENSE", categoryId: "cat-income-salary", subCategoryId: "sub-salary-base" },
    categories,
    subCategoriesBySalary,
  );
  assert.deepEqual(result, { categoryId: "", subCategoryId: "" });
  ok("4.EXPENSE + 수입 category → category/subcategory 모두 제거");
}

/* 5. category는 유효하지만 subcategory가 다른 category 소속 → category 유지, subcategory 제거 */
{
  // "sub-food-lunch"는 실제로 cat-expense-food 소속이지만, cat-expense-transport를
  // 선택한 상태에서 이 값이 들어왔다고 가정한다 — 대분류만 맞고 소분류는 남의 것.
  const result = sanitizeCategorySelection(
    { type: "EXPENSE", categoryId: "cat-expense-transport", subCategoryId: "sub-food-lunch" },
    categories,
    subCategoriesByFood, // 호출부가 cat-expense-transport의 목록이 아니라 food 목록을 실수로 넘긴 상황도 방어한다
  );
  assert.deepEqual(result, { categoryId: "cat-expense-transport", subCategoryId: "" });
  ok("5.category 유효, subcategory는 다른 category 소속 → category 유지·subcategory 제거");
}

/* 6. 존재하지 않는 category → category/subcategory 제거 --------------------- */
{
  const result = sanitizeCategorySelection(
    { type: "EXPENSE", categoryId: "cat-does-not-exist", subCategoryId: "sub-food-lunch" },
    categories,
    subCategoriesByFood,
  );
  assert.deepEqual(result, { categoryId: "", subCategoryId: "" });
  ok("6.존재하지 않는 category → category/subcategory 제거");
}

/* 7. 존재하지 않는 subcategory → category 유지, subcategory 제거 ------------ */
{
  const result = sanitizeCategorySelection(
    { type: "EXPENSE", categoryId: "cat-expense-food", subCategoryId: "sub-does-not-exist" },
    categories,
    subCategoriesByFood,
  );
  assert.deepEqual(result, { categoryId: "cat-expense-food", subCategoryId: "" });
  ok("7.존재하지 않는 subcategory → category 유지·subcategory 제거");
}

/* 8. 시스템 category가 일반 거래 추천으로 들어옴 → category/subcategory 제거 -- */
{
  const result1 = sanitizeCategorySelection(
    { type: "EXPENSE", categoryId: "cat-system-transfer-out", subCategoryId: undefined },
    categories,
  );
  assert.deepEqual(result1, { categoryId: "", subCategoryId: "" });

  const result2 = sanitizeCategorySelection(
    { type: "INCOME", categoryId: "cat-system-savings-in", subCategoryId: "sub-x" },
    categories,
  );
  assert.deepEqual(result2, { categoryId: "", subCategoryId: "" });

  // sanitizeSuggestion을 통해서도 동일하게 걸러지는지 확인한다(basis/hint까지 함께 지워야 한다).
  const suggestion: CategorySuggestion = {
    categoryId: "cat-system-transfer-out",
    basis: "frequency",
    hint: "요즘 자주 쓰는 분류예요.",
  };
  const sanitized = sanitizeSuggestion(suggestion, "EXPENSE", categories, accounts);
  assert.deepEqual(sanitized, { basis: "none" });
  ok("8.시스템 category가 일반 거래 추천으로 들어옴 → category/subcategory·hint 모두 제거");
}

/* 9. category 없이 subcategory만 존재 → subcategory 제거 -------------------- */
{
  const result = sanitizeCategorySelection(
    { type: "INCOME", categoryId: undefined, subCategoryId: "sub-salary-base" },
    categories,
    subCategoriesBySalary,
  );
  assert.deepEqual(result, { categoryId: "", subCategoryId: "" });
  ok("9.category 없이 subcategory만 존재 → subcategory 제거");
}

/* 10. 잘못된 추천을 연속으로 sanitize해도 매번 동일한 빈 결과이며 재적용 후보가 생기지 않음 */
{
  const badSuggestion: CategorySuggestion = {
    categoryId: "cat-expense-food",
    subCategoryId: "sub-does-not-exist",
    basis: "memo-history",
    hint: "지난번 같은 메모로 기록했어요.",
  };
  const first = sanitizeSuggestion(badSuggestion, "EXPENSE", categories, accounts, subCategoriesByFood);
  const second = sanitizeSuggestion(badSuggestion, "EXPENSE", categories, accounts, subCategoriesByFood);
  const third = sanitizeSuggestion(badSuggestion, "EXPENSE", categories, accounts, subCategoriesByFood);
  assert.deepEqual(first, second);
  assert.deepEqual(second, third);
  // category는 유효했으므로 유지되고, subcategory만 계속 비어 있어야 한다 — 매번 그대로.
  assert.equal(first.categoryId, "cat-expense-food");
  assert.equal(first.subCategoryId, undefined);
  ok("10.잘못된 추천을 연속으로 sanitize해도 매번 동일한 빈 결과(재적용 후보 없음)");
}

/* 11. "월급" 형태의 INCOME draft에 지출 category가 연결된 재현 fixture -------- */
{
  // 사용자 ID 71f5cac9-6b67-4ad0-8bc7-8e446084e6a2, 거래 ID
  // 4d9edc3a-9d85-45a5-a49d-110a31a45f04, 메모 "월급" 사례를 재현한다: 화면에는
  // INCOME 거래인데 실제 연결된 category는 EXPENSE 쪽("식비")이고, subcategory까지
  // 그 EXPENSE category 소속인 잘못된 조합이다.
  assert.doesNotThrow(() => {
    const result = sanitizeCategorySelection(
      { type: "INCOME", categoryId: "cat-expense-food", subCategoryId: "sub-food-lunch" },
      categories,
      subCategoriesByFood,
    );
    assert.deepEqual(result, { categoryId: "", subCategoryId: "" });
  });
  ok("11.'월급' INCOME draft에 지출 category 연결 재현 → 예외 없이 빈 category로 정규화");
}

/* 12. 유효한 category와 account 추천 중 category만 잘못됨 → account 추천은 독립 유지 */
{
  const suggestion: CategorySuggestion = {
    categoryId: "cat-does-not-exist",
    accountId: "acc-1",
    basis: "recent-choice",
    hint: "최근에 이 메모로 골랐던 분류예요.",
  };
  const sanitized = sanitizeSuggestion(suggestion, "EXPENSE", categories, accounts);
  assert.equal(sanitized.categoryId, undefined);
  assert.equal(sanitized.subCategoryId, undefined);
  assert.equal(sanitized.accountId, "acc-1");
  // category 추천이 버려졌으니 그 근거 힌트는 지우지만 basis 자체는 그대로 둔다(account는 살아있으므로).
  assert.equal(sanitized.hint, undefined);
  assert.equal(sanitized.basis, "recent-choice");
  ok("12.category만 잘못된 추천 → account 추천은 독립적으로 유지");
}

/* 추가. subCategoriesOfCategory를 주지 않으면(아직 로드 전) subcategory를 그대로 둔다 */
{
  const result = sanitizeCategorySelection(
    { type: "EXPENSE", categoryId: "cat-expense-food", subCategoryId: "sub-food-lunch" },
    categories,
    // subCategoriesOfCategory 생략 — 아직 이 category의 목록을 모른다.
  );
  assert.deepEqual(result, { categoryId: "cat-expense-food", subCategoryId: "sub-food-lunch" });
  ok("추가.subcategory 목록이 아직 로드되지 않았으면(undefined) 소속 검증을 건너뛰고 값을 유지");
}

/* 추가. sanitizeSuggestion에서도 subCategoriesOfCategory를 넘기면 소속을 검증한다 */
{
  const suggestion: CategorySuggestion = {
    categoryId: "cat-expense-food",
    subCategoryId: "sub-salary-base", // 다른 category(수입) 소속 subcategory가 잘못 섞여 들어온 경우
    basis: "frequency",
    hint: "요즘 자주 쓰는 분류예요.",
  };
  const sanitized = sanitizeSuggestion(suggestion, "EXPENSE", categories, accounts, subCategoriesByFood);
  assert.equal(sanitized.categoryId, "cat-expense-food");
  assert.equal(sanitized.subCategoryId, undefined);
  // category 추천 자체는 유효했으므로 힌트는 유지된다.
  assert.equal(sanitized.hint, "요즘 자주 쓰는 분류예요.");
  ok("추가.sanitizeSuggestion에 subcategory 목록을 넘기면 소속이 다른 subcategory만 제거");
}

console.log(`\n${passCount}개 fixture 전부 통과`);
