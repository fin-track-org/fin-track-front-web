/* ---------------------------------------- */
/* 연간 통계 api 타입 (IMPLEMENTATION_BRIEF_019 §10, ftapi DashboardAnnualRes와 1:1 대응) */
interface DashboardAnnualMonth {
  /** "yyyy-MM" */
  month: string;
  income: number;
  expense: number;
  savingsIncome: number;
  savingsExpense: number;
  livingBalance: number;
  totalChange: number;
  /** 이 달에 (임시 저장 제외) 거래가 하나라도 있었는지. throughMonth보다 뒤의 월은 항상 false. */
  hasTransactions: boolean;
}

interface DashboardAnnualCategory {
  category: string;
  amount: number;
  percentage: number;
}

interface DashboardAnnual {
  year: number;
  /** 실제 데이터를 조회한 마지막 월. 올해면 현재 월, 과거 연도면 12. */
  throughMonth: number;
  /** 항상 1~12월 12개 원소. */
  months: DashboardAnnualMonth[];
  categories: DashboardAnnualCategory[];
}

interface DashboardAnnualApiResponse {
  statusCode: number;
  message: string;
  data: DashboardAnnual;
}
/* ---------------------------------------- */
