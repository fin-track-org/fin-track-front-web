"use client";

import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/src/lib/supabase/client";
import { createTransfer } from "@/src/lib/api/transaction/transactions";
import { rememberCategoryChoice } from "@/src/lib/categorySuggestion";
import { getTransferAccountIds } from "@/src/lib/transactionEntry";

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

  /**
   * 임시 거래를 정식 거래로 확정한다 (draft=false). 이체/저축 전환도 지원한다.
   *
   * ⚠️ 이체/저축 전환은 "데이터 유실 방지용 임시 완화책"이며 원자성 문제를 해결한 것이 **아니다**
   * (DESIGN_QA_02.md §3). "먼저 만들고 나중에 지운다" 순서로 유실은 막았지만(DESIGN_QA_01.md P1-3),
   * 삭제만 실패하면 이체는 이미 등록된 채 draft가 하나 더 남고, 사용자가 그 draft를 다시 확정하면
   * **같은 이체가 중복 생성될 수 있는 알려진 위험**이 남아 있다. 근본 해결에는 백엔드의
   * draft→거래 원자 변환 API(행 잠금 + 멱등 처리 + DB unique constraint)가 필요하며,
   * 설계는 `BACKEND_ATOMIC_DRAFT_CONVERSION_SPEC.md`에 정리해 두었다(아직 미구현).
   */
  async function confirmDraft(
    draftId: string,
    payload: CreateTransactionPayload,
  ): Promise<{ warning?: string }> {
    const authHeader = await getAuthHeader();
    const isTransferLike = payload.type === "TRANSFER" || payload.isSavings;

    if (isTransferLike) {
      const { fromAccountId, toAccountId } = getTransferAccountIds(payload);

      // 1) 이체/저축 쌍 거래를 먼저 만든다. 여기서 실패하면 draft는 그대로 남아 있으므로 안전하다.
      await createTransfer({
        fromAccountId,
        toAccountId,
        amount: payload.amount,
        date: payload.date,
        description: payload.description || "",
        isSavings: payload.isSavings || false,
      });

      // 2) 원래 있던 임시 행을 정리한다. 여기서 실패해도 이체는 이미 등록된 상태이므로
      //    예외를 던지지 않고 경고만 반환한다(중복 정리 안내, 데이터 유실 아님).
      const deleteRes = await fetch(`${SPRING_BOOT_URL}/api/v1/transactions/${draftId}`, {
        method: "DELETE",
        headers: authHeader,
      }).catch(() => null);

      if (!deleteRes || !deleteRes.ok) {
        return {
          warning:
            "이체는 등록됐지만, 원래 있던 임시 내역이 '나중에 분류' 목록에 하나 더 남아 있어요. 확인 후 삭제해 주세요.",
        };
      }
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

    // 이체/저축(payload.type이 "TRANSFER"이거나 카테고리가 없는 케이스)은 기억할 대상이 아니다.
    if (payload.categoryId && payload.type !== "TRANSFER") {
      rememberCategoryChoice(payload.description ?? "", payload.type, {
        categoryId: payload.categoryId,
        subCategoryId: payload.subCategoryId || undefined,
        accountId: payload.accountId || undefined,
      });
    }

    return {};
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

  /**
   * 분류 성공마다 즉시 갱신해야 하는 가벼운 쿼리들.
   * (draft 개수·목록은 저장 직후 바로 일치해야 하므로 항목마다 호출한다)
   */
  function invalidateItemLevel() {
    queryClient.invalidateQueries({ queryKey: ["drafts"] });
    queryClient.invalidateQueries({ queryKey: ["transactions"] });
    queryClient.invalidateQueries({ queryKey: ["recentTransactions"] });
  }

  /**
   * 대시보드/통계 쿼리는 무거우므로 큐 하나가 끝나거나 닫힐 때 한 번만 모아서 갱신한다.
   * (DESIGN_QA_01.md P2-3: 항목마다 대량 invalidate하던 문제 수정)
   */
  function invalidateDashboards() {
    queryClient.invalidateQueries({ queryKey: ["dashboardBalances"] });
    queryClient.invalidateQueries({ queryKey: ["dashboardDaily"] });
    queryClient.invalidateQueries({ queryKey: ["dashboardSummary"] });
    queryClient.invalidateQueries({ queryKey: ["dashboardBudgetUsage"] });
    queryClient.invalidateQueries({ queryKey: ["dashboardExpenseCategory"] });
    queryClient.invalidateQueries({ queryKey: ["dashboardExpenseAccount"] });
    // QA_REVIEW_043 P2-1 — IMPLEMENTATION_BRIEF_019에서 새로 생긴 연간 통계 키
    // (["dashboardAnnual", year], src/hook/useStatisticsData.ts)가 이 목록에 없어서, "나중에
    // 분류" 확정 직후 연간 탭이 이전 통계를 그대로 보여줄 수 있었다.
    queryClient.invalidateQueries({ queryKey: ["dashboardAnnual"] });
  }

  return { confirmDraft, updateDraftInPlace, deleteDraft, invalidateItemLevel, invalidateDashboards };
}
