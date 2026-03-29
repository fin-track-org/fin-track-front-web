/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import AddTransactionModal from "@/src/components/AddTransactionModal";
import { createClient } from "@/src/lib/supabase/client";
import { useEffect, useMemo, useRef, useState } from "react";
import LedgerTable from "./table/LedgerTable";
import MonthSelector from "../dashboard/section/MonthSelector";
import { ChevronDown, Search } from "lucide-react";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { getCategories, getSubCategories } from "@/src/lib/api/categoryApi";
import TransactionPageSkeleton from "../../skeleton/TransactionPageSkeleton";
import { fetchTransactions } from "@/src/lib/api/transaction/transactions";
import { getAccounts } from "@/src/lib/api/accountApi";

// .env.local에서 Spring Boot URL을 읽어옵니다.
const SPRING_BOOT_URL = process.env.NEXT_PUBLIC_SPRING_BOOT_URL!;

export default function TransactionPage() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  // 무한 스크롤 로더
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  // 날짜
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // 검색
  const [searchTerm, setSearchTerm] = useState("");

  // 모바일 검색/필터 접기/펼치기 상태
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // 카테고리 필터
  const [selectedType, setSelectedType] = useState<
    "ALL" | "EXPENSE" | "INCOME"
  >("ALL");
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);

  const [isModalOpen, setIsModalOpen] = useState(false);

  // 새 거래용 defaultValues
  const [modalDefaultValues, setModalDefaultValues] = useState<
    Partial<CreateTransactionPayload> | undefined
  >(undefined);

  // 수정할 거래 내역 (null이면 추가 모드)
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);

  const getYearMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`; // 예: 2026-02
  };

  /* ----------------------------------------------------------------------- */
  /* 카테고리 조회 api */
  const {
    data: rawCategories = [],
    isLoading: isCategoriesLoading,
    isError: isCategoriesError,
    error: categoriesError,
  } = useQuery({
    queryKey: ["categories"],
    queryFn: () => getCategories(),
  });

  const filteredCategories = useMemo(() => {
    if (selectedType === "ALL") return rawCategories;
    return rawCategories.filter((c) => c.type === selectedType);
  }, [rawCategories, selectedType]);

  // 전체 선택 시 카테고리를 수입 / 지출 섹션으로 분리해서 렌더링하기 위한 목록
  const incomeCategories = useMemo(() => {
    return rawCategories.filter((c) => c.type === "INCOME");
  }, [rawCategories]);

  // 전체 선택 시 카테고리를 수입 / 지출 섹션으로 분리해서 렌더링하기 위한 목록
  const expenseCategories = useMemo(() => {
    return rawCategories.filter((c) => c.type === "EXPENSE");
  }, [rawCategories]);

  useEffect(() => {
    if (selectedType === "ALL") return;

    setSelectedCategoryIds((prev) =>
      prev.filter((id) => {
        const category = rawCategories.find((c) => c.id === id);
        return category?.type === selectedType;
      }),
    );
  }, [selectedType, rawCategories]);

  const toggleCategory = (categoryId: string) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId],
    );
  };

  // 전체 카테고리 선택 해제 = 전체 보기
  const handleSelectAllCategories = () => {
    setSelectedCategoryIds([]);
  };

  // 수입 카테고리 전체 선택
  const handleSelectAllIncomeCategories = () => {
    setSelectedCategoryIds(incomeCategories.map((c) => c.id));
  };

  // 지출 카테고리 전체 선택
  const handleSelectAllExpenseCategories = () => {
    setSelectedCategoryIds(expenseCategories.map((c) => c.id));
  };

  // 전체 버튼 활성 상태
  const isAllCategoriesSelected = selectedCategoryIds.length === 0;

  // 수입 전체 버튼 활성 상태
  const isAllIncomeCategoriesSelected =
    incomeCategories.length > 0 &&
    incomeCategories.every((c) => selectedCategoryIds.includes(c.id));

  // 지출 전체 버튼 활성 상태
  const isAllExpenseCategoriesSelected =
    expenseCategories.length > 0 &&
    expenseCategories.every((c) => selectedCategoryIds.includes(c.id));
  /* ----------------------------------------------------------------------- */

  /* 세부 항목 (소분류) 조회 */
  const firstCategoryId = rawCategories[0]?.id;

  const { data: fetchedSubCategories = [] } = useQuery({
    queryKey: ["subCategories", firstCategoryId],
    queryFn: () => getSubCategories(firstCategoryId!),
    enabled: !!firstCategoryId,
  });

  /* 결제 수단 조회 api */
  const {
    data: accounts = [],
    isLoading: isAccountsLoading,
    isError: isAccountsError,
    error: accountsError,
  } = useQuery({
    queryKey: ["accounts"],
    queryFn: getAccounts,
  });

  type TransactionCursor = {
    cursorDate: string | null;
    cursorSortOrder: number | null;
  };

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isTransactionsLoading,
    isError: isTransactionsError,
    error: transactionsError,
  } = useInfiniteQuery({
    queryKey: ["transactions", searchTerm, selectedCategoryIds],
    initialPageParam: {
      cursorDate: null,
      cursorSortOrder: null,
    } as TransactionCursor,
    queryFn: ({ pageParam }: { pageParam: TransactionCursor }) =>
      fetchTransactions({
        keyword: searchTerm.trim() || undefined,
        categoryIds:
          selectedCategoryIds.length > 0 ? selectedCategoryIds : undefined,
        size: 20,
        cursorDate: pageParam.cursorDate ?? undefined,
        cursorSortOrder: pageParam.cursorSortOrder ?? undefined,
      }),
    getNextPageParam: (lastPage): TransactionCursor | undefined => {
      if (!lastPage.hasNext) return undefined;

      return {
        cursorDate: lastPage.nextCursorDate,
        cursorSortOrder: lastPage.nextCursorSortOrder,
      };
    },
  });

  // LedgerTable에 넘길 실제 거래 배열 추출
  const transactions = data?.pages.flatMap((page) => page.content) ?? [];

  /* 무한 스크롤 */
  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (
          first.isIntersecting &&
          hasNextPage &&
          !isFetchingNextPage &&
          !isTransactionsLoading
        ) {
          fetchNextPage();
        }
      },
      {
        root: null,
        rootMargin: "200px",
        threshold: 0,
      },
    );

    observer.observe(target);

    return () => {
      observer.disconnect();
    };
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, isTransactionsLoading]);

  // ------------------- 삭제 -----------------------
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) throw new Error("로그인이 필요합니다.");

      const res = await fetch(`${SPRING_BOOT_URL}/api/v1/transactions/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!res.ok) throw new Error("삭제 실패");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });

  const handleDelete = (id: string) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    deleteMutation.mutate(id);
  };
  // -------------------------------------------------

  // 수정 버튼 클릭
  const handleEdit = (t: Transaction) => {
    setEditingTransaction(t);

    setModalDefaultValues({
      date: t.date,
      type: t.type,
      amount: t.amount,
      categoryId: t.category.id,
      subCategoryId: t.subcategory?.id ?? "",
      accountId: t.account.id ?? "",
      description: t.description,
    });

    setIsModalOpen(true);
  };

  // 모달 닫기(새 props 방식)
  const handleOpenChange = (open: boolean) => {
    setIsModalOpen(open);
    if (!open) {
      setEditingTransaction(null);
      setModalDefaultValues(undefined);
    }
  };

  /* 저장(추가/수정) */
  const handleSubmitTransaction = async (
    payload: CreateTransactionPayload,
  ): Promise<void> => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) throw new Error("로그인이 필요합니다.");

    // 수정 모드면 PUT, 아니면 POST
    const isEditing = Boolean(editingTransaction?.id);
    const apiUrl = isEditing
      ? `${SPRING_BOOT_URL}/api/v1/transactions/${editingTransaction!.id}`
      : `${SPRING_BOOT_URL}/api/v1/transactions`;

    const method = isEditing ? "PUT" : "POST";

    // 나머지 필드는 API 확장 후 함께 보낼 예정
    const bodyForNow = {
      date: payload.date,
      amount: payload.amount,
      type: payload.type,
      categoryId: payload.categoryId,
      subCategoryId: payload.subCategoryId,
      description: payload.description ?? "",
      accountId: payload.accountId,
    };

    const res = await fetch(apiUrl, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(bodyForNow),
    });

    if (!res.ok) {
      let msg = "저장 실패";
      try {
        const errJson = await res.json();
        msg = errJson?.message || msg;
      } catch {}
      throw new Error(msg);
    }

    queryClient.invalidateQueries({ queryKey: ["transactions"] });
    // 모달 닫기 + 수정 해제
    setIsModalOpen(false);
    setEditingTransaction(null);
  };

  /* 이전/다음 달 */
  const handlePreviousMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1),
    );
  };

  const handleNextMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1),
    );
  };

  const isPageLoading = isTransactionsLoading || isCategoriesLoading;
  const pageError =
    (isTransactionsError && (transactionsError as Error)) ||
    (isCategoriesError && (categoriesError as Error)) ||
    null;

  const isInitialLoading =
    isCategoriesLoading &&
    isTransactionsLoading &&
    rawCategories.length === 0 &&
    transactions.length === 0;

  if (isInitialLoading) {
    return <TransactionPageSkeleton />;
  }

  return (
    <>
      <section className="space-y-4 md:space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-center">
          <MonthSelector
            currentMonth={currentMonth}
            onPrev={handlePreviousMonth}
            onNext={handleNextMonth}
          />
          <button
            onClick={() => {
              setEditingTransaction(null);
              setModalDefaultValues({
                date: new Date().toISOString().split("T")[0],
                type: "EXPENSE",
                categoryId: rawCategories[0].id,
                subCategoryId: fetchedSubCategories[0].id,
                accountId: accounts[0].id,
              });
              setIsModalOpen(true);
            }}
            className="flex-none w-full md:w-auto bg-sky-600 text-white px-5 py-2 rounded-lg font-semibold hover:bg-sky-700 transition-colors text-sm md:text-base shadow-sm"
          >
            + 새 거래 추가
          </button>
        </div>

        {/* 검색/필터 */}
        <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
          {/* 모바일에서만 검색/필터 접기/펼치기 헤더 표시 */}
          <div className="flex items-center justify-between md:hidden">
            <p className="text-sm font-semibold text-gray-900">검색 / 필터</p>

            <button
              type="button"
              onClick={() => setIsMobileFilterOpen((prev) => !prev)}
              className="inline-flex items-center gap-1 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <ChevronDown
                size={28}
                className={`transition-transform duration-300 ease-in-out ${
                  isMobileFilterOpen ? "rotate-180" : "rotate-0"
                }`}
              />
            </button>
          </div>

          {/* 모바일에서 접혀 있을 때 여백 보정 */}
          <div className="md:hidden" />

          <div
            className={`overflow-hidden transition-all duration-300 ease-in-out md:overflow-visible ${
              isMobileFilterOpen
                ? "max-h-[1000px] opacity-100 mt-4"
                : "max-h-0 opacity-0"
            } md:max-h-none md:opacity-100 md:mt-0`}
          >
            {/* 데스크탑은 항상 보이고, 모바일은 펼쳤을 때만 보이도록 처리 */}
            <div
              className={`flex flex-col gap-3 ${
                isMobileFilterOpen ? "mt-4 md:mt-0" : "hidden md:flex"
              }`}
            >
              {/* 검색 */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="거래 내역 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                />
              </div>
              {/* 데스크탑 */}
              <div className="hidden md:block">
                {/* 전체일 때만 전체 / 수입 전체 / 지출 전체 버튼 노출 */}
                {selectedType === "ALL" ? (
                  <div className="mb-3 flex flex-wrap gap-2">
                    <button
                      onClick={handleSelectAllCategories}
                      className={`px-4 py-2 text-sm rounded-lg font-medium whitespace-nowrap transition-colors ${
                        isAllCategoriesSelected
                          ? "bg-sky-600 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      전체
                    </button>

                    <button
                      onClick={handleSelectAllIncomeCategories}
                      className={`px-4 py-2 text-sm rounded-lg font-medium whitespace-nowrap transition-colors ${
                        isAllIncomeCategoriesSelected
                          ? "bg-emerald-600 text-white"
                          : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                      }`}
                    >
                      수입 전체
                    </button>

                    <button
                      onClick={handleSelectAllExpenseCategories}
                      className={`px-4 py-2 text-sm rounded-lg font-medium whitespace-nowrap transition-colors ${
                        isAllExpenseCategoriesSelected
                          ? "bg-sky-600 text-white"
                          : "bg-sky-50 text-sky-700 hover:bg-sky-100"
                      }`}
                    >
                      지출 전체
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleSelectAllCategories}
                    className={`mb-3 px-4 py-2 text-sm rounded-lg font-medium whitespace-nowrap transition-colors ${
                      isAllCategoriesSelected
                        ? "bg-sky-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    전체
                  </button>
                )}

                {/* 거래 유형이 전체일 때는 수입 / 지출 카테고리를 섹션으로 분리해서 표시 */}
                {selectedType === "ALL" ? (
                  <div className="space-y-4">
                    {/* 수입 카테고리 섹션 */}
                    <div>
                      <p className="mb-2 text-xs font-semibold text-gray-500">
                        수입
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {incomeCategories.map((c) => {
                          const selected = selectedCategoryIds.includes(c.id);

                          return (
                            <button
                              key={c.id}
                              onClick={() => toggleCategory(c.id)}
                              className={`px-4 py-2 text-sm rounded-lg font-medium whitespace-nowrap transition-colors ${
                                selected
                                  ? "bg-emerald-600 text-white"
                                  : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                              }`}
                            >
                              {c.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 지출 카테고리 섹션 */}
                    <div>
                      <p className="mb-2 text-xs font-semibold text-gray-500">
                        지출
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {expenseCategories.map((c) => {
                          const selected = selectedCategoryIds.includes(c.id);

                          return (
                            <button
                              key={c.id}
                              onClick={() => toggleCategory(c.id)}
                              className={`px-4 py-2 text-sm rounded-lg font-medium whitespace-nowrap transition-colors ${
                                selected
                                  ? "bg-sky-600 text-white"
                                  : "bg-sky-50 text-sky-700 hover:bg-sky-100"
                              }`}
                            >
                              {c.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  // 거래 유형이 지출/수입으로 선택된 경우에는 기존처럼 한 그룹으로 표시
                  <div className="flex flex-wrap gap-2">
                    {filteredCategories.map((c) => {
                      const selected = selectedCategoryIds.includes(c.id);

                      return (
                        <button
                          key={c.id}
                          onClick={() => toggleCategory(c.id)}
                          className={`px-4 py-2 text-sm rounded-lg font-medium whitespace-nowrap transition-colors ${
                            selected
                              ? "bg-sky-600 text-white"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          }`}
                        >
                          {c.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 모바일 */}
              <div className="md:hidden">
                {/* 전체일 때만 전체 / 수입 전체 / 지출 전체 버튼 노출 */}
                {selectedType === "ALL" ? (
                  <div className="mb-3 flex flex-wrap gap-2">
                    <button
                      onClick={handleSelectAllCategories}
                      className={`px-4 py-2 text-sm rounded-lg font-medium whitespace-nowrap transition-colors ${
                        isAllCategoriesSelected
                          ? "bg-sky-600 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      전체
                    </button>

                    <button
                      onClick={handleSelectAllIncomeCategories}
                      className={`px-4 py-2 text-sm rounded-lg font-medium whitespace-nowrap transition-colors ${
                        isAllIncomeCategoriesSelected
                          ? "bg-emerald-600 text-white"
                          : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                      }`}
                    >
                      수입 전체
                    </button>

                    <button
                      onClick={handleSelectAllExpenseCategories}
                      className={`px-4 py-2 text-sm rounded-lg font-medium whitespace-nowrap transition-colors ${
                        isAllExpenseCategoriesSelected
                          ? "bg-sky-600 text-white"
                          : "bg-sky-50 text-sky-700 hover:bg-sky-100"
                      }`}
                    >
                      지출 전체
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleSelectAllCategories}
                    className={`mb-3 px-4 py-2 text-sm rounded-lg font-medium whitespace-nowrap transition-colors ${
                      isAllCategoriesSelected
                        ? "bg-sky-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    전체
                  </button>
                )}

                {/* 모바일도 거래 유형이 전체일 때 수입 / 지출 카테고리를 섹션으로 분리 */}
                {selectedType === "ALL" ? (
                  <div className="space-y-4">
                    {/* 모바일 수입 카테고리 섹션 */}
                    <div>
                      <p className="mb-2 text-xs font-semibold text-gray-500">
                        수입
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {incomeCategories.map((c) => {
                          const selected = selectedCategoryIds.includes(c.id);

                          return (
                            <button
                              key={c.id}
                              onClick={() => toggleCategory(c.id)}
                              className={`px-3 py-2 text-sm rounded-lg ${
                                selected
                                  ? "bg-emerald-600 text-white"
                                  : "bg-emerald-50 text-emerald-700"
                              }`}
                            >
                              {c.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 모바일 지출 카테고리 섹션 */}
                    <div>
                      <p className="mb-2 text-xs font-semibold text-gray-500">
                        지출
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {expenseCategories.map((c) => {
                          const selected = selectedCategoryIds.includes(c.id);

                          return (
                            <button
                              key={c.id}
                              onClick={() => toggleCategory(c.id)}
                              className={`px-3 py-2 text-sm rounded-lg ${
                                selected
                                  ? "bg-sky-600 text-white"
                                  : "bg-sky-50 text-sky-700"
                              }`}
                            >
                              {c.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  // 모바일도 거래 유형이 지출/수입으로 선택된 경우에는 기존처럼 한 그룹으로 표시
                  <div className="flex flex-wrap gap-2">
                    {filteredCategories.map((c) => {
                      const selected = selectedCategoryIds.includes(c.id);

                      return (
                        <button
                          key={c.id}
                          onClick={() => toggleCategory(c.id)}
                          className={`px-3 py-2 text-sm rounded-lg ${
                            selected
                              ? "bg-sky-600 text-white"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {c.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <LedgerTable
          transactions={transactions}
          loading={isPageLoading}
          error={pageError?.message ?? null}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />

        <div ref={loadMoreRef} className="h-4" />

        {isFetchingNextPage && (
          <div className="pb-6 text-center text-sm text-gray-500">
            거래 내역 불러오는 중...
          </div>
        )}

        {!hasNextPage && transactions.length > 0 && (
          <div className="pb-6 text-center text-sm text-gray-400">
            모든 거래 내역을 불러왔습니다.
          </div>
        )}
      </section>

      {(isModalOpen || editingTransaction) && (
        <>
          {/* 모달 */}
          <AddTransactionModal
            open={isModalOpen}
            onOpenChange={handleOpenChange}
            categories={rawCategories}
            accounts={accounts}
            onSubmit={handleSubmitTransaction}
            defaultValues={modalDefaultValues}
            mode={editingTransaction ? "edit" : "create"}
          />
        </>
      )}
    </>
  );
}
