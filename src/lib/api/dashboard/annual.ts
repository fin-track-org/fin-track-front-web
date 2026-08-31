import { createClient } from "@/src/lib/supabase/client";
import { AuthError } from "../authError";

const SPRING_BOOT_URL = process.env.NEXT_PUBLIC_SPRING_BOOT_URL!;

/**
 * 연간 통계 조회 (IMPLEMENTATION_BRIEF_019 §10). 월 API를 12번 호출해 조립하지 않고,
 * `ftapi`의 단일 endpoint(`GET /dashboard/annual?year=`)를 그대로 호출한다.
 */
export const getDashboardAnnual = async (year: number): Promise<DashboardAnnual> => {
  const supabase = createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new AuthError();
  }

  const response = await fetch(`${SPRING_BOOT_URL}/api/v1/dashboard/annual?year=${year}`, {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (response.status === 401) {
    throw new AuthError();
  }

  if (!response.ok) {
    throw new Error("연간 통계를 불러오는데 실패했습니다.");
  }

  const result: DashboardAnnualApiResponse = await response.json();
  return result.data;
};
