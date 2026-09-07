"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchTransactions } from "@/src/lib/api/transaction/transactions";
import { getRecentTransactions } from "@/src/lib/api/dashboard/recent";
import {
  buildCategorySuggestion,
  sanitizeSuggestion,
  type CategoryLike,
  type CategorySuggestion,
} from "@/src/lib/categorySuggestion";

/**
 * "나중에 분류" 화면에서 카테고리/결제수단 추천을 계산하는 훅.
 * 신규 백엔드 엔드포인트 없이, 기존 거래 검색(GET /transactions?keyword=)과
 * 최근 거래 조회(GET /dashboard/transactions/recent) 결과만 사용한다.
 *
 * `categories`/`accounts`를 넘기면 추천된 id가 현재 화면에 실제로 선택 가능하고
 * (존재 + 같은 거래 유형 + 시스템 카테고리 아님) 검증한다(DESIGN_QA_01.md P1-2, DESIGN_QA_02.md P1-2R).
 */
export function useCategorySuggestion(
  description: string,
  type: TransactionType,
  enabled: boolean,
  categories: CategoryLike[] = [],
  accounts: Array<{ id: string }> = [],
): { suggestion: CategorySuggestion; isLoading: boolean } {
  const trimmedMemo = description.trim();

  const { data: memoMatches = [], isLoading: isMemoLoading } = useQuery({
    queryKey: ["categorySuggestionMemoMatch", trimmedMemo],
    queryFn: () =>
      fetchTransactions({ keyword: trimmedMemo, size: 5, sortDirection: "DESC" }).then(
        (page) => page.content,
      ),
    enabled: enabled && trimmedMemo.length > 0,
    staleTime: 1000 * 60,
  });

  const { data: recentTransactions = [], isLoading: isRecentLoading } = useQuery({
    queryKey: ["recentTransactions", 30],
    queryFn: () => getRecentTransactions(30),
    enabled,
    staleTime: 1000 * 60,
  });

  const rawSuggestion = buildCategorySuggestion({
    description: trimmedMemo,
    type,
    memoMatches: trimmedMemo ? memoMatches : [],
    recentTransactions,
  });

  // IMPLEMENTATION_BRIEF_021 §4.4 — buildCategorySuggestion·sanitizeSuggestion는 매 렌더
  // 새 객체를 반환한다. 내용이 같은데도 참조만 달라지면 호출부(AddTransactionModal의 추천
  // 적용 effect)가 매번 재평가된다. primitive 필드를 dependency로 써서, 실제 추천 값이
  // 바뀌었을 때만 새 참조를 만든다.
  const suggestion = useMemo(
    () => sanitizeSuggestion(rawSuggestion, type, categories, accounts),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      rawSuggestion.categoryId,
      rawSuggestion.subCategoryId,
      rawSuggestion.accountId,
      rawSuggestion.basis,
      rawSuggestion.hint,
      type,
      categories,
      accounts,
    ],
  );

  return {
    suggestion,
    isLoading: enabled && (isMemoLoading || isRecentLoading),
  };
}
