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
/* 최근 거래 내역 api 타입 */
interface RecentTransaction {
  id: string;
  date: string;
  type: "EXPENSE" | "INCOME";
  category: string;
  description: string;
  amount: number;
}
interface RecentTransactionResponse {
  statusCode: number;
  message: string;
  data: RecentTransaction[];
}
/* ---------------------------------------- */
