import { createClient } from "@/src/lib/supabase/client";
import { AuthError } from "../authError";

const SPRING_BOOT_URL = process.env.NEXT_PUBLIC_SPRING_BOOT_URL!;

/* 예산 대비 사용량 조회 api */
export const getDashboardBudgetUsage = async (
  month: string,
): Promise<BudgetUsageRes[]> => {
  const supabase = createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new AuthError();
  }

  const response = await fetch(
    `${SPRING_BOOT_URL}/api/v1/dashboard/budgets/usage?month=${month}`,
    {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    },
  );

  if (response.status === 401) {
    throw new AuthError();
  }

  if (!response.ok) {
    throw new Error("예산 대비 사용량을 불러오는데 실패했습니다.");
  }

  const result: ApiResponse<BudgetUsageRes[]> = await response.json();
  return result.data ?? [];
};
