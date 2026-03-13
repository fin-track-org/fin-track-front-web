import { createClient } from "@/src/lib/supabase/client";
import { AuthError } from "@/src/lib/api/authError";

const SPRING_BOOT_URL = process.env.NEXT_PUBLIC_SPRING_BOOT_URL!;

export const getRecentTransactions = async (
  limit: number = 10,
): Promise<RecentTransaction[]> => {
  const supabase = createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new AuthError();
  }

  const response = await fetch(
    `${SPRING_BOOT_URL}/api/v1/dashboard/transactions/recent?limit=${limit}`,
    { headers: { Authorization: `Bearer ${session.access_token}` } },
  );

  if (response.status === 401) {
    throw new AuthError();
  }

  if (!response.ok) {
    throw new Error("최근 거래 내역을 불러오는데 실패했습니다.");
  }

  const result: RecentTransactionResponse = await response.json();

  return result.data ?? [];
};
