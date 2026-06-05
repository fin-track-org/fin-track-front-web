import { createClient } from "@/src/lib/supabase/client";
import { AuthError } from "@/src/lib/api/authError";

const SPRING_BOOT_URL = process.env.NEXT_PUBLIC_SPRING_BOOT_URL!;

export const getTodayAttendance = async (): Promise<boolean> => {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new AuthError();

  const response = await fetch(`${SPRING_BOOT_URL}/api/v1/attendance/today`, {
    method: "GET",
    headers: { Authorization: `Bearer ${session.access_token}` },
  });

  if (!response.ok) throw new Error("출석 상태를 불러오는데 실패했습니다.");
  
  const result = await response.json();
  return result.hasChecked;
};

export const doAttendance = async (): Promise<string> => {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new AuthError();

  const response = await fetch(`${SPRING_BOOT_URL}/api/v1/attendance`, {
    method: "POST",
    headers: { Authorization: `Bearer ${session.access_token}` },
  });

  if (!response.ok) {
    if (response.status === 409 || response.status === 400) {
      throw new Error("이미 출석체크를 완료했습니다.");
    }
    throw new Error("출석체크 처리에 실패했습니다.");
  }
  
  const result = await response.json();
  return result.message;
};
