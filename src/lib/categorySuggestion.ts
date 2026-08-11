/**
 * "나중에 분류" 연속 처리 화면의 카테고리 추천 로직 (v1).
 *
 * IMPLEMENTATION_BRIEF_01.md §4.5 "추천 규칙 v1" 요구사항을 그대로 구현한다.
 * 새로운 AI/백엔드 추천 API를 만들지 않고, 기존 거래 조회 API와
 * 클라이언트 로컬 저장소만으로 추천 근거를 만든다.
 *
 * 우선순위
 *  1) 같은 메모로 최근 사용한 카테고리가 기존 데이터(서버)에 있으면 사용
 *  2) 클라이언트에 최근 선택 정보가 있으면 사용 (localStorage)
 *  3) 없으면 사용 빈도가 높은 항목(최근 거래 집계) 또는 기본 목록
 *  4) 신뢰할 수 없으면 추천 표시 없이 최근 항목만 제공
 */

export type SuggestionBasis = "memo-history" | "recent-choice" | "frequency" | "none";

export interface CategorySuggestion {
  categoryId?: string;
  subCategoryId?: string;
  accountId?: string;
  basis: SuggestionBasis;
  /** 근거가 있을 때만 채워지는 사람이 읽는 문장. 근거 없는 "AI 추천" 라벨은 만들지 않는다. */
  hint?: string;
}

const STORAGE_KEY = "ll_recent_category_by_memo";
const MAX_REMEMBERED = 200;

export function normalizeMemo(text: string | null | undefined): string {
  return (text ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

interface RememberedChoice {
  categoryId: string;
  subCategoryId?: string;
  accountId?: string;
  updatedAt: number;
}

function readStore(): Record<string, RememberedChoice> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeStore(store: Record<string, RememberedChoice>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // 저장 실패는 추천 기능만 못 쓰는 것이므로 조용히 무시한다.
  }
}

/** 분류 완료 시 호출 — 다음에 같은 메모가 오면 우선순위 2로 사용된다. */
export function rememberCategoryChoice(
  description: string,
  choice: { categoryId: string; subCategoryId?: string; accountId?: string },
): void {
  const key = normalizeMemo(description);
  if (!key) return;

  const store = readStore();
  store[key] = { ...choice, updatedAt: Date.now() };

  // 저장소가 너무 커지지 않도록 오래된 항목부터 정리한다.
  const entries = Object.entries(store);
  if (entries.length > MAX_REMEMBERED) {
    entries
      .sort((a, b) => a[1].updatedAt - b[1].updatedAt)
      .slice(0, entries.length - MAX_REMEMBERED)
      .forEach(([k]) => delete store[k]);
  }

  writeStore(store);
}

function getRememberedChoice(description: string): RememberedChoice | undefined {
  const key = normalizeMemo(description);
  if (!key) return undefined;
  return readStore()[key];
}

/**
 * 우선순위 1: 서버에서 같은 메모(정확 일치, 공백/대소문자 무시)로
 * 최근에 정식 등록된 거래를 찾아 그 분류를 추천한다.
 * 호출부에서 `fetchTransactions({ keyword, size, sortDirection: "DESC" })` 결과를 넘겨준다.
 */
export function findMemoMatch(
  description: string,
  candidates: Transaction[],
): Transaction | undefined {
  const target = normalizeMemo(description);
  if (!target) return undefined;

  return candidates.find(
    (t) => !!t.category && normalizeMemo(t.description) === target,
  );
}

/**
 * 우선순위 3: 최근 거래 목록에서 같은 거래 유형의 카테고리 사용 빈도를 집계해
 * 가장 많이 쓴 카테고리를 고른다. 데이터가 없으면 undefined.
 */
export function findFrequentCategory(
  type: TransactionType,
  recentTransactions: Transaction[],
): { categoryId: string; count: number } | undefined {
  const counts = new Map<string, number>();

  for (const t of recentTransactions) {
    if (t.type !== type || !t.category) continue;
    // 이체/저축/잔액조정 등 시스템 카테고리는 추천 대상에서 제외한다.
    if (t.category.code?.startsWith("TRANSFER_") || t.category.code?.startsWith("SAVINGS_") || t.category.code?.startsWith("BALANCE_ADJUST_")) {
      continue;
    }
    counts.set(t.category.id, (counts.get(t.category.id) ?? 0) + 1);
  }

  let best: { categoryId: string; count: number } | undefined;
  counts.forEach((count, categoryId) => {
    if (!best || count > best.count) best = { categoryId, count };
  });
  return best;
}

interface BuildSuggestionInput {
  description: string;
  type: TransactionType;
  /** 같은 메모 키워드로 조회한 서버 거래 목록 (우선순위 1) */
  memoMatches: Transaction[];
  /** 최근 거래 목록 (우선순위 3 집계용) */
  recentTransactions: Transaction[];
}

/** 4가지 우선순위를 순서대로 평가해 최종 추천을 만든다. */
export function buildCategorySuggestion({
  description,
  type,
  memoMatches,
  recentTransactions,
}: BuildSuggestionInput): CategorySuggestion {
  // 1) 같은 메모의 최근 이력
  const memoMatch = findMemoMatch(description, memoMatches);
  if (memoMatch?.category) {
    return {
      categoryId: memoMatch.category.id,
      subCategoryId: memoMatch.subcategory?.id,
      accountId: memoMatch.account?.id,
      basis: "memo-history",
      hint: `지난번 "${memoMatch.description}"은 ${memoMatch.category.name}으로 기록했어요.`,
    };
  }

  // 2) 클라이언트에 기억된 최근 선택
  const remembered = getRememberedChoice(description);
  if (remembered) {
    return {
      categoryId: remembered.categoryId,
      subCategoryId: remembered.subCategoryId,
      accountId: remembered.accountId,
      basis: "recent-choice",
      hint: "최근에 이 메모로 골랐던 분류예요.",
    };
  }

  // 3) 최근 사용 빈도가 높은 카테고리
  const frequent = findFrequentCategory(type, recentTransactions);
  if (frequent) {
    return {
      categoryId: frequent.categoryId,
      basis: "frequency",
      hint: "요즘 자주 쓰는 분류예요.",
    };
  }

  // 4) 근거 없음 — 추천 표시 없이 기본 목록만 제공
  return { basis: "none" };
}
