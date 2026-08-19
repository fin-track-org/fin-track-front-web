/**
 * 거래 후 잔액(runningTotalBalance/runningAccountBalance/runningLinkedAccountBalance) 계산을
 * `TransactionPage.tsx`에서 순수 함수로 분리한 것 (IMPLEMENTATION_BRIEF_011 §4, §7).
 *
 * `calculateForwardBalances`는 기존 ASC(엑셀 장부·데스크톱) 계산 로직을 그대로 옮긴 것으로
 * 동작을 바꾸지 않았다. `calculateReverseBalances`는 모바일 "편하게 보기"(최신순)를 위해
 * 새로 추가했다 — 종료 잔액에서 최신 거래부터 거꾸로 되돌리며 각 거래의 "거래 후 잔액"을
 * 기록한다. 같은 거래 집합에 대해 정방향 결과를 뒤집은 값과 역산 결과가 수학적으로
 * 일치해야 한다(`scripts/verify-ledger-balance.ts`에서 검증).
 *
 * 두 함수 모두 페이지네이션에 안전하다 — 항상 고정된 시작/종료 잔액에서 전체 배열을 다시
 * 훑는 순수 함수라, 이미 로드된 페이지에 새 페이지가 이어 붙어도(배열 끝에 추가) 기존
 * 항목의 계산 결과는 동일하게 재생산되고 새로 붙은 항목만 이어서 계산된다.
 */

export interface AccountOpeningLike {
  accountId: string;
  amount: number;
}

export interface BalanceLike {
  totalAmount: number;
  accounts: AccountOpeningLike[];
}

/**
 * `TransactionPage.tsx`의 기존 `filteredOpeningBalance`/`filteredClosingBalance`가 쓰던
 * "저축·투자 계좌 제외" 계산을 그대로 옮긴 순수 함수. 잔액 선반(모바일 §6)의 전체 자산
 * 카드에도 같은 필터가 필요해 재사용하려고 뺐다 — 동작은 바꾸지 않았다.
 */
export function filterBalanceBySavings(
  balance: BalanceLike | undefined,
  showSavingsAccount: boolean,
  savingsAccountIds: ReadonlySet<string>,
): BalanceLike | undefined {
  if (!balance) return balance;
  if (showSavingsAccount) return balance;

  const filteredAccountsBalances = balance.accounts.filter((a) => !savingsAccountIds.has(a.accountId));
  const newTotal = filteredAccountsBalances.reduce((sum, a) => sum + a.amount, 0);

  return { totalAmount: newTotal, accounts: filteredAccountsBalances };
}

export interface BalanceCalcOptions {
  /** 특정 결제수단만 조회 중이면 그 계좌 id, 전체 조회면 빈 문자열. */
  selectedAccountId: string;
  /** "저축·투자 계좌 잔액 포함" 스위치 상태. */
  showSavingsAccount: boolean;
  /** 저축·투자(SAVINGS_INVESTMENT) 타입 계좌 id 집합. */
  savingsAccountIds: ReadonlySet<string>;
}

/**
 * 전체 계좌 보기(선택 계좌 없음)에서 이체 한 건이 "화면에 표시되는 전체 합계"에 미치는
 * 영향을 계산한다(QA_REVIEW_024 §3). 출발·도착 계좌가 각각 현재 필터에 포함되는지에 따라:
 *
 * - 포함 → 포함, 제외 → 제외: 0 (양쪽 다 합계 안팎이거나 양쪽 다 합계 밖이라 변화 없음)
 * - 포함 → 제외: 합계에서 amount만큼 빠져나간 것으로 봐야 하므로 `-amount`
 * - 제외 → 포함: 합계로 amount만큼 들어온 것으로 봐야 하므로 `+amount`
 *
 * `showSavingsAccount === true`이면 모든 계좌가 포함이므로 항상 0이다. forward/reverse가
 * 이 순수 함수를 공유해 규칙이 어긋나지 않게 한다(reverse는 반환값의 부호를 뒤집어 되돌린다).
 */
export function getTransferTotalDelta(
  t: Transaction,
  savingsAccountIds: ReadonlySet<string>,
  showSavingsAccount: boolean,
): number {
  if (!t.transferDetail) return 0;
  if (showSavingsAccount) return 0;

  const fromIncluded = !savingsAccountIds.has(t.transferDetail.fromAccount.id);
  const toIncluded = !savingsAccountIds.has(t.transferDetail.toAccount.id);

  if (fromIncluded === toIncluded) return 0;
  return fromIncluded ? -t.amount : t.amount;
}

/**
 * ASC(오래된 거래가 먼저) 목록을 시작 잔액부터 누적한다. 데스크톱·엑셀 장부가 쓰던
 * `TransactionPage.tsx`의 기존 `transactions` useMemo 본문을 그대로 옮겼다(로직 변경 없음).
 */
export function calculateForwardBalances(
  openingTotal: number,
  openingAccounts: AccountOpeningLike[],
  transactionsAsc: Transaction[],
  options: BalanceCalcOptions,
): Transaction[] {
  const { selectedAccountId, showSavingsAccount, savingsAccountIds } = options;

  let currentTotal = openingTotal;
  const accMap = new Map<string, number>();
  openingAccounts.forEach((a) => accMap.set(a.accountId, a.amount));

  return transactionsAsc.map((t) => {
    const isTransfer = !!t.transferDetail;
    const signedAmount = t.type === "EXPENSE" ? -t.amount : t.amount;
    let runningAccountBalance = 0;
    let runningLinkedAccountBalance: number | undefined;

    if (isTransfer) {
      if (selectedAccountId) {
        // 특정 계좌 조회 중이면 해당 계좌의 잔액만 업데이트
        const newAccBal = (accMap.get(t.account.id) ?? 0) + signedAmount;
        accMap.set(t.account.id, newAccBal);
        runningAccountBalance = newAccBal;
      } else {
        // 전체 계좌 조회 중이면 출금/입금 양쪽 모두 업데이트 시도
        const newAccBal = (accMap.get(t.account.id) ?? 0) + signedAmount;
        accMap.set(t.account.id, newAccBal);
        runningAccountBalance = newAccBal;

        if (t.transferDetail && t.type === "EXPENSE") {
          const linkedId = t.transferDetail.toAccount.id;
          const linkedBal = (accMap.get(linkedId) ?? 0) + t.amount;
          accMap.set(linkedId, linkedBal);
          runningLinkedAccountBalance = linkedBal;
        }
      }
    } else {
      // 일반 거래(잔액 조정 포함 — 서버가 별도 transferDetail을 주지 않는 한 일반 거래와
      // 동일한 공식으로 처리된다. 기존 코드도 잔액 조정을 특별 취급하지 않았다.)
      const newAccBal = (accMap.get(t.account.id) ?? 0) + signedAmount;
      accMap.set(t.account.id, newAccBal);
      runningAccountBalance = newAccBal;
    }

    // 총 잔액 업데이트 (전체 계좌 보기 시 이체는 출발·도착 계좌의 포함 여부에 따라 델타가
    // 0이 아닐 수 있다 — QA_REVIEW_024 §3, `getTransferTotalDelta` 참고.)
    if (isTransfer && !selectedAccountId) {
      currentTotal += getTransferTotalDelta(t, savingsAccountIds, showSavingsAccount);
    } else {
      const isSavings = savingsAccountIds.has(t.account.id);
      if (showSavingsAccount || !isSavings) {
        currentTotal += signedAmount;
      }
    }

    return {
      ...t,
      runningTotalBalance: currentTotal,
      runningAccountBalance,
      runningLinkedAccountBalance,
    };
  });
}

/**
 * DESC(최신 거래가 먼저) 목록을 종료 잔액부터 거꾸로 되돌린다. 각 거래의 "거래 후 잔액"은
 * 그 거래를 되돌리기 **전**의 cursor 값이다 — 기록한 뒤에 효과를 역으로 적용해 다음(더 과거)
 * 거래의 cursor를 만든다(IMPLEMENTATION_BRIEF_011 §7).
 *
 * `calculateForwardBalances`가 각 단계에서 하는 연산(부호 있는 금액을 계좌/총잔액에 더하는
 * 것)의 정확한 역연산(빼는 것)만 수행한다 — 이체·저축은 출금·입금 계좌를 각각 역산하고
 * (전체 보기에서 총잔액은 변하지 않음), 잔액 조정은 일반 거래와 같은 공식의 역연산을 쓴다
 * (서버가 별도 유형으로 구분하지 않으므로 임의로 다르게 취급하지 않는다).
 */
export function calculateReverseBalances(
  closingTotal: number,
  closingAccounts: AccountOpeningLike[],
  transactionsDesc: Transaction[],
  options: BalanceCalcOptions,
): Transaction[] {
  const { selectedAccountId, showSavingsAccount, savingsAccountIds } = options;

  let currentTotal = closingTotal;
  const accMap = new Map<string, number>();
  closingAccounts.forEach((a) => accMap.set(a.accountId, a.amount));

  return transactionsDesc.map((t) => {
    const isTransfer = !!t.transferDetail;
    const signedAmount = t.type === "EXPENSE" ? -t.amount : t.amount;

    const hasLinked = isTransfer && !selectedAccountId && t.transferDetail && t.type === "EXPENSE";
    const linkedId = hasLinked ? t.transferDetail!.toAccount.id : undefined;

    // 1) "거래 후 잔액" = 되돌리기 전, 지금 cursor에 남아 있는 값을 그대로 기록한다.
    const runningTotalBalance = currentTotal;
    const runningAccountBalance = accMap.get(t.account.id) ?? 0;
    const runningLinkedAccountBalance = linkedId !== undefined ? (accMap.get(linkedId) ?? 0) : undefined;

    // 2) 이 거래의 효과를 역으로 적용해 다음(더 과거) 거래의 cursor를 만든다.
    accMap.set(t.account.id, (accMap.get(t.account.id) ?? 0) - signedAmount);
    if (linkedId !== undefined) {
      accMap.set(linkedId, (accMap.get(linkedId) ?? 0) - t.amount);
    }

    if (isTransfer && !selectedAccountId) {
      // 정방향이 더한 delta를 그대로 빼서 되돌린다(같은 순수 규칙 공유).
      currentTotal -= getTransferTotalDelta(t, savingsAccountIds, showSavingsAccount);
    } else {
      const isSavings = savingsAccountIds.has(t.account.id);
      if (showSavingsAccount || !isSavings) {
        currentTotal -= signedAmount;
      }
    }

    return {
      ...t,
      runningTotalBalance,
      runningAccountBalance,
      runningLinkedAccountBalance,
    };
  });
}
