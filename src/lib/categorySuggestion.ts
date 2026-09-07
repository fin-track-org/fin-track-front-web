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
  /** 거래 유형. DESIGN_QA_02.md P1-2R 이전에 저장된 값은 이 필드가 없어 undefined일 수 있다. */
  type?: TransactionType;
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

/**
 * 분류 완료 시 호출 — 다음에 같은 메모 + 같은 거래 유형이 오면 우선순위 2로 사용된다.
 * 거래 유형을 함께 저장해야 "월급"처럼 같은 메모가 수입/지출 모두에 쓰이는 경우
 * 서로 다른 유형에 잘못 추천되지 않는다(DESIGN_QA_02.md P1-2R).
 */
export function rememberCategoryChoice(
  description: string,
  type: TransactionType,
  choice: { categoryId: string; subCategoryId?: string; accountId?: string },
): void {
  const key = normalizeMemo(description);
  if (!key) return;

  const store = readStore();
  store[key] = { ...choice, type, updatedAt: Date.now() };

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

/**
 * 같은 메모 + 같은 거래 유형으로 기억된 선택만 반환한다.
 * `type`이 없는 과거 데이터(P1-2R 수정 이전에 저장됨)는 유형을 신뢰할 수 없으므로
 * 마이그레이션 없이 그냥 무시한다.
 */
function getRememberedChoice(description: string, type: TransactionType): RememberedChoice | undefined {
  const key = normalizeMemo(description);
  if (!key) return undefined;
  const found = readStore()[key];
  if (!found || found.type !== type) return undefined;
  return found;
}

/** 이체/저축/잔액조정 등 사용자가 직접 고를 수 없는 시스템 카테고리 코드인지 검사한다. */
const SYSTEM_CATEGORY_CODE_PREFIXES = ["TRANSFER_", "SAVINGS_", "BALANCE_ADJUST_"];
export function isSystemCategoryCode(code?: string | null): boolean {
  if (!code) return false;
  return SYSTEM_CATEGORY_CODE_PREFIXES.some((prefix) => code.startsWith(prefix));
}

/**
 * 우선순위 1: 서버에서 같은 메모(정확 일치, 공백/대소문자 무시)이면서
 * **같은 거래 유형**으로 최근에 정식 등록된 거래를 찾아 그 분류를 추천한다.
 * 이체/저축/잔액조정 같은 시스템 카테고리는 일반 분류에 추천하지 않는다.
 * 호출부에서 `fetchTransactions({ keyword, size, sortDirection: "DESC" })` 결과를 넘겨준다.
 *
 * (DESIGN_QA_01.md P1-2: 거래 유형/시스템 카테고리를 구분하지 않던 문제 수정)
 */
export function findMemoMatch(
  description: string,
  type: TransactionType,
  candidates: Transaction[],
): Transaction | undefined {
  const target = normalizeMemo(description);
  if (!target) return undefined;

  return candidates.find(
    (t) =>
      t.type === type &&
      !!t.category &&
      !isSystemCategoryCode(t.category.code) &&
      normalizeMemo(t.description) === target,
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
    if (isSystemCategoryCode(t.category.code)) continue;
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
  // 1) 같은 메모 + 같은 거래 유형의 최근 이력
  const memoMatch = findMemoMatch(description, type, memoMatches);
  if (memoMatch?.category) {
    return {
      categoryId: memoMatch.category.id,
      subCategoryId: memoMatch.subcategory?.id,
      accountId: memoMatch.account?.id,
      basis: "memo-history",
      hint: `지난번 "${memoMatch.description}"은 ${memoMatch.category.name}으로 기록했어요.`,
    };
  }

  // 2) 클라이언트에 기억된 최근 선택 (같은 거래 유형일 때만)
  const remembered = getRememberedChoice(description, type);
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

/** `sanitizeCategorySelection`/`sanitizeSuggestion`이 검증 대상으로 받는 카테고리 최소 모양. */
export interface CategoryLike {
  id: string;
  type: string;
  code?: string | null;
}

/**
 * 세부항목 하나가 실제로 어느 category에 속하는지 나타내는 최소 모양.
 * `SubCategory`(category.d.ts)의 `categoryId`를 그대로 쓰거나, 호출부가 "지금 이 목록은
 * 이 category의 것"이라는 걸 알고 있을 때 직접 구성해서 넘긴다.
 */
export interface SubCategoryLike {
  id: string;
  categoryId: string;
}

export interface CategorySelectionInput {
  type: string;
  categoryId?: string | null;
  subCategoryId?: string | null;
}

export interface CategorySelectionResult {
  categoryId: string;
  subCategoryId: string;
}

/**
 * category/subcategory 선택 하나를 검증하고 정규화하는 단일 규칙
 * (IMPLEMENTATION_BRIEF_021 §4.1·§4.2 — 추천값과 기존 draft 초기값이 공유한다).
 *
 * - category가 없거나, 현재 로드된 목록에 없거나, 유형이 `input.type`과 다르거나,
 *   이체/저축/잔액조정용 시스템 카테고리면 category와 subcategory를 모두 버린다.
 * - category는 유효한데 subcategory가 있으면, 그 category의 subcategory 목록을 알고
 *   있을 때만(`subCategoriesOfCategory`가 주어졌을 때만) 소속을 검증해 다르면 subcategory만
 *   버린다. 목록을 아직 모르면(`undefined`) 검증을 건너뛰고 값을 그대로 둔다 — 호출부가
 *   해당 category의 subcategory를 불러온 뒤 같은 함수를 다시 호출해 정리한다. 이 함수 자체는
 *   어떤 네트워크 요청도 만들지 않는다(§9).
 * - 같은 입력에는 항상 같은 결과를 반환하는 결정적 순수 함수라, "적용 → 제거 → 재적용"
 *   경쟁이 구조적으로 생기지 않는다(§4.3) — 호출부는 이 함수의 결과만 state에 반영하면 된다.
 */
export function sanitizeCategorySelection(
  input: CategorySelectionInput,
  categories: CategoryLike[],
  subCategoriesOfCategory?: SubCategoryLike[],
): CategorySelectionResult {
  const matchedCategory = input.categoryId
    ? categories.find((c) => c.id === input.categoryId)
    : undefined;
  const categoryValid =
    !!matchedCategory && matchedCategory.type === input.type && !isSystemCategoryCode(matchedCategory.code);

  if (!categoryValid) {
    return { categoryId: "", subCategoryId: "" };
  }

  const categoryId = input.categoryId as string;
  if (!input.subCategoryId) {
    return { categoryId, subCategoryId: "" };
  }
  if (subCategoriesOfCategory === undefined) {
    return { categoryId, subCategoryId: input.subCategoryId };
  }

  const subCategoryValid = subCategoriesOfCategory.some(
    (sc) => sc.id === input.subCategoryId && sc.categoryId === categoryId,
  );
  return { categoryId, subCategoryId: subCategoryValid ? input.subCategoryId : "" };
}

/**
 * 추천된 categoryId/subCategoryId/accountId가 지금 화면에 실제로 선택 가능한지 검증하고,
 * 아니면 제거한다. category/subcategory 검증 기준은 `sanitizeCategorySelection`과 같다
 * (DESIGN_QA_02.md P1-2R가 세운 category 기준 + IMPLEMENTATION_BRIEF_021 §4.1이 추가한
 * subcategory 소속 검증). account 검증 기준은 그대로다 — 현재 로드된 목록에 실제로 있는가.
 * 대분류가 무효화되면 그에 딸린 소분류 추천과 안내 문구도 함께 버린다.
 *
 * `subCategoriesOfCategory`를 주지 않으면(기본값) subcategory 소속 검증은 건너뛴다 —
 * 호출부가 추천 category의 subcategory 목록을 아직 로드하지 않았을 수 있고, 이 함수는
 * 그 목록을 얻기 위해 새 요청을 만들지 않는다(§9). 그 경우 subcategory 소속 검증은
 * 호출부(예: `AddTransactionModal`의 추천 적용 effect)가 이미 로드한 데이터로 별도 수행한다.
 */
export function sanitizeSuggestion(
  suggestion: CategorySuggestion,
  type: TransactionType,
  categories: CategoryLike[],
  accounts: Array<{ id: string }>,
  subCategoriesOfCategory?: SubCategoryLike[],
): CategorySuggestion {
  const normalizedCategory = sanitizeCategorySelection(
    { type, categoryId: suggestion.categoryId, subCategoryId: suggestion.subCategoryId },
    categories,
    subCategoriesOfCategory,
  );
  const categoryDropped = !!suggestion.categoryId && !normalizedCategory.categoryId;
  const accountValid = !!suggestion.accountId && accounts.some((a) => a.id === suggestion.accountId);

  if (!normalizedCategory.categoryId && !accountValid) {
    // 추천으로 쓸 만한 값이 하나도 안 남았으면 힌트 문구도 같이 지운다.
    return { basis: categoryDropped ? "none" : suggestion.basis };
  }

  return {
    categoryId: normalizedCategory.categoryId || undefined,
    subCategoryId: normalizedCategory.subCategoryId || undefined,
    accountId: accountValid ? suggestion.accountId : undefined,
    basis: suggestion.basis,
    // 대분류 추천이 버려졌는데 그 근거를 설명하는 힌트를 남겨두면 사용자가 헷갈리므로 함께 지운다.
    hint: categoryDropped ? undefined : suggestion.hint,
  };
}
