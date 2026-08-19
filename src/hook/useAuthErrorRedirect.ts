"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthError } from "@/src/lib/api/authError";

/**
 * 책상형 모바일 홈의 물건별 독립 query들은 각자 loading/error를 갖지만
 * (IMPLEMENTATION_BRIEF_010 §13), `AuthError`만은 기존 DashboardPage처럼
 * 예외적으로 `/login`으로 보낸다. 물건마다 같은 3줄을 반복하지 않도록 공용 훅으로 뺐다.
 */
export function useAuthErrorRedirect(error: unknown): void {
  const router = useRouter();

  useEffect(() => {
    if (error instanceof AuthError) {
      router.replace("/login");
    }
  }, [error, router]);
}

export default useAuthErrorRedirect;
