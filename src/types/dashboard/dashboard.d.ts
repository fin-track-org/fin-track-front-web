/* ---------------------------------------- */
/* Summary 요약 정보 api 타입 */
interface DashboardSummary {
  month: string;
  income: number;
  incomeChangeRate: number;
  expense: number;
  expenseChangeRate: number;
  balance: number;
  balanceChangeRate: number;
}

interface DashboardSummaryApiResponse {
  statusCode: number;
  message: string;
  data: DashboardSummary;
}
/* ---------------------------------------- */
/* 자산 변화 차트 정보 api 타입 */
interface DashboardDaily {
  date: string;
  income: number;
  expense: number;
  balance: number;
}

interface DashboardDailyApiResponse {
  statusCode: number;
  message: string;
  data: DashboardDaily[];
}
/* ---------------------------------------- */
/* 카테고리별 지출 파이 차트 정보 api 타입 */
interface DashboardExpenseCategory {
  category: string;
  amount: number;
  percentage: number;
}

interface DashboardExpenseCategoryApiResponse {
  statusCode: number;
  message: string;
  data: DashboardExpenseCategory[];
}
/* ---------------------------------------- */
/* 결제수단별 지출 파이 차트 정보 api 타입 */
interface DashboardExpenseAccount {
  account: string;
  amount: number;
  percentage: number;
}

interface DashboardExpenseAccountApiResponse {
  statusCode: number;
  message: string;
  data: DashboardExpenseAccount[];
}
/* ---------------------------------------- */
/* 최근 거래 내역 api 타입 */
interface RecentTransaction {
  id: string;
  date: string;
  type: "EXPENSE" | "INCOME";
  categoryName: string;
  subcategoryName: string;
  description: string;
  amount: number;
}
interface RecentTransactionResponse {
  statusCode: number;
  message: string;
  data: RecentTransaction[];
}
/* ---------------------------------------- */
/* 결제수단별 잔액 api 타입 */
interface AccountBalance {
  accountId: string;
  accountName: string;
  accountType: string;
  balance: number;
}

interface PaymentMethodBalance {
  accountId: string;
  paymentMethodName: string;
  balance: number;
}

interface DashboardBalanceApiResponse {
  statusCode: number;
  message: string;
  data: {
    totalBalance: number;
    accounts: AccountBalance[];
  };
}
/* ---------------------------------------- */
