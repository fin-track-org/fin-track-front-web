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
