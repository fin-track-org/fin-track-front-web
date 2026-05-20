import { createClient } from "@/src/lib/supabase/client";
import { AuthError } from "@/src/lib/api/authError";

const SPRING_BOOT_URL = process.env.NEXT_PUBLIC_SPRING_BOOT_URL!;

export const fetchTransactions = async (
  params: FetchTransactionsParams = {},
): Promise<TransactionsPage> => {
  const supabase = createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new AuthError();
  }

  const searchParams = new URLSearchParams();

  if (params.categoryIds?.length) {
    params.categoryIds.forEach((id) => searchParams.append("categoryIds", id));
  }

  if (params.accountId) {
    searchParams.set("accountId", params.accountId);
  }

  if (params.keyword?.trim()) {
    searchParams.set("keyword", params.keyword.trim());
  }

  if (params.startDate) {
    searchParams.set("startDate", params.startDate);
  }

  if (params.endDate) {
    searchParams.set("endDate", params.endDate);
  }

  if (params.cursorDate) {
    searchParams.set("cursorDate", params.cursorDate);
  }

  if (params.cursorSortOrder !== undefined) {
    searchParams.set("cursorSortOrder", String(params.cursorSortOrder));
  }

  searchParams.set("size", String(params.size ?? 20));

  const url = `${SPRING_BOOT_URL}/api/v1/transactions${
    searchParams.toString() ? `?${searchParams.toString()}` : ""
  }`;

  const response = await fetch(url, {
    method: "GET",
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

  const result: ApiResponse<TransactionsPage> = await response.json();

  return {
    content: result.data?.content ?? [],
    hasNext: result.data?.hasNext ?? false,
    nextCursorDate: result.data?.nextCursorDate ?? null,
    nextCursorSortOrder: result.data?.nextCursorSortOrder ?? null,
  };
};

/* 추가 */

export const getDrafts = async (): Promise<DraftTransaction[]> => {
  const supabase = createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new AuthError();
  }

  const response = await fetch(`${SPRING_BOOT_URL}/api/v1/transactions/drafts`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (response.status === 401) {
    throw new AuthError();
  }

  if (!response.ok) {
    throw new Error("임시 보관함을 불러오는데 실패했습니다.");
  }

  const result: ApiResponse<DraftTransaction[]> = await response.json();
  return result.data ?? [];
};

/* 빠른 추가 */
export const quickAddTransaction = async (payload: {
  date: string;
  amount: number;
  description: string;
}): Promise<void> => {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new AuthError();

  const response = await fetch(`${SPRING_BOOT_URL}/api/v1/transactions/quick`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(payload),
  });

  if (response.status === 401) throw new AuthError();
  if (!response.ok) throw new Error("빠른 추가에 실패했습니다.");
};

/* 순서 변경 */
export const reorderTransactions = async (
  transactionIds: string[],
): Promise<void> => {
  const supabase = createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) throw new AuthError();

  const response = await fetch(
    `${SPRING_BOOT_URL}/api/v1/transactions/reorder`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        items: transactionIds.map((id, index) => ({
          transactionId: id,
          sortOrder: transactionIds.length - index,
        })),
      }),
    },
  );

  if (response.status === 401) throw new AuthError();
  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(`순서 변경에 실패했습니다. (${response.status}) ${errText}`);
  }
};

/* 수정 */

/* 삭제 */
