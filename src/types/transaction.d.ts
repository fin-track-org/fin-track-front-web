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
}

interface FetchTransactionsParams {
  categoryIds?: string[];
  keyword?: string;
  cursorDate?: string;
  cursorSortOrder?: number;
  size?: number;
}

interface TransactionsPage {
  content: Transaction[];
  hasNext: boolean;
  nextCursorDate: string | null;
  nextCursorSortOrder: number | null;
}

interface ApiResponse<T> {
  statusCode: number;
  message: string;
  data: T;
}
