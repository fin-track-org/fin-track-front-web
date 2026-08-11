"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchTransactions } from "@/src/lib/api/transaction/transactions";
import { getRecentTransactions } from "@/src/lib/api/dashboard/recent";
import { buildCategorySuggestion, CategorySuggestion } from "@/src/lib/categorySuggestion";

/**
 * "나중에 분류" 화면에서 카테고리/결제수단 추천을 계산하는 훅.
 * 신규 백엔드 엔드포인트 없이, 기존 거래 검색(GET /transactions?keyword=)과
 * 최근 거래 조회(GET /dashboard/transactions/recent) 결과만 사용한다.
 */
export function useCategorySuggestion(
  description: string,
  type: TransactionType,
  enabled: boolean,
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

  const suggestion = buildCategorySuggestion({
    description: trimmedMemo,
    type,
    memoMatches: trimmedMemo ? memoMatches : [],
    recentTransactions,
  });

  return {
    suggestion,
    isLoading: enabled && (isMemoLoading || isRecentLoading),
  };
}
