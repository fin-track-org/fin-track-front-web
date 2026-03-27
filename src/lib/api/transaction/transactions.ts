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

  if (params.keyword?.trim()) {
    searchParams.set("keyword", params.keyword.trim());
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

/* 수정 */

/* 삭제 */
