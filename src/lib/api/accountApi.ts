import { createClient } from "@/src/lib/supabase/client";
import { AuthError } from "./authError";

const SPRING_BOOT_URL = process.env.NEXT_PUBLIC_SPRING_BOOT_URL!;

async function getToken(): Promise<string> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new AuthError();
  return session.access_token;
}

export async function getAccounts(): Promise<Account[]> {
  const token = await getToken();
  const res = await fetch(`${SPRING_BOOT_URL}/api/v1/accounts`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (res.status === 401) throw new AuthError();
  if (!res.ok) throw new Error("결제수단 목록 조회 실패");
  const json: ApiResponse<Account[]> = await res.json();
  return json.data ?? [];
}

export async function createAccount(body: AccountCreateReq): Promise<Account> {
  const token = await getToken();
  const res = await fetch(`${SPRING_BOOT_URL}/api/v1/accounts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (res.status === 401) throw new AuthError();
  if (!res.ok) throw new Error("결제수단 생성 실패");
  const json: ApiResponse<Account> = await res.json();
  return json.data!;
}

export async function updateAccount(
  accountId: string,
  body: AccountUpdateReq,
): Promise<Account> {
  const token = await getToken();
  const res = await fetch(`${SPRING_BOOT_URL}/api/v1/accounts/${accountId}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (res.status === 401) throw new AuthError();
  if (!res.ok) throw new Error("결제수단 수정 실패");
  const json: ApiResponse<Account> = await res.json();
  return json.data!;
}

export async function deleteAccount(accountId: string): Promise<void> {
  const token = await getToken();
  const res = await fetch(`${SPRING_BOOT_URL}/api/v1/accounts/${accountId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) throw new AuthError();
  if (!res.ok) throw new Error("결제수단 삭제 실패");
}

export async function setDefaultAccount(accountId: string): Promise<Account> {
  const token = await getToken();
  const res = await fetch(
    `${SPRING_BOOT_URL}/api/v1/accounts/${accountId}/default`,
    {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  if (res.status === 401) throw new AuthError();
  if (!res.ok) throw new Error("기본 결제수단 설정 실패");
  const json: ApiResponse<Account> = await res.json();
  return json.data!;
}

