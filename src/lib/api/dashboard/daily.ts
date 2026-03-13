import { createClient } from "@/src/lib/supabase/client";
import { AuthError } from "../authError";

const SPRING_BOOT_URL = process.env.NEXT_PUBLIC_SPRING_BOOT_URL!;

/* 해당 연월의 날짜별 수입·지출·누적잔액을 반환 api (자산 변화 차트용) */
export const getDashboardDaily = async (
  month: string,
): Promise<DashboardDaily[]> => {
  const supabase = createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new AuthError();
  }

  const response = await fetch(
    `${SPRING_BOOT_URL}/api/v1/dashboard/daily?month=${month}`,
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
    throw new Error("일별 자산 데이터를 불러오는데 실패했습니다.");
  }

  const result: DashboardDailyApiResponse = await response.json();

  return result.data ?? [];
};
