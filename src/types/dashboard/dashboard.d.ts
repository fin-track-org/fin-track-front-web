/* ---------------------------------------- */
/* Summary 요약 정보 api 타입 */
interface DashboardSummary {
  month: string;
  income: number;
  expense: number;
  balance: number;
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
