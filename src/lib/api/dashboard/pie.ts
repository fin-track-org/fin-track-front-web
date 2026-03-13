import { createClient } from "@/src/lib/supabase/client";
import { AuthError } from "../authError";

const SPRING_BOOT_URL = process.env.NEXT_PUBLIC_SPRING_BOOT_URL!;

export const getDashboardExpenseCategory = async (
  month: string,
): Promise<DashboardExpenseCategory[]> => {
  const supabase = createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new AuthError();
  }

  const response = await fetch(
    `${SPRING_BOOT_URL}/api/v1/dashboard/expenses/category?month=${month}`,
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
    throw new Error("카테고리별 지출 데이터를 불러오는데 실패했습니다.");
  }

  const result: DashboardExpenseCategoryApiResponse = await response.json();

  return result.data ?? [];
};
