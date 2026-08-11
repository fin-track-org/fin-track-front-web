"use client";

import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/src/lib/supabase/client";
import { createTransfer } from "@/src/lib/api/transaction/transactions";
import { rememberCategoryChoice } from "@/src/lib/categorySuggestion";

const SPRING_BOOT_URL = process.env.NEXT_PUBLIC_SPRING_BOOT_URL!;

/**
 * "나중에 분류"(임시 거래 확정) 저장 로직을 한 곳에 모은 훅.
 *
 * 기존 TransactionPage.handleSubmitTransaction의 confirm-draft 분기와 동일한
 * 규칙(일반 PUT vs 이체/저축 전환 시 삭제 후 재생성)을 그대로 따른다.
 * 기존 API·비즈니스 로직은 변경하지 않고, 홈/내역 양쪽 "나중에 분류" 진입점이
 * 같은 저장 경로를 공유하도록 재사용 가능한 형태로 옮겨둔 것이다.
 */
export function useDraftClassification() {
  const queryClient = useQueryClient();

  async function getAuthHeader() {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) throw new Error("로그인이 필요합니다.");
    return { Authorization: `Bearer ${session.access_token}` };
  }

  /** 임시 거래를 정식 거래로 확정한다 (draft=false). 이체/저축 전환도 지원한다. */
  async function confirmDraft(
    draftId: string,
    payload: CreateTransactionPayload,
  ): Promise<void> {
    const authHeader = await getAuthHeader();
    const isTransferLike = payload.type === "TRANSFER" || payload.isSavings;

    if (isTransferLike) {
      const fromId = payload.type === "INCOME" ? payload.toAccountId! : payload.accountId;
      const toId = payload.type === "INCOME" ? payload.accountId : payload.toAccountId!;

      // 임시 거래는 단일 행이므로, 이체/저축으로 확정할 때는
      // 기존 임시 행을 지우고 출금/입금 쌍 거래를 새로 만든다.
      const deleteRes = await fetch(`${SPRING_BOOT_URL}/api/v1/transactions/${draftId}`, {
        method: "DELETE",
        headers: authHeader,
      });
      if (!deleteRes.ok) throw new Error("임시 내역 정리에 실패했습니다.");

      await createTransfer({
        fromAccountId: fromId,
        toAccountId: toId,
        amount: payload.amount,
        date: payload.date,
        description: payload.description || "",
        isSavings: payload.isSavings || false,
      });
    } else {
      const res = await fetch(`${SPRING_BOOT_URL}/api/v1/transactions/${draftId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({
          date: payload.date,
          amount: payload.amount,
          type: payload.type,
          categoryId: payload.categoryId,
          subcategoryId: payload.subCategoryId ?? null,
          description: payload.description ?? null,
          accountId: payload.accountId ?? null,
          isDraft: false,
        }),
      });

      if (!res.ok) {
        let msg = "분류에 실패했어요.";
        try {
          const errJson = await res.json();
          msg = errJson?.message || msg;
        } catch {
          // ignore parse failure, keep default message
        }
        throw new Error(msg);
      }
    }

    if (payload.categoryId) {
      rememberCategoryChoice(payload.description ?? "", {
        categoryId: payload.categoryId,
        subCategoryId: payload.subCategoryId || undefined,
        accountId: payload.accountId || undefined,
      });
    }
  }

  /** 임시 거래를 임시 상태로 유지한 채 날짜/금액/메모만 수정한다 (draft=true 유지). */
  async function updateDraftInPlace(
    draftId: string,
    payload: Partial<CreateTransactionPayload>,
  ): Promise<void> {
    const authHeader = await getAuthHeader();

    const res = await fetch(`${SPRING_BOOT_URL}/api/v1/transactions/${draftId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...authHeader },
      body: JSON.stringify({
        date: payload.date,
        amount: payload.amount,
        type: payload.type === "INCOME" ? "INCOME" : "EXPENSE",
        categoryId: payload.categoryId ?? null,
        subcategoryId: payload.subCategoryId ?? null,
        accountId: payload.accountId ?? null,
        description: payload.description ?? null,
        isDraft: true,
      }),
    });

    if (!res.ok) {
      let msg = "임시저장에 실패했어요.";
      try {
        const errJson = await res.json();
        msg = errJson?.message || msg;
      } catch {
        // ignore
      }
      throw new Error(msg);
    }
  }

  async function deleteDraft(draftId: string): Promise<void> {
    const authHeader = await getAuthHeader();
    const res = await fetch(`${SPRING_BOOT_URL}/api/v1/transactions/${draftId}`, {
      method: "DELETE",
      headers: authHeader,
    });
    if (!res.ok) throw new Error("삭제에 실패했어요.");
  }

  /** 분류 성공 직후 draft 개수·목록, 관련 홈/내역 쿼리를 정확히 갱신한다. */
  function invalidateAfterClassify() {
    queryClient.invalidateQueries({ queryKey: ["drafts"] });
    queryClient.invalidateQueries({ queryKey: ["transactions"] });
    queryClient.invalidateQueries({ queryKey: ["recentTransactions"] });
    queryClient.invalidateQueries({ queryKey: ["dashboardBalances"] });
    queryClient.invalidateQueries({ queryKey: ["dashboardDaily"] });
    queryClient.invalidateQueries({ queryKey: ["dashboardSummary"] });
    queryClient.invalidateQueries({ queryKey: ["dashboardBudgetUsage"] });
    queryClient.invalidateQueries({ queryKey: ["dashboardExpenseCategory"] });
    queryClient.invalidateQueries({ queryKey: ["dashboardExpenseAccount"] });
  }

  return { confirmDraft, updateDraftInPlace, deleteDraft, invalidateAfterClassify };
}
