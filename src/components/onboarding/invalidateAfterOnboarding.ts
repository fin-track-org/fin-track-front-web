import { QueryClient } from "@tanstack/react-query";
import { USER_SETTING_QUERY_KEY } from "@/src/hook/useUserSettings";

/**
 * 온보딩 중 만든 데이터(모드, 결제수단, 첫 draft)가 홈 진입 즉시 반영되도록
 * 관련 쿼리를 한 번에 무효화한다. 완료 화면 CTA와 전체 건너뛰기 양쪽에서 재사용한다.
 */
export function invalidateAfterOnboarding(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: USER_SETTING_QUERY_KEY });
  queryClient.invalidateQueries({ queryKey: ["accounts"] });
  queryClient.invalidateQueries({ queryKey: ["dashboardSummary"] });
  queryClient.invalidateQueries({ queryKey: ["dashboardBalances"] });
  queryClient.invalidateQueries({ queryKey: ["dashboardDaily"] });
  queryClient.invalidateQueries({ queryKey: ["dashboardExpenseCategory"] });
  queryClient.invalidateQueries({ queryKey: ["dashboardExpenseAccount"] });
  queryClient.invalidateQueries({ queryKey: ["drafts"] });
  queryClient.invalidateQueries({ queryKey: ["recentTransactions"] });
}
