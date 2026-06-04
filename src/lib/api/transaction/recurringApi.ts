import { createClient } from "@/src/lib/supabase/client";
import { AuthError } from "@/src/lib/api/authError";
import { RecurringTransactionPayload, RecurringTransactionRes } from "@/src/types/recurringTransaction";

const SPRING_BOOT_URL = process.env.NEXT_PUBLIC_SPRING_BOOT_URL!;

export const createRecurringTransaction = async (
  payload: RecurringTransactionPayload,
): Promise<void> => {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  
  if (!session) throw new AuthError();

  const response = await fetch(`${SPRING_BOOT_URL}/api/v1/transactions/recurring`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(payload),
  });

  if (response.status === 401) throw new AuthError();
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "반복 거래 저장에 실패했습니다.");
  }
};

export const getRecurringTransactions = async (): Promise<RecurringTransactionRes[]> => {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  
  if (!session) throw new AuthError();

  const response = await fetch(`${SPRING_BOOT_URL}/api/v1/transactions/recurring`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (response.status === 401) throw new AuthError();
  if (!response.ok) {
    throw new Error("반복 거래 목록을 불러오는데 실패했습니다.");
  }

  const result = await response.json();
  return result.data ?? [];
};

export const updateRecurringTransaction = async (
  id: string,
  payload: RecurringTransactionPayload,
): Promise<void> => {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  
  if (!session) throw new AuthError();

  const response = await fetch(`${SPRING_BOOT_URL}/api/v1/transactions/recurring/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(payload),
  });

  if (response.status === 401) throw new AuthError();
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "반복 거래 수정에 실패했습니다.");
  }
};

export const deleteRecurringTransaction = async (id: string): Promise<void> => {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  
  if (!session) throw new AuthError();

  const response = await fetch(`${SPRING_BOOT_URL}/api/v1/transactions/recurring/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (response.status === 401) throw new AuthError();
  if (!response.ok) {
    throw new Error("반복 거래 삭제에 실패했습니다.");
  }
};
