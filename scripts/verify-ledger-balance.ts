#!/usr/bin/env node
/**
 * IMPLEMENTATION_BRIEF_011 §14 "ASC 정방향과 DESC 역산 잔액 일치 테스트".
 * 이 저장소에는 프론트엔드 테스트 러너(jest/vitest 등)가 설치돼 있지 않고, 브리프가 요구하는
 * 새 테스트 도구 설치도 이번 범위가 아니어서, Node 24의 네이티브 TypeScript 실행
 * (`node scripts/verify-ledger-balance.ts`, 타입 스트리핑만 하고 별도 트랜스파일 도구가
 * 필요 없다)과 `node:assert`만으로 실제로 실행되는 검증을 작성했다. jest 같은 test runner
 * 문법(describe/it)은 쓰지 않는다 — 그런 프레임워크가 없기 때문이다.
 *
 * 핵심 검증: 같은 거래 집합에 대해 `calculateForwardBalances`(ASC)의 결과를 뒤집은 값과
 * `calculateReverseBalances`(DESC)의 결과가 필드 단위로 정확히 일치해야 한다. 이 대칭성이
 * 깨지면 두 함수 중 하나가 잘못됐다는 뜻이다 — 손으로 계산한 "정답" 숫자에 의존하지 않고
 * 두 구현이 서로를 검증하게 한다(다만 각 fixture 주석에 손 계산도 남겨 이중 확인했다).
 *
 * 실행: `node scripts/verify-ledger-balance.ts` (cwd: ftweb/)
 */

import assert from "node:assert/strict";
import {
  calculateForwardBalances,
  calculateReverseBalances,
  getTransferTotalDelta,
  type AccountOpeningLike,
  type BalanceCalcOptions,
} from "../src/lib/ledgerBalance.ts";

let passCount = 0;

function makeTx(overrides: Partial<Transaction> & { id: string }): Transaction {
  return {
    date: "2026-01-01",
    amount: 0,
    type: "EXPENSE",
    category: { id: "cat-1", name: "카테고리", code: "ETC" },
    subcategory: { id: "sub-1", name: "세부" },
    description: "",
    sortOrder: 0,
    account: { id: "acc-1", name: "계좌", type: "BANK" },
    ...overrides,
  } as Transaction;
}

/** forward 결과의 마지막 accMap 상태를 "closing accounts"로 역산해낸다(테스트 전용 부기,
 * 잔액 산식 자체를 다시 구현하지 않는다 — 각 계좌가 마지막으로 기록된 러닝 밸런스를 그대로 쓴다). */
function deriveClosingAccounts(
  opening: AccountOpeningLike[],
  transactionsAsc: Transaction[],
  forwardResult: Transaction[],
): AccountOpeningLike[] {
  const map = new Map<string, number>();
  opening.forEach((a) => map.set(a.accountId, a.amount));
  for (let i = 0; i < transactionsAsc.length; i++) {
    const t = transactionsAsc[i];
    const r = forwardResult[i];
    map.set(t.account.id, r.runningAccountBalance!);
    if (r.runningLinkedAccountBalance !== undefined && t.transferDetail) {
      map.set(t.transferDetail.toAccount.id, r.runningLinkedAccountBalance);
    }
  }
  return Array.from(map.entries()).map(([accountId, amount]) => ({ accountId, amount }));
}

/**
 * 하나의 fixture에 대해 forward(ASC)와 reverse(DESC)를 모두 돌려 대칭성을 검증한다.
 * `transactionsAsc`는 오래된 순, 함수 내부에서 뒤집어 DESC로 넘긴다(실제 API 응답 순서와 동일).
 */
function assertForwardReverseSymmetry(
  label: string,
  openingTotal: number,
  openingAccounts: AccountOpeningLike[],
  transactionsAsc: Transaction[],
  options: BalanceCalcOptions,
) {
  const forward = calculateForwardBalances(openingTotal, openingAccounts, transactionsAsc, options);
  const closingTotal = forward.length > 0 ? forward[forward.length - 1].runningTotalBalance! : openingTotal;
  const closingAccounts = deriveClosingAccounts(openingAccounts, transactionsAsc, forward);

  const transactionsDesc = [...transactionsAsc].reverse();
  const reverse = calculateReverseBalances(closingTotal, closingAccounts, transactionsDesc, options);

  // reverse는 DESC 순서이므로, 같은 id의 forward 항목과 비교한다.
  const forwardById = new Map(forward.map((t) => [t.id, t]));
  for (const r of reverse) {
    const f = forwardById.get(r.id);
    assert.ok(f, `[${label}] forward에 id=${r.id}가 없습니다`);
    assert.equal(
      r.runningTotalBalance,
      f!.runningTotalBalance,
      `[${label}] ${r.id} runningTotalBalance 불일치: reverse=${r.runningTotalBalance} forward=${f!.runningTotalBalance}`,
    );
    assert.equal(
      r.runningAccountBalance,
      f!.runningAccountBalance,
      `[${label}] ${r.id} runningAccountBalance 불일치: reverse=${r.runningAccountBalance} forward=${f!.runningAccountBalance}`,
    );
    assert.equal(
      r.runningLinkedAccountBalance,
      f!.runningLinkedAccountBalance,
      `[${label}] ${r.id} runningLinkedAccountBalance 불일치: reverse=${r.runningLinkedAccountBalance} forward=${f!.runningLinkedAccountBalance}`,
    );
  }

  // 역산을 끝까지 되돌리면 opening으로 정확히 복귀해야 한다(추가 안전장치).
  if (transactionsAsc.length > 0) {
    let cursorTotal = closingTotal;
    const cursorAccounts = new Map(closingAccounts.map((a) => [a.accountId, a.amount]));
    for (const t of transactionsDesc) {
      const signed = t.type === "EXPENSE" ? -t.amount : t.amount;
      const isTransfer = !!t.transferDetail;
      cursorAccounts.set(t.account.id, (cursorAccounts.get(t.account.id) ?? 0) - signed);
      if (isTransfer && !options.selectedAccountId && t.transferDetail && t.type === "EXPENSE") {
        const linkedId = t.transferDetail.toAccount.id;
        cursorAccounts.set(linkedId, (cursorAccounts.get(linkedId) ?? 0) - t.amount);
      }
      if (isTransfer && !options.selectedAccountId) {
        cursorTotal -= getTransferTotalDelta(t, options.savingsAccountIds, options.showSavingsAccount);
      } else {
        const isSavings = options.savingsAccountIds.has(t.account.id);
        if (options.showSavingsAccount || !isSavings) cursorTotal -= signed;
      }
    }
    assert.equal(cursorTotal, openingTotal, `[${label}] 전체 역산 후 openingTotal과 불일치`);
  }

  console.log(`OK  ${label} (${transactionsAsc.length}건)`);
  passCount++;
}

const noSavings: ReadonlySet<string> = new Set();

/* 1. 일반 수입 + 일반 지출 (전체 조회) ------------------------------------ */
{
  const opening: AccountOpeningLike[] = [
    { accountId: "card", amount: 40000 },
    { accountId: "bank", amount: 60000 },
  ];
  const asc = [
    makeTx({ id: "t1", date: "2026-01-01", type: "EXPENSE", amount: 10000, account: { id: "card", name: "카드", type: "CHECK_CARD" } }),
    makeTx({ id: "t2", date: "2026-01-02", type: "INCOME", amount: 50000, account: { id: "bank", name: "통장", type: "BANK" } }),
  ];
  // 손 계산: t1 후 card=30000,total=90000 / t2 후 bank=110000,total=140000
  assertForwardReverseSymmetry("1.일반 수입+지출", 100000, opening, asc, {
    selectedAccountId: "",
    showSavingsAccount: true,
    savingsAccountIds: noSavings,
  });
}

/* 2. 전체 조회에서 내부 이체 ------------------------------------------------ */
{
  const opening: AccountOpeningLike[] = [
    { accountId: "bank1", amount: 500000 },
    { accountId: "bank2", amount: 200000 },
  ];
  const asc = [
    makeTx({
      id: "tr1",
      date: "2026-01-05",
      type: "EXPENSE",
      amount: 100000,
      account: { id: "bank1", name: "생활비 통장", type: "BANK" },
      transferDetail: {
        linkedTransactionId: "tr1-linked",
        fromAccount: { id: "bank1", name: "생활비 통장", type: "BANK" },
        toAccount: { id: "bank2", name: "비상금 통장", type: "BANK" },
        fromTransactionId: "tr1",
        toTransactionId: "tr1-linked",
      },
    }),
  ];
  // 손 계산: bank1=400000, bank2(linked)=300000, total은 이체라 불변(700000)
  assertForwardReverseSymmetry("2.전체 조회 이체", 700000, opening, asc, {
    selectedAccountId: "",
    showSavingsAccount: true,
    savingsAccountIds: noSavings,
  });
}

/* 3. 특정 출금 계좌 조회 ----------------------------------------------------- */
{
  const opening: AccountOpeningLike[] = [{ accountId: "bank1", amount: 500000 }];
  const asc = [
    makeTx({
      id: "tr-out",
      date: "2026-01-05",
      type: "EXPENSE",
      amount: 100000,
      account: { id: "bank1", name: "생활비 통장", type: "BANK" },
      transferDetail: {
        linkedTransactionId: "tr-out-linked",
        fromAccount: { id: "bank1", name: "생활비 통장", type: "BANK" },
        toAccount: { id: "bank2", name: "비상금 통장", type: "BANK" },
        fromTransactionId: "tr-out",
        toTransactionId: "tr-out-linked",
      },
    }),
  ];
  // 특정 계좌(bank1) 조회 중이므로 scoped opening/closing = 500000 → 400000
  assertForwardReverseSymmetry("3.출금 계좌 조회", 500000, opening, asc, {
    selectedAccountId: "bank1",
    showSavingsAccount: true,
    savingsAccountIds: noSavings,
  });
}

/* 4. 특정 입금 계좌 조회 ----------------------------------------------------- */
{
  const opening: AccountOpeningLike[] = [{ accountId: "bank2", amount: 200000 }];
  const asc = [
    makeTx({
      id: "tr-in",
      date: "2026-01-05",
      type: "INCOME",
      amount: 100000,
      account: { id: "bank2", name: "비상금 통장", type: "BANK" },
      transferDetail: {
        linkedTransactionId: "tr-in-linked",
        fromAccount: { id: "bank1", name: "생활비 통장", type: "BANK" },
        toAccount: { id: "bank2", name: "비상금 통장", type: "BANK" },
        fromTransactionId: "tr-in-linked",
        toTransactionId: "tr-in",
      },
    }),
  ];
  // 특정 계좌(bank2, 입금 측) 조회 중 — scoped opening/closing = 200000 → 300000
  assertForwardReverseSymmetry("4.입금 계좌 조회", 200000, opening, asc, {
    selectedAccountId: "bank2",
    showSavingsAccount: true,
    savingsAccountIds: noSavings,
  });
}

/* 5. 저축·투자 이체가 전체 합계에 미치는 영향 (QA_REVIEW_024 P1) --------------- */
{
  // 주거래 통장 500,000 + 저축 계좌 1,000,000 (QA §3 예시와 동일한 숫자).
  const opening: AccountOpeningLike[] = [
    { accountId: "bank", amount: 500000 },
    { accountId: "savings", amount: 1000000 },
  ];
  const savingsIds = new Set(["savings"]);
  const onOptions: BalanceCalcOptions = { selectedAccountId: "", showSavingsAccount: true, savingsAccountIds: savingsIds };
  const offOptions: BalanceCalcOptions = { selectedAccountId: "", showSavingsAccount: false, savingsAccountIds: savingsIds };

  // 5a/5b. 일반(주거래 통장) → 저축 계좌로 실제 SAVINGS_EXPENSE 이체 200,000원.
  const toSavings = [
    makeTx({
      id: "sv-to",
      date: "2026-01-10",
      type: "EXPENSE",
      amount: 200000,
      category: { id: "cat-sv-exp", name: "저축 이체", code: "SAVINGS_EXPENSE" },
      account: { id: "bank", name: "주거래 통장", type: "BANK" },
      transferDetail: {
        linkedTransactionId: "sv-to-linked",
        fromAccount: { id: "bank", name: "주거래 통장", type: "BANK" },
        toAccount: { id: "savings", name: "저축 계좌", type: "SAVINGS_INVESTMENT" },
        fromTransactionId: "sv-to",
        toTransactionId: "sv-to-linked",
      },
    }),
  ];

  // (1) 저축 포함 ON: 전체 합계 변화 없음(1,500,000 유지) — 절대값 + ASC/DESC 대칭 모두 확인.
  const onForwardTo = calculateForwardBalances(1500000, opening, toSavings, onOptions);
  assert.equal(onForwardTo[0].runningTotalBalance, 1500000, "5a: 저축 포함 ON이면 이체로 전체 합계가 변하면 안 됩니다");
  assertForwardReverseSymmetry("5a.일반→저축 이체 (포함 ON)", 1500000, opening, toSavings, onOptions);

  // (2) 저축 포함 OFF, 일반→저축: 화면 합계(은행 계좌만) 500,000 → 300,000으로 감소해야 함.
  const offForwardTo = calculateForwardBalances(500000, opening, toSavings, offOptions);
  assert.equal(offForwardTo[0].runningTotalBalance, 300000, "5b: 일반→저축 이체 후 제외 합계는 300,000이어야 합니다");
  assertForwardReverseSymmetry("5b.일반→저축 이체 (포함 OFF)", 500000, opening, toSavings, offOptions);

  // 5c/5d. 저축 계좌 → 일반(주거래 통장)으로 실제 SAVINGS_EXPENSE 이체 150,000원(반대 방향).
  const fromSavings = [
    makeTx({
      id: "sv-from",
      date: "2026-01-11",
      type: "EXPENSE",
      amount: 150000,
      category: { id: "cat-sv-exp", name: "저축 이체", code: "SAVINGS_EXPENSE" },
      account: { id: "savings", name: "저축 계좌", type: "SAVINGS_INVESTMENT" },
      transferDetail: {
        linkedTransactionId: "sv-from-linked",
        fromAccount: { id: "savings", name: "저축 계좌", type: "SAVINGS_INVESTMENT" },
        toAccount: { id: "bank", name: "주거래 통장", type: "BANK" },
        fromTransactionId: "sv-from",
        toTransactionId: "sv-from-linked",
      },
    }),
  ];

  // (3) 저축 포함 OFF, 저축→일반: 제외 합계 500,000 → 650,000으로 증가해야 함.
  const offForwardFrom = calculateForwardBalances(500000, opening, fromSavings, offOptions);
  assert.equal(offForwardFrom[0].runningTotalBalance, 650000, "5c: 저축→일반 이체 후 제외 합계는 650,000이어야 합니다");
  assertForwardReverseSymmetry("5c.저축→일반 이체 (포함 OFF)", 500000, opening, fromSavings, offOptions);

  // (4) ASC/DESC 대칭 — 포함 ON에서 반대 방향 이체도 함께 확인(전체 합계는 항상 불변).
  const onForwardFrom = calculateForwardBalances(1500000, opening, fromSavings, onOptions);
  assert.equal(onForwardFrom[0].runningTotalBalance, 1500000, "5d: 저축 포함 ON이면 반대 방향 이체도 전체 합계가 변하면 안 됩니다");
  assertForwardReverseSymmetry("5d.저축→일반 이체 (포함 ON)", 1500000, opening, fromSavings, onOptions);

  console.log("OK  5.저축 이체 전체 합계 절대값 검증 (ON 불변 / OFF 일반→저축 감소 300,000 / OFF 저축→일반 증가 650,000)");
  passCount++;
}

/* 6. 잔액 조정 --------------------------------------------------------------- */
{
  const opening: AccountOpeningLike[] = [{ accountId: "card", amount: 200000 }];
  const asc = [
    makeTx({
      id: "adj1",
      date: "2026-01-12",
      type: "INCOME",
      amount: 5000,
      category: { id: "cat-adj", name: "잔액 조정", code: "BALANCE_ADJUST_INCOME" },
      account: { id: "card", name: "생활비 카드", type: "CHECK_CARD" },
    }),
  ];
  // 서버가 잔액 조정에 transferDetail을 주지 않는 한(§7 "기존 transaction type/서버 의미를
  // 확인한 뒤") 일반 거래와 같은 공식의 정확한 역연산이면 충분하다 — 별도 케이스 없음.
  assertForwardReverseSymmetry("6.잔액 조정", 200000, opening, asc, {
    selectedAccountId: "",
    showSavingsAccount: true,
    savingsAccountIds: noSavings,
  });
}

/* 7. 같은 날짜 거래 여러 건 --------------------------------------------------- */
{
  const opening: AccountOpeningLike[] = [{ accountId: "card", amount: 100000 }];
  const asc = [
    makeTx({ id: "d1", date: "2026-02-01", sortOrder: 1, type: "EXPENSE", amount: 1000, account: { id: "card", name: "카드", type: "CHECK_CARD" } }),
    makeTx({ id: "d2", date: "2026-02-01", sortOrder: 2, type: "EXPENSE", amount: 2000, account: { id: "card", name: "카드", type: "CHECK_CARD" } }),
    makeTx({ id: "d3", date: "2026-02-01", sortOrder: 3, type: "INCOME", amount: 500, account: { id: "card", name: "카드", type: "CHECK_CARD" } }),
  ];
  assertForwardReverseSymmetry("7.동일 날짜 여러 건", 100000, opening, asc, {
    selectedAccountId: "",
    showSavingsAccount: true,
    savingsAccountIds: noSavings,
  });
}

/* 8. 2페이지 이상을 이어 붙인 DESC 목록(페이지네이션 안정성) ------------------- */
{
  const opening: AccountOpeningLike[] = [{ accountId: "card", amount: 500000 }];
  const asc = [
    makeTx({ id: "p1", date: "2026-03-01", type: "EXPENSE", amount: 1000, account: { id: "card", name: "카드", type: "CHECK_CARD" } }),
    makeTx({ id: "p2", date: "2026-03-02", type: "EXPENSE", amount: 2000, account: { id: "card", name: "카드", type: "CHECK_CARD" } }),
    makeTx({ id: "p3", date: "2026-03-03", type: "INCOME", amount: 3000, account: { id: "card", name: "카드", type: "CHECK_CARD" } }),
    makeTx({ id: "p4", date: "2026-03-04", type: "EXPENSE", amount: 4000, account: { id: "card", name: "카드", type: "CHECK_CARD" } }),
    makeTx({ id: "p5", date: "2026-03-05", type: "INCOME", amount: 5000, account: { id: "card", name: "카드", type: "CHECK_CARD" } }),
  ];
  const options: BalanceCalcOptions = { selectedAccountId: "", showSavingsAccount: true, savingsAccountIds: noSavings };

  const forward = calculateForwardBalances(500000, opening, asc, options);
  const closingTotal = forward[forward.length - 1].runningTotalBalance!;
  const closingAccounts = deriveClosingAccounts(opening, asc, forward);

  const desc = [...asc].reverse(); // p5,p4,p3,p2,p1
  const page1 = desc.slice(0, 2); // 최신 2건만 로드한 첫 페이지
  const page1and2 = desc.slice(0, 5); // 이후 과거 페이지가 이어 붙은 전체

  const resultPage1Only = calculateReverseBalances(closingTotal, closingAccounts, page1, options);
  const resultAfterMorePages = calculateReverseBalances(closingTotal, closingAccounts, page1and2, options);

  for (let i = 0; i < page1.length; i++) {
    assert.equal(
      resultAfterMorePages[i].runningTotalBalance,
      resultPage1Only[i].runningTotalBalance,
      `8.페이지네이션: ${page1[i].id}의 runningTotalBalance가 다음 페이지 로드로 바뀌었습니다`,
    );
    assert.equal(
      resultAfterMorePages[i].runningAccountBalance,
      resultPage1Only[i].runningAccountBalance,
      `8.페이지네이션: ${page1[i].id}의 runningAccountBalance가 다음 페이지 로드로 바뀌었습니다`,
    );
  }
  console.log(`OK  8.페이지네이션 안정성 (1페이지 2건 → 3건 추가 로드 후 기존 값 불변)`);
  passCount++;
}

console.log(`\n${passCount}개 fixture 전부 통과`);
