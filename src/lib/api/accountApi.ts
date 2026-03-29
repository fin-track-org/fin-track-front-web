import { createClient } from "@/src/lib/supabase/client";
import { AuthError } from "./authError";

const SPRING_BOOT_URL = process.env.NEXT_PUBLIC_SPRING_BOOT_URL!;

export async function getAccounts(): Promise<Account[]> {
  const supabase = createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new AuthError();
  }

  const res = await fetch(`${SPRING_BOOT_URL}/api/v1/accounts`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    let msg = "결제수단 목록 조회 실패";
    try {
      const errJson = await res.json();
      msg = errJson?.message || msg;
    } catch {
      // ignore
    }
    throw new Error(msg);
  }

  const json: ApiResponse<Account[]> = await res.json();
  return json.data ?? [];
}
