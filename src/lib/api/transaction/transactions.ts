import { createClient } from "@/src/lib/supabase/client";
import { AuthError } from "@/src/lib/api/authError";

const SPRING_BOOT_URL = process.env.NEXT_PUBLIC_SPRING_BOOT_URL!;

export const fetchTransactions = async (): Promise<Transaction[]> => {
  const supabase = createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new AuthError();
  }

  const response = await fetch(`${SPRING_BOOT_URL}/api/v1/transactions`, {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (response.status === 401) {
    throw new AuthError();
  }

  if (!response.ok) {
    throw new Error("데이터를 불러오는데 실패했습니다.");
  }

  const result = await response.json();
  return result.data ?? [];
};
