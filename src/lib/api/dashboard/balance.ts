import { createClient } from "@/src/lib/supabase/client";
import { AuthError } from "../authError";

const SPRING_BOOT_URL = process.env.NEXT_PUBLIC_SPRING_BOOT_URL!;

/* 결제수단별 잔액 조회 api */
export const getDashboardBalances = async (): Promise<{
  totalBalance: number;
  paymentMethods: PaymentMethodBalance[];
}> => {
  const supabase = createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new AuthError();
  }

  const response = await fetch(
    `${SPRING_BOOT_URL}/api/v1/dashboard/balances`,
    {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    },
  );

  if (response.status === 401) {
    throw new AuthError();
  }

  if (!response.ok) {
    throw new Error("결제수단별 잔액을 불러오는데 실패했습니다.");
  }

  const result: DashboardBalanceApiResponse = await response.json();
  
  // accounts를 paymentMethods 형태로 변환
  const paymentMethods: PaymentMethodBalance[] = result.data.accounts.map(
    (account) => ({
      accountId: account.accountId,
      paymentMethodName: account.accountName,
      type: account.accountType,
      balance: account.balance,
    })
  );

  return {
    totalBalance: result.data.totalBalance,
    paymentMethods,
  };
};
