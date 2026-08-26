/**
 * 거래 등록 "거래 종류" 순수 상태 모델과 변환 유틸리티.
 *
 * IMPLEMENTATION_BRIEF_016 §3 "거래 종류 UI 모델" — `type + isSavings + 선택 계좌`의 여러
 * 조합을 흩어진 boolean 조건으로 관리하지 않기 위해, 화면 상태(EntryKind)와 기존 API
 * payload(`CreateTransactionPayload`: type + isSavings + accountId/toAccountId) 사이의
 * 변환을 이 파일 하나에서만 담당한다. 기존 서버 계약(TransactionType=INCOME/EXPENSE,
 * TransferReq.isSavings)은 바꾸지 않는다 — 화면 상태를 기존 payload로 정확히 옮기기만 한다.
 *
 * `getTransferAccountIds`는 GlobalQuickAdd/TransactionPage/SearchPage/useDraftClassification
 * 네 곳에 각각 있던 "이체 계좌 방향"(fromId/toId) 계산을 그대로 옮겨 하나로 합친 것이다
 * (동작 변경 없음 — 중복 제거만).
 *
 * 이 저장소에는 프론트 테스트 러너가 없어(§14, scripts/verify-ledger-balance.ts와 동일한
 * 이유) 아래 함수들은 `scripts/verify-transaction-entry.ts`에서 Node 24 네이티브 TS 실행 +
 * `node:assert`로 직접 검증한다.
 */

export type EntryKind =
  | "EXPENSE"
  | "INCOME"
  | "TRANSFER"
  | "SAVINGS_DEPOSIT"
  | "SAVINGS_WITHDRAWAL";

/** 계좌 이동(§4.1)의 2단계 선택 — 일반 이체 vs 저축·투자. */
export type MoveSubKind = "TRANSFER" | "SAVINGS";
/** 저축·투자의 방향(§4.1) — 저축하기(일반→저축) / 가져오기(저축→일반). */
export type SavingsDirection = "DEPOSIT" | "WITHDRAWAL";

export function isMoveKind(kind: EntryKind): boolean {
  return kind === "TRANSFER" || kind === "SAVINGS_DEPOSIT" || kind === "SAVINGS_WITHDRAWAL";
}

export function isSavingsKind(
  kind: EntryKind,
): kind is "SAVINGS_DEPOSIT" | "SAVINGS_WITHDRAWAL" {
  return kind === "SAVINGS_DEPOSIT" || kind === "SAVINGS_WITHDRAWAL";
}

export function moveSubKindOf(kind: EntryKind): MoveSubKind | null {
  if (kind === "TRANSFER") return "TRANSFER";
  if (isSavingsKind(kind)) return "SAVINGS";
  return null;
}

export function savingsDirectionOf(kind: EntryKind): SavingsDirection | null {
  if (kind === "SAVINGS_DEPOSIT") return "DEPOSIT";
  if (kind === "SAVINGS_WITHDRAWAL") return "WITHDRAWAL";
  return null;
}

/** 계좌 이동 2단계 선택(§4.1)에서 EntryKind를 조립한다. */
export function buildMoveEntryKind(sub: MoveSubKind, direction: SavingsDirection): EntryKind {
  if (sub === "TRANSFER") return "TRANSFER";
  return direction === "DEPOSIT" ? "SAVINGS_DEPOSIT" : "SAVINGS_WITHDRAWAL";
}

/**
 * 화면 상태(EntryKind) → 기존 API payload 방향(§3 표).
 *   EXPENSE            → 기존 EXPENSE
 *   INCOME             → 기존 INCOME
 *   TRANSFER           → 기존 TRANSFER
 *   SAVINGS_DEPOSIT    → 기존 저축 지출 표현 (EXPENSE + isSavings)
 *   SAVINGS_WITHDRAWAL → 기존 저축 수입 표현 (INCOME + isSavings)
 */
export function entryKindToPayloadDirection(
  kind: EntryKind,
): { type: TransactionType | "TRANSFER"; isSavings: boolean } {
  switch (kind) {
    case "EXPENSE":
      return { type: "EXPENSE", isSavings: false };
    case "INCOME":
      return { type: "INCOME", isSavings: false };
    case "TRANSFER":
      return { type: "TRANSFER", isSavings: false };
    case "SAVINGS_DEPOSIT":
      return { type: "EXPENSE", isSavings: true };
    case "SAVINGS_WITHDRAWAL":
      return { type: "INCOME", isSavings: true };
  }
}

/**
 * 기존 payload(type + isSavings) → 화면 상태. 수정 모드·임시저장 복원·"나중에 분류" 큐 항목의
 * `defaultValues`에서 EntryKind를 되살릴 때 쓴다(entryKindToPayloadDirection의 역함수).
 */
export function deriveEntryKind(input: {
  type?: TransactionType | "TRANSFER" | null;
  isSavings?: boolean | null;
}): EntryKind {
  const type = input.type ?? "EXPENSE";
  const isSavings = !!input.isSavings;
  if (type === "TRANSFER") return "TRANSFER";
  if (isSavings) return type === "INCOME" ? "SAVINGS_WITHDRAWAL" : "SAVINGS_DEPOSIT";
  return type === "INCOME" ? "INCOME" : "EXPENSE";
}

/**
 * 이체/저축 등록 시 실제 서버로 보낼 출금(from)·입금(to) 계좌 id.
 * GlobalQuickAdd.handleSubmitRegularTransaction / TransactionPage.handleSubmitTransaction /
 * SearchPage.handleSubmitTransaction / useDraftClassification.confirmDraft에 각각 있던
 *   `fromId = payload.type === "INCOME" ? payload.toAccountId! : payload.accountId`
 * 계산을 그대로 옮긴 것이다(동작 변경 없음).
 */
export function getTransferAccountIds(payload: {
  type: TransactionType | "TRANSFER";
  accountId: string;
  toAccountId?: string;
}): { fromAccountId: string; toAccountId: string } {
  const fromAccountId = payload.type === "INCOME" ? payload.toAccountId! : payload.accountId;
  const toAccountId = payload.type === "INCOME" ? payload.accountId : payload.toAccountId!;
  return { fromAccountId, toAccountId };
}

/** 계좌 성격 판별 — `SAVINGS_INVESTMENT` 타입만 "저축·투자" 계좌다. */
export function isSavingsAccountType(account: { type: string } | null | undefined): boolean {
  return account?.type === "SAVINGS_INVESTMENT";
}

/* ------------------------------------------------------------------------ */
/* 모달 내부 상태(fromAccountId/toAccountId, 문자 그대로 "출발/도착") ↔ 기존 payload   */
/* (accountId/toAccountId) 변환.                                             */
/*                                                                            */
/* SAVINGS_WITHDRAWAL만 기존 관례상 accountId가 도착(일반 계좌), toAccountId가        */
/* 출발(저축 계좌)이라 뒤집힌다 — TransactionPage/SearchPage의 handleEdit,            */
/* getTransferAccountIds가 이미 따르던 관례를 그대로 반영한 것이지, 새로 만든 규칙이      */
/* 아니다. 나머지(TRANSFER, SAVINGS_DEPOSIT)는 출발=accountId, 도착=toAccountId로     */
/* 그대로 대응한다.                                                            */
/* ------------------------------------------------------------------------ */

export function toPayloadAccountFields(
  kind: EntryKind,
  fromAccountId: string,
  toAccountId: string,
): { accountId: string; toAccountId?: string } {
  if (kind === "SAVINGS_WITHDRAWAL") {
    return { accountId: toAccountId, toAccountId: fromAccountId };
  }
  if (isMoveKind(kind)) {
    return { accountId: fromAccountId, toAccountId };
  }
  return { accountId: fromAccountId, toAccountId: undefined };
}

/** toPayloadAccountFields의 역함수. defaultValues(수정/임시저장 복원)에서 내부 from/to 상태를 되살릴 때 쓴다. */
export function fromPayloadAccountFields(
  kind: EntryKind,
  payload: { accountId?: string; toAccountId?: string },
): { fromAccountId: string; toAccountId: string } {
  const accountId = payload.accountId ?? "";
  const to = payload.toAccountId ?? "";
  if (kind === "SAVINGS_WITHDRAWAL") {
    return { fromAccountId: to, toAccountId: accountId };
  }
  if (isMoveKind(kind)) {
    return { fromAccountId: accountId, toAccountId: to };
  }
  return { fromAccountId: accountId, toAccountId: "" };
}

/* ------------------------------------------------------------------------ */
/* 계좌 선택 목록 필터링 (§5) — 방향(from/to)에 맞는 계좌 성격만 노출한다.              */
/* QA_REVIEW_037 P2 — 비활성 계좌는 선택 후보 자체에서 제외한다(제출 시점에야 오류로       */
/* 드러나지 않도록). `to`/`from` 기준 계좌를 찾을 때는 원본 목록에서 찾되(그 계좌 자체가     */
/* 어떤 이유로 비활성이어도 "성격"은 알아야 하므로), 반환하는 후보 목록은 활성 계좌로만     */
/* 좁힌다.                                                                     */
/* ------------------------------------------------------------------------ */

type AccountLike = { id: string; type: string; isActive?: boolean; isDefault?: boolean };

function isAccountActive(a: AccountLike): boolean {
  return a.isActive ?? true;
}

export function getFromAccountOptions<A extends AccountLike>(
  kind: EntryKind,
  accounts: A[],
  toAccountId: string,
): A[] {
  const active = accounts.filter(isAccountActive);
  switch (kind) {
    case "SAVINGS_DEPOSIT": // 저축하기: 출발 = 일반 계좌만
      return active.filter((a) => !isSavingsAccountType(a));
    case "SAVINGS_WITHDRAWAL": // 가져오기: 출발 = 저축·투자 계좌만
      return active.filter((a) => isSavingsAccountType(a));
    case "TRANSFER": {
      // 도착 계좌가 먼저 정해져 있으면 같은 성격만, 아니면 도착 계좌 자신만 제외.
      const to = toAccountId ? accounts.find((a) => a.id === toAccountId) : undefined;
      if (to) {
        const toIsSavings = isSavingsAccountType(to);
        return active.filter((a) => isSavingsAccountType(a) === toIsSavings && a.id !== toAccountId);
      }
      return active.filter((a) => a.id !== toAccountId);
    }
    default: // EXPENSE / INCOME
      return active;
  }
}

export function getToAccountOptions<A extends AccountLike>(
  kind: EntryKind,
  accounts: A[],
  fromAccountId: string,
): A[] {
  const active = accounts.filter(isAccountActive);
  switch (kind) {
    case "SAVINGS_DEPOSIT": // 저축하기: 도착 = 저축·투자 계좌만
      return active.filter((a) => isSavingsAccountType(a) && a.id !== fromAccountId);
    case "SAVINGS_WITHDRAWAL": // 가져오기: 도착 = 일반 계좌만
      return active.filter((a) => !isSavingsAccountType(a) && a.id !== fromAccountId);
    case "TRANSFER": {
      const from = fromAccountId ? accounts.find((a) => a.id === fromAccountId) : undefined;
      if (from) {
        const fromIsSavings = isSavingsAccountType(from);
        return active.filter((a) => isSavingsAccountType(a) === fromIsSavings && a.id !== fromAccountId);
      }
      return active.filter((a) => a.id !== fromAccountId);
    }
    default: // EXPENSE / INCOME은 도착 계좌 선택이 없다.
      return [];
  }
}

/**
 * 계좌 id가 현재 목록에 실제로 존재하고 활성 상태인지 확인한다(§10.1 공통 검사와 동일한
 * 기준). 기본 결제수단·최근 추천 자동 적용 전에 쓴다(QA_REVIEW_037 P2).
 */
export function isAccountUsable(accountId: string, accounts: AccountLike[]): boolean {
  const found = accounts.find((a) => a.id === accountId);
  return !!found && isAccountActive(found);
}

/* ------------------------------------------------------------------------ */
/* 제출 직전 계좌 조합 검증 (§10) — 선택 목록 필터링만 믿지 않고 현재 계좌 목록 기준으로    */
/* 다시 검증한다.                                                             */
/* ------------------------------------------------------------------------ */

export type AccountValidationField = "from" | "to";

export interface AccountValidationError {
  field: AccountValidationField;
  message: string;
}

export function validateAccountSelection(
  kind: EntryKind,
  fromAccountId: string,
  toAccountId: string,
  accounts: { id: string; type: string; isActive: boolean }[],
): AccountValidationError | null {
  const findActive = (id: string) => accounts.find((a) => a.id === id && a.isActive);

  if (!isMoveKind(kind)) {
    if (!fromAccountId) {
      return {
        field: "from",
        message: kind === "INCOME" ? "입금 계좌를 선택해 주세요." : "결제수단을 선택해 주세요.",
      };
    }
    if (!findActive(fromAccountId)) {
      return { field: "from", message: "선택한 계좌를 사용할 수 없어요. 다시 선택해 주세요." };
    }
    return null;
  }

  const emptyFromMessage =
    kind === "SAVINGS_WITHDRAWAL"
      ? "가져올 저축·투자 계좌를 선택해 주세요."
      : kind === "SAVINGS_DEPOSIT"
        ? "저축할 일반 계좌를 선택해 주세요."
        : "출발 계좌를 선택해 주세요.";
  const emptyToMessage =
    kind === "SAVINGS_WITHDRAWAL"
      ? "받을 일반 계좌를 선택해 주세요."
      : kind === "SAVINGS_DEPOSIT"
        ? "들어갈 저축·투자 계좌를 선택해 주세요."
        : "도착 계좌를 선택해 주세요.";

  if (!fromAccountId) return { field: "from", message: emptyFromMessage };
  if (!toAccountId) return { field: "to", message: emptyToMessage };

  const from = findActive(fromAccountId);
  const to = findActive(toAccountId);
  if (!from) return { field: "from", message: "선택한 출발 계좌를 사용할 수 없어요. 다시 선택해 주세요." };
  if (!to) return { field: "to", message: "선택한 도착 계좌를 사용할 수 없어요. 다시 선택해 주세요." };

  if (fromAccountId === toAccountId) {
    return { field: "to", message: "같은 계좌로는 이동할 수 없어요." };
  }

  const fromIsSavings = isSavingsAccountType(from);
  const toIsSavings = isSavingsAccountType(to);

  if (kind === "TRANSFER") {
    if (fromIsSavings !== toIsSavings) {
      return { field: "to", message: "일반 이체는 같은 종류의 계좌끼리만 할 수 있어요." };
    }
    return null;
  }

  if (kind === "SAVINGS_DEPOSIT") {
    if (fromIsSavings) return { field: "from", message: emptyFromMessage };
    if (!toIsSavings) return { field: "to", message: emptyToMessage };
    return null;
  }

  // SAVINGS_WITHDRAWAL
  if (!fromIsSavings) return { field: "from", message: emptyFromMessage };
  if (toIsSavings) return { field: "to", message: emptyToMessage };
  return null;
}

/* ------------------------------------------------------------------------ */
/* 기본 결제수단 자동 선택 우선순위 (§6) — QA_REVIEW_037 P2 대응으로 순수 함수로 분리.   */
/* ------------------------------------------------------------------------ */

export type AccountAutoFillSource = "default" | "recent";

export interface AccountAutoFillResult {
  accountId: string;
  source: AccountAutoFillSource;
}

/**
 * §6 우선순위 4~5단계(기본 결제수단 → 최근 추천)를 순수하게 계산한다. 1~3순위(복원값·
 * 사용자 선택·템플릿 적용값)는 "이미 값이 있으면 이 함수를 아예 호출하지 않는다"는
 * 불변식으로 호출자가 보장한다 — `hasCurrentValue`/`isUserModified`가 그 불변식을 계산
 * 안에서도 한 번 더 확인해, 호출자가 실수로 가드를 빼먹어도 안전하게 `null`을 돌려준다.
 *
 * 이체·저축(계좌 이동)에는 적용하지 않는다(§6 "출발·도착 계좌를 기본 결제수단 하나로
 * 무리하게 모두 채우지 않는다"). 추천 계좌는 현재 목록에 실제로 존재하고 활성 상태일
 * 때만("§10.1 공통" 기준과 동일) 적용하고, 아니면 아무 것도 채우지 않는다(빈 상태 유지).
 */
export function resolveAccountAutoFill(input: {
  kind: EntryKind;
  hasCurrentValue: boolean;
  isUserModified: boolean;
  accounts: AccountLike[];
  suggestedAccountId?: string | null;
}): AccountAutoFillResult | null {
  if (isMoveKind(input.kind)) return null;
  if (input.isUserModified) return null;
  if (input.hasCurrentValue) return null;

  const defaultAccount = input.accounts.find((a) => a.isDefault && isAccountActive(a));
  if (defaultAccount) {
    return { accountId: defaultAccount.id, source: "default" };
  }

  if (input.suggestedAccountId && isAccountUsable(input.suggestedAccountId, input.accounts)) {
    return { accountId: input.suggestedAccountId, source: "recent" };
  }

  return null;
}

/* ------------------------------------------------------------------------ */
/* 임시저장 허용 여부 (§8) — 계좌 이동은 draft API가 계좌·저축 방향을 보존하지 못해       */
/* 임시저장을 허용하지 않는다.                                                 */
/* ------------------------------------------------------------------------ */

export function isDraftSaveAllowed(kind: EntryKind): boolean {
  return !isMoveKind(kind);
}
