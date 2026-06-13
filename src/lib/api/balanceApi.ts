import { createClient } from "@/src/lib/supabase/client";

const SPRING_BOOT_URL = process.env.NEXT_PUBLIC_SPRING_BOOT_URL;

export interface AccountBalanceDto {
  accountId: string;
  amount: number;
}

export interface BalanceRes {
  totalAmount: number;
  accounts: AccountBalanceDto[];
}

/**
 * 기초 잔액 조회
 * @param date YYYY-MM-DD
 * @param accountId (선택) 계좌 ID
 */
export async function getOpeningBalance(date: string, accountId?: string): Promise<BalanceRes> {
  const supabase = createClient();
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;

  if (!token) {
    throw new Error("No access token found");
  }

  const query = new URLSearchParams();
  query.append("date", date);
  if (accountId && accountId !== "ALL") {
    query.append("accountId", accountId);
  }

  const url = `${SPRING_BOOT_URL}/api/v1/balances/opening?${query.toString()}`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch opening balance");
  }

  const json = await response.json();
  return json.data;
}

/**
 * 기말 잔액 조회
 * @param date YYYY-MM-DD
 * @param accountId (선택) 계좌 ID
 */
export async function getClosingBalance(date: string, accountId?: string): Promise<BalanceRes> {
  const supabase = createClient();
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;

  if (!token) {
    throw new Error("No access token found");
  }

  const query = new URLSearchParams();
  query.append("date", date);
  if (accountId && accountId !== "ALL") {
    query.append("accountId", accountId);
  }

  const url = `${SPRING_BOOT_URL}/api/v1/balances/closing?${query.toString()}`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch closing balance");
  }

  const json = await response.json();
  return json.data;
}
