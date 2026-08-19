type TransactionType = "EXPENSE" | "INCOME";

interface TransactionCategory {
  id: string;
  name: string;
  code: string;
}

interface TransactionSubcategory {
  id: string;
  name: string;
}

interface TransactionAccount {
  id: string;
  name: string;
  type: string;
}

interface TransferDetailInfo {
  linkedTransactionId: string;
  fromAccount: TransactionAccount;
  toAccount: TransactionAccount;
  fromTransactionId: string;
  toTransactionId: string;
}

interface Transaction {
  id: string;
  date: string;
  amount: number;
  type: TransactionType;
  category: TransactionCategory;
  subcategory: TransactionSubcategory;
  description: string;
  sortOrder: number;
  account: TransactionAccount;
  transferDetail?: TransferDetailInfo;
  runningTotalBalance?: number;
  runningAccountBalance?: number;
  runningLinkedAccountBalance?: number;
}

interface FetchTransactionsParams {
  categoryIds?: string[];
  categoryCodes?: string[];
  accountId?: string;
  keyword?: string;
  startDate?: string;
  endDate?: string;
  cursorDate?: string;
  cursorSortOrder?: number;
  sortDirection?: "ASC" | "DESC";
  size?: number;
}

interface TransactionsPage {
  content: Transaction[];
  hasNext: boolean;
  nextCursorDate: string | null;
  nextCursorSortOrder: number | null;
}

interface DraftTransaction {
  id: string;
  date: string;
  amount: number;
  type: TransactionType;
  category: TransactionCategory | null;
  subcategory: TransactionSubcategory | null;
  description: string;
  sortOrder: number;
  account: TransactionAccount | null;
}

interface ApiResponse<T> {
  statusCode: number;
  message: string;
  data: T;
}

/**
 * 모바일 검색·필터 결과의 조회 범위(DECISION_013, IMPLEMENTATION_BRIEF_012 §3).
 * 일반 장부의 `viewMode`(일/주/월/사용자 지정)와는 별개의 상태다 — 검색·필터를 적용할 때만
 * 쓰이고, 검색·필터 종료 시 일반 장부 상태로 되돌아간다.
 */
type SearchRange =
  | { mode: "all" }
  | { mode: "current"; startDate: string; endDate: string; label: string }
  | { mode: "custom"; startDate: string; endDate: string };
