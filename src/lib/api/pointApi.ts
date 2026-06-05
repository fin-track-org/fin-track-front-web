import { createClient } from "@/src/lib/supabase/client";
import { AuthError } from "@/src/lib/api/authError";

const SPRING_BOOT_URL = process.env.NEXT_PUBLIC_SPRING_BOOT_URL!;

// TODO(REMOVE_LATER): 테스트용 포인트 API 연동 (나중에 삭제 예정)
export const earnTestPoints = async (amount: number = 100): Promise<string> => {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new AuthError();

  const response = await fetch(`${SPRING_BOOT_URL}/api/v1/points/test/earn?amount=${amount}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${session.access_token}` },
  });

  if (!response.ok) throw new Error("포인트 적립에 실패했습니다.");
  return response.text();
};

export const useTestPoints = async (amount: number = 50): Promise<string> => {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new AuthError();

  const response = await fetch(`${SPRING_BOOT_URL}/api/v1/points/test/use?amount=${amount}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${session.access_token}` },
  });

  if (!response.ok) throw new Error("포인트 차감에 실패했습니다. (잔액 부족 등)");
  return response.text();
};
