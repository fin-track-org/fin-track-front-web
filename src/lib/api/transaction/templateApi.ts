import { createClient } from "@/src/lib/supabase/client";
import { AuthError } from "@/src/lib/api/authError";

const SPRING_BOOT_URL = process.env.NEXT_PUBLIC_SPRING_BOOT_URL!;

export interface TransactionTemplatePayload {
  title: string;
  type: "INCOME" | "EXPENSE" | "TRANSFER";
  amount: number;
  categoryId?: string;
  subcategoryId?: string;
  accountId?: string;
  description?: string | null;
}

export interface TransactionTemplateRes extends TransactionTemplatePayload {
  id: string;
  sortOrder: number;
}

export const createTransactionTemplate = async (
  payload: TransactionTemplatePayload,
): Promise<void> => {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  
  if (!session) throw new AuthError();

  const response = await fetch(`${SPRING_BOOT_URL}/api/v1/transactions/templates`, {
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
    throw new Error(errorData.message || "템플릿 저장에 실패했습니다.");
  }
};

export const getTransactionTemplates = async (): Promise<TransactionTemplateRes[]> => {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  
  if (!session) throw new AuthError();

  const response = await fetch(`${SPRING_BOOT_URL}/api/v1/transactions/templates`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (response.status === 401) throw new AuthError();
  if (!response.ok) {
    throw new Error("템플릿 목록을 불러오는데 실패했습니다.");
  }

  const result = await response.json();
  return result.data ?? [];
};

export const updateTransactionTemplate = async (
  id: string,
  payload: TransactionTemplatePayload,
): Promise<void> => {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  
  if (!session) throw new AuthError();

  const response = await fetch(`${SPRING_BOOT_URL}/api/v1/transactions/templates/${id}`, {
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
    throw new Error(errorData.message || "템플릿 수정에 실패했습니다.");
  }
};

export const deleteTransactionTemplate = async (id: string): Promise<void> => {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  
  if (!session) throw new AuthError();

  const response = await fetch(`${SPRING_BOOT_URL}/api/v1/transactions/templates/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (response.status === 401) throw new AuthError();
  if (!response.ok) {
    throw new Error("템플릿 삭제에 실패했습니다.");
  }
};
