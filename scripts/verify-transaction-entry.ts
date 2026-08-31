#!/usr/bin/env node
/**
 * IMPLEMENTATION_BRIEF_016 §14 "회귀 방지 코드 검증" — 필수 fixture 1~14.
 *
 * 이 저장소에는 프론트엔드 테스트 러너(jest/vitest 등)가 설치돼 있지 않고, 브리프가 요구하는
 * 새 테스트 도구 설치도 이번 범위가 아니어서, `scripts/verify-ledger-balance.ts`와 같은 방식으로
 * Node 24의 네이티브 TypeScript 실행(`node scripts/verify-transaction-entry.ts`, 타입 스트리핑만
 * 하고 별도 트랜스파일 도구가 필요 없다)과 `node:assert`만으로 실제로 실행되는 검증을 작성했다.
 *
 * 실행: `node scripts/verify-transaction-entry.ts` (cwd: ftweb/)
 */

import assert from "node:assert/strict";
import {
  buildMoveEntryKind,
  canApplyCategorySuggestion,
  consumeCategoryRecommendationOnEntryKindChange,
  deriveEntryKind,
  entryKindToPayloadDirection,
  fromPayloadAccountFields,
  getFromAccountOptions,
  getToAccountOptions,
  getTransferAccountIds,
  isAccountUsable,
  isDraftSaveAllowed,
  resolveAccountAutoFill,
  toPayloadAccountFields,
  validateAccountSelection,
  type EntryKind,
} from "../src/lib/transactionEntry.ts";

let passCount = 0;
function ok(label: string) {
  console.log(`OK  ${label}`);
  passCount++;
}

/* 0. 카테고리 추천 적용 범위 ---------------------------------------------- */
{
  assert.equal(canApplyCategorySuggestion("EXPENSE"), true);
  assert.equal(canApplyCategorySuggestion("INCOME"), true);
  assert.equal(canApplyCategorySuggestion("TRANSFER"), false);
  assert.equal(canApplyCategorySuggestion("SAVINGS_DEPOSIT"), false);
  assert.equal(canApplyCategorySuggestion("SAVINGS_WITHDRAWAL"), false);
  ok("0.계좌 이동에서 카테고리 추천 미적용");
}

function acc(
  id: string,
  kind: "REGULAR" | "SAVINGS",
  opts: { isActive?: boolean; isDefault?: boolean } = {},
) {
  return {
    id,
    type: kind === "SAVINGS" ? "SAVINGS_INVESTMENT" : "BANK",
    isActive: opts.isActive ?? true,
    isDefault: opts.isDefault ?? false,
  };
}

/* 1. 일반 지출 ------------------------------------------------------------- */
{
  const kind: EntryKind = "EXPENSE";
  const { type, isSavings } = entryKindToPayloadDirection(kind);
  assert.equal(type, "EXPENSE");
  assert.equal(isSavings, false);
  const payloadAccounts = toPayloadAccountFields(kind, "card-1", "");
  assert.deepEqual(payloadAccounts, { accountId: "card-1", toAccountId: undefined });
  assert.equal(deriveEntryKind({ type: "EXPENSE", isSavings: false }), "EXPENSE");
  ok("1.일반 지출");
}

/* 2. 일반 수입 ------------------------------------------------------------- */
{
  const kind: EntryKind = "INCOME";
  const { type, isSavings } = entryKindToPayloadDirection(kind);
  assert.equal(type, "INCOME");
  assert.equal(isSavings, false);
  const payloadAccounts = toPayloadAccountFields(kind, "bank-1", "");
  assert.deepEqual(payloadAccounts, { accountId: "bank-1", toAccountId: undefined });
  assert.equal(deriveEntryKind({ type: "INCOME", isSavings: false }), "INCOME");
  ok("2.일반 수입");
}

/* 3. 일반 → 일반 이체 ------------------------------------------------------- */
{
  const kind = buildMoveEntryKind("TRANSFER", "DEPOSIT"); // 방향은 TRANSFER에서 무시됨
  assert.equal(kind, "TRANSFER");
  const { type, isSavings } = entryKindToPayloadDirection(kind);
  assert.equal(type, "TRANSFER");
  assert.equal(isSavings, false);

  const payload = toPayloadAccountFields(kind, "bank-1", "bank-2");
  assert.deepEqual(payload, { accountId: "bank-1", toAccountId: "bank-2" });

  const { fromAccountId, toAccountId } = getTransferAccountIds({
    type: "TRANSFER",
    accountId: payload.accountId,
    toAccountId: payload.toAccountId,
  });
  assert.equal(fromAccountId, "bank-1");
  assert.equal(toAccountId, "bank-2");

  const accounts = [acc("bank-1", "REGULAR"), acc("bank-2", "REGULAR")];
  assert.equal(validateAccountSelection(kind, "bank-1", "bank-2", accounts), null);
  ok("3.일반→일반 이체");
}

/* 4. 저축·투자 → 저축·투자 이체 ---------------------------------------------- */
{
  const kind: EntryKind = "TRANSFER";
  const accounts = [acc("sv-1", "SAVINGS"), acc("sv-2", "SAVINGS")];
  assert.equal(validateAccountSelection(kind, "sv-1", "sv-2", accounts), null);
  const payload = toPayloadAccountFields(kind, "sv-1", "sv-2");
  assert.deepEqual(payload, { accountId: "sv-1", toAccountId: "sv-2" });
  ok("4.저축·투자→저축·투자 이체");
}

/* 5. 일반 → 저축·투자 저축하기 ------------------------------------------------ */
{
  const kind = buildMoveEntryKind("SAVINGS", "DEPOSIT");
  assert.equal(kind, "SAVINGS_DEPOSIT");
  const { type, isSavings } = entryKindToPayloadDirection(kind);
  assert.equal(type, "EXPENSE");
  assert.equal(isSavings, true);

  const payload = toPayloadAccountFields(kind, "bank-1", "sv-1");
  assert.deepEqual(payload, { accountId: "bank-1", toAccountId: "sv-1" });

  const { fromAccountId, toAccountId } = getTransferAccountIds({
    type: "EXPENSE",
    accountId: payload.accountId,
    toAccountId: payload.toAccountId,
  });
  assert.equal(fromAccountId, "bank-1");
  assert.equal(toAccountId, "sv-1");

  const accounts = [acc("bank-1", "REGULAR"), acc("sv-1", "SAVINGS")];
  assert.equal(validateAccountSelection(kind, "bank-1", "sv-1", accounts), null);

  // fromPayloadAccountFields로 되돌리면 원래 내부 상태(bank-1 → sv-1)와 같아야 한다.
  assert.deepEqual(fromPayloadAccountFields(kind, payload), { fromAccountId: "bank-1", toAccountId: "sv-1" });
  ok("5.일반→저축·투자 저축하기");
}

/* 6. 저축·투자 → 일반 가져오기 ------------------------------------------------ */
{
  const kind = buildMoveEntryKind("SAVINGS", "WITHDRAWAL");
  assert.equal(kind, "SAVINGS_WITHDRAWAL");
  const { type, isSavings } = entryKindToPayloadDirection(kind);
  assert.equal(type, "INCOME");
  assert.equal(isSavings, true);

  // 내부 상태(문자 그대로): 출발=저축 계좌, 도착=일반 계좌
  const payload = toPayloadAccountFields(kind, "sv-1", "bank-1");
  // 기존 관례상 accountId=도착(일반), toAccountId=출발(저축)로 뒤집힌다.
  assert.deepEqual(payload, { accountId: "bank-1", toAccountId: "sv-1" });

  const { fromAccountId, toAccountId } = getTransferAccountIds({
    type: "INCOME",
    accountId: payload.accountId,
    toAccountId: payload.toAccountId,
  });
  // 실제 서버로 보내는 fromAccountId/toAccountId는 항상 문자 그대로의 방향이어야 한다.
  assert.equal(fromAccountId, "sv-1");
  assert.equal(toAccountId, "bank-1");

  const accounts = [acc("sv-1", "SAVINGS"), acc("bank-1", "REGULAR")];
  assert.equal(validateAccountSelection(kind, "sv-1", "bank-1", accounts), null);

  assert.deepEqual(fromPayloadAccountFields(kind, payload), { fromAccountId: "sv-1", toAccountId: "bank-1" });
  ok("6.저축·투자→일반 가져오기");
}

/* 7. 일반 → 저축·투자를 일반 이체로 제출하려 할 때 차단 ----------------------------- */
{
  const accounts = [acc("bank-1", "REGULAR"), acc("sv-1", "SAVINGS")];
  const err = validateAccountSelection("TRANSFER", "bank-1", "sv-1", accounts);
  assert.ok(err, "일반→저축 조합의 일반 이체는 차단돼야 합니다");
  assert.equal(err!.field, "to");
  assert.match(err!.message, /같은 종류의 계좌끼리만/);
  ok("7.일반→저축 조합 일반 이체 차단");
}

/* 8. 같은 계좌 이체 차단 ------------------------------------------------------ */
{
  const accounts = [acc("bank-1", "REGULAR")];
  const err = validateAccountSelection("TRANSFER", "bank-1", "bank-1", accounts);
  assert.ok(err, "같은 계좌 이체는 차단돼야 합니다");
  assert.equal(err!.field, "to");
  assert.match(err!.message, /같은 계좌로는 이동할 수 없어요/);
  ok("8.같은 계좌 이체 차단");
}

/* 추가: 계좌 목록 필터링이 방향에 맞는 성격만 노출하는지(§5) ------------------------- */
{
  const accounts = [acc("bank-1", "REGULAR"), acc("bank-2", "REGULAR"), acc("sv-1", "SAVINGS")];
  const depositFrom = getFromAccountOptions("SAVINGS_DEPOSIT", accounts, "");
  assert.deepEqual(depositFrom.map((a) => a.id), ["bank-1", "bank-2"]);
  const depositTo = getToAccountOptions("SAVINGS_DEPOSIT", accounts, "bank-1");
  assert.deepEqual(depositTo.map((a) => a.id), ["sv-1"]);

  const withdrawFrom = getFromAccountOptions("SAVINGS_WITHDRAWAL", accounts, "");
  assert.deepEqual(withdrawFrom.map((a) => a.id), ["sv-1"]);
  const withdrawTo = getToAccountOptions("SAVINGS_WITHDRAWAL", accounts, "sv-1");
  assert.deepEqual(withdrawTo.map((a) => a.id), ["bank-1", "bank-2"]);

  // 출발 계좌가 저축이면 이체 도착 후보는 저축 계좌만(자기 자신 제외).
  const transferToFromSavings = getToAccountOptions("TRANSFER", [...accounts, acc("sv-2", "SAVINGS")], "sv-1");
  assert.deepEqual(transferToFromSavings.map((a) => a.id), ["sv-2"]);
  ok("추가.계좌 옵션 필터링 방향별 성격 일치");
}

/* 비활성 계좌·존재하지 않는 계좌 차단(§10.1 공통) --------------------------------- */
{
  const accounts = [acc("bank-1", "REGULAR", { isActive: false })];
  const err = validateAccountSelection("EXPENSE", "bank-1", "", accounts);
  assert.ok(err);
  assert.equal(err!.field, "from");
  ok("추가.비활성 계좌 선택 차단");
}

/* QA_REVIEW_037 P2 — 비활성 계좌는 선택 후보 목록 자체에서 제외된다(제출해야만 오류로
 * 드러나지 않도록). getFromAccountOptions/getToAccountOptions 둘 다 확인한다. */
{
  const accounts = [
    acc("bank-1", "REGULAR"),
    acc("bank-2", "REGULAR", { isActive: false }),
    acc("sv-1", "SAVINGS"),
    acc("sv-2", "SAVINGS", { isActive: false }),
  ];

  const fromOptions = getFromAccountOptions("EXPENSE", accounts, "");
  assert.deepEqual(fromOptions.map((a) => a.id), ["bank-1", "sv-1"], "비활성 계좌(bank-2, sv-2)는 후보에서 빠져야 합니다");

  const depositTo = getToAccountOptions("SAVINGS_DEPOSIT", accounts, "bank-1");
  assert.deepEqual(depositTo.map((a) => a.id), ["sv-1"], "비활성 저축 계좌(sv-2)는 저축하기 도착 후보에서 빠져야 합니다");

  // 비활성 계좌가 출발/도착 기준점 자체로 지정돼 있어도(예: defaultValues 복원), 성격
  // 판별에는 쓰되 후보 목록에는 비활성 계좌를 절대 포함하지 않는다.
  const transferToFromInactiveRegular = getToAccountOptions("TRANSFER", accounts, "bank-2");
  assert.deepEqual(transferToFromInactiveRegular.map((a) => a.id), ["bank-1"]);
  ok("추가.비활성 계좌는 선택 후보 목록에서 제외");
}

/* QA_REVIEW_037 P2 — 존재하지 않거나 비활성인 추천 계좌는 자동 적용하지 않고 빈 상태로
 * 둔다(resolveAccountAutoFill이 기본 결제수단도 없을 때 최근 추천을 검증 없이 그대로
 * 적용하던 문제). */
{
  const accounts = [acc("bank-1", "REGULAR")]; // 기본 결제수단 없음
  const nonExistent = resolveAccountAutoFill({
    kind: "EXPENSE",
    hasCurrentValue: false,
    isUserModified: false,
    accounts,
    suggestedAccountId: "deleted-account-id",
  });
  assert.equal(nonExistent, null, "존재하지 않는 추천 계좌는 적용되면 안 됩니다");

  const inactiveAccounts = [acc("bank-1", "REGULAR"), acc("bank-2", "REGULAR", { isActive: false })];
  const inactiveSuggested = resolveAccountAutoFill({
    kind: "EXPENSE",
    hasCurrentValue: false,
    isUserModified: false,
    accounts: inactiveAccounts,
    suggestedAccountId: "bank-2",
  });
  assert.equal(inactiveSuggested, null, "비활성 추천 계좌는 적용되면 안 됩니다");
  assert.equal(isAccountUsable("bank-2", inactiveAccounts), false);
  assert.equal(isAccountUsable("bank-1", inactiveAccounts), true);
  ok("추가.존재하지 않거나 비활성인 추천 계좌 미적용");
}

/* 9. 기본 결제수단 적용 — QA_REVIEW_037 P2: resolveAccountAutoFill(실제 컴포넌트가
 *    쓰는 그 함수)을 직접 호출해 기본 결제수단이 최우선으로 적용되는지 검증한다. */
{
  const accounts = [
    acc("card-1", "REGULAR"),
    acc("bank-1", "REGULAR", { isDefault: true }),
  ];
  const result = resolveAccountAutoFill({
    kind: "EXPENSE",
    hasCurrentValue: false,
    isUserModified: false,
    accounts,
    suggestedAccountId: "card-1", // 최근 추천이 있어도 기본 결제수단이 우선해야 한다.
  });
  assert.deepEqual(result, { accountId: "bank-1", source: "default" });

  // 기본 결제수단이 없으면 최근 추천으로 내려간다.
  const noDefault = resolveAccountAutoFill({
    kind: "EXPENSE",
    hasCurrentValue: false,
    isUserModified: false,
    accounts: [acc("card-1", "REGULAR")],
    suggestedAccountId: "card-1",
  });
  assert.deepEqual(noDefault, { accountId: "card-1", source: "recent" });

  // 이체·저축(계좌 이동)에는 절대 자동 적용하지 않는다(§6).
  const moveKindResult = resolveAccountAutoFill({
    kind: "TRANSFER",
    hasCurrentValue: false,
    isUserModified: false,
    accounts,
    suggestedAccountId: undefined,
  });
  assert.equal(moveKindResult, null);
  ok("9.기본 결제수단 자동 적용(최근 추천보다 우선, 계좌 이동 제외)");
}

/* 10. 편집값이 기본 결제수단보다 우선 — resolveAccountAutoFill(hasCurrentValue:true)이
 *     기본 결제수단이 있어도 개입하지 않아야 한다(§6 "편집·임시저장 복원 값을 덮지 않는다"). */
{
  const accounts = [acc("bank-1", "REGULAR", { isDefault: true })];
  const result = resolveAccountAutoFill({
    kind: "EXPENSE",
    hasCurrentValue: true, // 이미 복원된 편집값이 있는 상태
    isUserModified: false,
    accounts,
    suggestedAccountId: undefined,
  });
  assert.equal(result, null, "편집값이 있으면 기본 결제수단이 개입하면 안 됩니다");
  ok("10.편집값이 기본 결제수단보다 우선");
}

/* 11. 사용자 선택 후 늦은 기본값·추천이 덮지 않음 — isUserModified:true면 계좌 목록이
 *     늦게 로딩돼도(기본 결제수단이 새로 나타나도) 절대 덮지 않아야 한다. */
{
  const accounts = [acc("bank-1", "REGULAR", { isDefault: true })];
  const result = resolveAccountAutoFill({
    kind: "EXPENSE",
    hasCurrentValue: false, // 사용자가 계좌를 선택 해제했더라도
    isUserModified: true, // 한 번이라도 직접 선택한 적이 있으면
    accounts,
    suggestedAccountId: "bank-1",
  });
  assert.equal(result, null, "사용자가 이미 선택했다면 늦은 기본값·추천이 개입하면 안 됩니다");
  ok("11.사용자 선택 후 늦은 기본값·추천 미개입");
}

/* 12. 유형 전환 후 숨은 isSavings·도착 계좌가 payload에 남지 않음 ------------------- */
{
  // SAVINGS_DEPOSIT에서 EXPENSE로 전환한 뒤 다시 payload를 만들면, entryKind가
  // 유일한 진실 소스이므로 isSavings/toAccountId가 EXPENSE의 결과에 전혀 나타나지 않는다.
  const afterSwitch = entryKindToPayloadDirection("EXPENSE");
  assert.equal(afterSwitch.isSavings, false);
  const payload = toPayloadAccountFields("EXPENSE", "bank-1", "sv-1" /* 이전 상태의 잔재를 넣어봐도 */);
  assert.equal(payload.toAccountId, undefined, "EXPENSE에는 toAccountId가 절대 실리면 안 됩니다");
  ok("12.유형 전환 후 숨은 상태 미잔존");
}

/* 13. 빠른 축약 임시저장에 이체·저축 정보가 조용히 누락되지 않음 — isDraftSaveAllowed(실제
 * AddTransactionModal의 canSaveDraft가 그대로 호출하는 함수)가 계좌 이동 EntryKind에서는
 * 전부 false를 돌려줘 임시저장 CTA 자체가 비활성화됨을 검증한다. quickAddTransaction의
 * 서버 계약(ftapi QuickTransactionReq)이 date/amount/description/type(INCOME|EXPENSE)만
 * 받고 계좌 정보를 아예 받지 않으므로, 이 함수가 false를 반환하는 5가지 EntryKind 중
 * 계좌 이동 3가지에서 임시저장을 막는 것이 유일하게 안전한 정책이다. */
{
  assert.equal(isDraftSaveAllowed("EXPENSE"), true);
  assert.equal(isDraftSaveAllowed("INCOME"), true);
  assert.equal(isDraftSaveAllowed("TRANSFER"), false);
  assert.equal(isDraftSaveAllowed("SAVINGS_DEPOSIT"), false);
  assert.equal(isDraftSaveAllowed("SAVINGS_WITHDRAWAL"), false);
  ok("13.계좌 이동 EntryKind에서만 임시저장 차단");
}

/* 14. 일반 템플릿 적용 후 상세 폼 확장 및 값 보존 (§9) --------------------------------
 * 템플릿은 EXPENSE/INCOME만 지원한다 — TRANSFER 템플릿을 적용하면 EntryKind로 변환할 때
 * deriveEntryKind가 항상 EXPENSE/INCOME 중 하나로만 떨어져야 한다(TRANSFER/SAVINGS_*로
 * 잘못 해석되면 안 된다). */
{
  assert.equal(deriveEntryKind({ type: "EXPENSE" }), "EXPENSE");
  assert.equal(deriveEntryKind({ type: "INCOME" }), "INCOME");
  ok("14.템플릿 타입(EXPENSE/INCOME) → EntryKind 매핑");
}

/* 15. QA_REVIEW_045 P2 — 추천 적용 → 계좌 이동 → 일반 유형 복귀 시 재적용 안 됨 ------------
 * changeEntryKind가 실제로 호출하는 consumeCategoryRecommendationOnEntryKindChange를
 * 직접 검증한다(React 렌더링 없이). */
{
  // 추천이 이미 적용된("auto") 상태에서 계좌 이동으로 전환하면 "user"로 소비돼,
  // 같은 항목에서 지출로 되돌아와도(재적용 effect의 `!== "user"` 가드에 걸려) 다시
  // 채워지지 않는다.
  const applied = { category: "auto" as const, subCategory: "auto" as const };
  const enteredMove = consumeCategoryRecommendationOnEntryKindChange("EXPENSE", "TRANSFER", applied);
  assert.deepEqual(enteredMove, { category: "user", subCategory: "user" });
  const backToExpense = consumeCategoryRecommendationOnEntryKindChange("TRANSFER", "EXPENSE", enteredMove);
  // 계좌 이동 → 일반 유형 복귀는 "진입"이 아니므로 이미 소비된 "user" 상태를 그대로 둔다.
  assert.deepEqual(backToExpense, { category: "user", subCategory: "user" });
  ok("15a.추천 적용 후 계좌 이동 전환 시 재적용 차단(user로 소비)");

  // 대분류만 자동 적용되고 소분류는 아직 채워지지 않았던 경우, 대분류만 소비되고
  // 소분류는 "none"으로 유지된다(원래 없던 값을 만들어내지 않는다).
  const partial = { category: "auto" as const, subCategory: "none" as const };
  const partialResult = consumeCategoryRecommendationOnEntryKindChange("EXPENSE", "SAVINGS_DEPOSIT", partial);
  assert.deepEqual(partialResult, { category: "user", subCategory: "none" });
  ok("15b.대분류만 적용된 상태에서 소분류 none은 그대로 유지");

  // 추천이 한 번도 적용되지 않았던("none") 항목은 계좌 이동을 거쳐도 손대지 않는다 —
  // 다음에 지출/수입으로 돌아왔을 때 정상적으로 첫 적용이 될 수 있어야 한다.
  const untouched = { category: "none" as const, subCategory: "none" as const };
  const stillNone = consumeCategoryRecommendationOnEntryKindChange("INCOME", "SAVINGS_WITHDRAWAL", untouched);
  assert.deepEqual(stillNone, untouched);
  ok("15c.추천 미적용 상태는 계좌 이동 전환에도 영향 없음(다음 정상 적용 보존)");

  // 계좌 이동이 아닌 전환(EXPENSE↔INCOME, 이동 종류 사이 전환)에는 관여하지 않는다.
  const expenseAuto = { category: "auto" as const, subCategory: "none" as const };
  assert.deepEqual(
    consumeCategoryRecommendationOnEntryKindChange("EXPENSE", "INCOME", expenseAuto),
    expenseAuto,
    "EXPENSE↔INCOME 전환은 추천 상태를 건드리면 안 됩니다",
  );
  const moveAuto = { category: "user" as const, subCategory: "user" as const };
  assert.deepEqual(
    consumeCategoryRecommendationOnEntryKindChange("TRANSFER", "SAVINGS_DEPOSIT", moveAuto),
    moveAuto,
    "이동 종류 사이 전환(이미 계좌 이동 중)은 추천 상태를 건드리면 안 됩니다",
  );
  ok("15d.계좌 이동으로의 '첫 진입'이 아닌 전환은 추천 상태 불변");
}

console.log(`\n${passCount}개 fixture 전부 통과`);
