/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import AddTransactionModal from "@/src/components/AddTransactionModal";
import { createClient } from "@/src/lib/supabase/client";
import { useEffect, useMemo, useRef, useState } from "react";
import LedgerTable from "./table/LedgerTable";
import { CalendarDays, ChevronDown, Search, X, Trash2, Settings2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import LedgerTopBanner from "./LedgerTopBanner";
import LedgerBottomBanner from "./LedgerBottomBanner";
import SearchFilterBottomSheet from "./SearchFilterBottomSheet";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { getCategories, getSubCategories } from "@/src/lib/api/categoryApi";
import TransactionPageSkeleton from "../../skeleton/TransactionPageSkeleton";
import { fetchTransactions, reorderTransactions, createTransfer, updateTransfer } from "@/src/lib/api/transaction/transactions";
import { getAccounts } from "@/src/lib/api/accountApi";
import { useToast } from "@/src/hook/useToast";
import { useUserSettings } from "@/src/hook/useUserSettings";

// .env.local에서 Spring Boot URL을 읽어옵니다.
const SPRING_BOOT_URL = process.env.NEXT_PUBLIC_SPRING_BOOT_URL!;

export default function SearchPage() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // 무한 스크롤 로더
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const searchParams = useSearchParams();
  const router = useRouter();
  const { userSetting } = useUserSettings();
  const isExcelView = userSetting?.ledgerTheme === "EXCEL";

  // URL에서 필터 상태 읽기
  const searchTerm = searchParams.get("q") || "";
  const selectedAccountId = searchParams.get("account") || "";
  const selectedType = (searchParams.get("type") as "ALL" | "EXPENSE" | "INCOME") || "ALL";
  const selectedCategoryIds = searchParams.get("categories") ? searchParams.get("categories")!.split(",") : [];
  const selectedCategoryCodes = searchParams.get("codes") ? searchParams.get("codes")!.split(",") : [];
  const customStart = searchParams.get("start") || "";
  const customEnd = searchParams.get("end") || "";

  // 바텀 시트 상태
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);

  // 새 거래용 defaultValues
  const [modalDefaultValues, setModalDefaultValues] = useState<
    Partial<CreateTransactionPayload> | undefined
  >(undefined);

  // 수정할 거래 내역 (null이면 추가 모드)
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);

  const { startDate, endDate } = useMemo(() => {
    if (customStart && customEnd) {
      return { startDate: customStart, endDate: customEnd };
    }
    return { startDate: "", endDate: "" };
  }, [customStart, customEnd]);

  // 바텀 시트에 넘겨줄 초기 필터 객체
  const currentFilters = {
    searchTerm,
    selectedAccountId,
    selectedType,
    selectedCategoryIds,
    selectedCategoryCodes,
    startDate: customStart,
    endDate: customEnd,
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
    queryKey: ["transactions", searchTerm, selectedCategoryIds, selectedCategoryCodes, selectedAccountId, startDate, endDate],
    initialPageParam: {
      cursorDate: null,
      cursorSortOrder: null,
    } as TransactionCursor,
    queryFn: ({ pageParam }: { pageParam: TransactionCursor }) =>
      fetchTransactions({
        keyword: searchTerm.trim() || undefined,
        categoryIds:
          selectedCategoryIds.length > 0 ? selectedCategoryIds : undefined,
        categoryCodes:
          selectedCategoryCodes.length > 0 ? selectedCategoryCodes : undefined,
        accountId: selectedAccountId || undefined,
        startDate,
        endDate,
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
  
  const totalIncome = transactions.filter(t => t.type === 'INCOME').reduce((acc, t) => acc + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'EXPENSE').reduce((acc, t) => acc + t.amount, 0);

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

  // ------------------- 순서 변경 -----------------------
  const handleReorder = async (transactionIds: string[]) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;

    try {
      await reorderTransactions(transactionIds);
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      toast.success("순서가 변경되었습니다.");
    } catch {
      // 실패 시 서버 데이터로 복원
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      toast.error("순서 변경에 실패했습니다. 다시 시도해주세요.");
    }
  };
  // -------------------------------------------------

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
    if (t.category?.code === "BALANCE_ADJUST_EXPENSE" || t.category?.code === "BALANCE_ADJUST_INCOME") {
      toast.error("잔액 조정 내역은 직접 수정할 수 없습니다. 삭제 후 대시보드의 '금액 맞추기'를 다시 이용해주세요.");
      return;
    }

    setEditingTransaction(t);

    const isTransfer = !!t.transferDetail;
    const isSavings = t.category?.code === "SAVINGS_EXPENSE" || t.category?.code === "SAVINGS_INCOME";

    setModalDefaultValues({
      date: t.date,
      type: (isTransfer && !isSavings) ? "TRANSFER" : t.type,
      amount: Math.abs(t.amount),
      categoryId: t.category?.id ?? "",
      subCategoryId: t.subcategory?.id ?? "",
      accountId: isTransfer 
        ? (isSavings && t.type === "INCOME" ? t.transferDetail!.toAccount.id : t.transferDetail!.fromAccount.id)
        : (t.account?.id ?? ""),
      toAccountId: isTransfer 
        ? (isSavings && t.type === "INCOME" ? t.transferDetail!.fromAccount.id : t.transferDetail!.toAccount.id)
        : undefined,
      isSavings: isSavings,
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

    const isEditing = Boolean(editingTransaction?.id);
    const isNewTypeTransfer = payload.type === "TRANSFER" || payload.isSavings;
    const isOldTypeTransfer = Boolean(editingTransaction?.transferDetail);

    // 공통: 이체 계좌 매핑
    const getTransferIds = () => {
      const fromId = payload.type === "INCOME" ? payload.toAccountId! : payload.accountId;
      const toId = payload.type === "INCOME" ? payload.accountId : payload.toAccountId!;
      return { fromId, toId };
    };

    // 공통: 일반 거래 바디 매핑
    const getNormalBody = () => ({
      date: payload.date,
      amount: payload.amount,
      type: payload.type,
      categoryId: payload.categoryId,
      subcategoryId: payload.subCategoryId ?? null,
      description: payload.description ?? null,
      accountId: payload.accountId ?? null,
    });

    try {
      if (isEditing) {
        if (isOldTypeTransfer && isNewTypeTransfer) {
          // 2. 이체 -> 이체: updateTransfer 호출
          const { fromId, toId } = getTransferIds();
          await updateTransfer(editingTransaction!.transferDetail!.linkedTransactionId, {
            fromAccountId: fromId,
            toAccountId: toId,
            amount: payload.amount,
            date: payload.date,
            description: payload.description || "",
            isSavings: payload.isSavings || false,
          });
        } else if (!isOldTypeTransfer && !isNewTypeTransfer) {
          // 1. 일반 -> 일반: 기존 PUT
          const apiUrl = `${SPRING_BOOT_URL}/api/v1/transactions/${editingTransaction!.id}`;
          const res = await fetch(apiUrl, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify(getNormalBody()),
          });
          if (!res.ok) throw new Error(await res.text());
        } else {
          // 3. 타입 변경 (일반<->이체): 기존 삭제 후 신규 등록 (sortOrder 유지)
          const deleteUrl = `${SPRING_BOOT_URL}/api/v1/transactions/${editingTransaction!.id}`;
          const deleteRes = await fetch(deleteUrl, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${session.access_token}` },
          });
          if (!deleteRes.ok) throw new Error("기존 거래 삭제에 실패했습니다.");

          if (isNewTypeTransfer) {
            const { fromId, toId } = getTransferIds();
            await createTransfer({
              fromAccountId: fromId,
              toAccountId: toId,
              amount: payload.amount,
              date: payload.date,
              description: payload.description || "",
              isSavings: payload.isSavings || false,
              sortOrder: editingTransaction!.sortOrder,
            });
          } else {
            const createUrl = `${SPRING_BOOT_URL}/api/v1/transactions`;
            const createRes = await fetch(createUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({
                ...getNormalBody(),
                sortOrder: editingTransaction!.sortOrder,
              }),
            });
            if (!createRes.ok) throw new Error(await createRes.text());
          }
        }
      } else {
        // 신규 등록
        if (isNewTypeTransfer) {
          const { fromId, toId } = getTransferIds();
          await createTransfer({
            fromAccountId: fromId,
            toAccountId: toId,
            amount: payload.amount,
            date: payload.date,
            description: payload.description || "",
            isSavings: payload.isSavings || false,
          });
        } else {
          const createUrl = `${SPRING_BOOT_URL}/api/v1/transactions`;
          const createRes = await fetch(createUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify(getNormalBody()),
          });
          if (!createRes.ok) throw new Error(await createRes.text());
        }
      }
    } catch (err: any) {
      let msg = "저장 실패";
      try {
        const errJson = JSON.parse(err.message);
        msg = errJson?.message || err.message;
      } catch {
        msg = err.message || msg;
      }
      throw new Error(msg);
    }

    queryClient.invalidateQueries({ queryKey: ["transactions"] });
    // 모달 닫기 + 수정 해제
    setIsModalOpen(false);
    setEditingTransaction(null);
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
    <div className="w-full flex justify-center pb-20 lg:pb-0 bg-gray-50 min-h-screen">
      <div className="w-full max-w-[1920px] mx-auto flex flex-col gap-3 sm:gap-4 lg:p-6 px-1 py-4 sm:p-4">
        {/* 필터 요약 및 돌아가기 툴바 */}
        <section className="flex flex-row items-center gap-2 md:gap-3 bg-white p-2 md:p-3 shadow-sm -mx-4 w-[calc(100%+2rem)] lg:mx-0 lg:w-full rounded-none lg:rounded-xl border-y border-x-0 lg:border border-gray-200">
          <Link
            href="/home/transactions"
            className="flex items-center justify-center p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors shrink-0 md:mr-2"
            title="장부 뷰로 돌아가기"
          >
            <ArrowLeft className="w-5 h-5 md:w-6 md:h-6" strokeWidth={2.5} />
          </Link>
          
          <div className="w-px h-6 bg-gray-200 shrink-0 hidden md:block mr-3"></div>

          <div className="flex flex-wrap items-center gap-1.5 flex-1 overflow-x-auto no-scrollbar pr-2 py-1">
            {searchTerm && <span className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium border border-gray-200 whitespace-nowrap">검색어: {searchTerm}</span>}
            {customStart && customEnd ? (
              <span className="px-2.5 py-1 bg-sky-50 text-sky-700 rounded-lg text-xs font-medium border border-sky-100 whitespace-nowrap">{customStart.substring(2)} ~ {customEnd.substring(2)}</span>
            ) : (
              <span className="px-2.5 py-1 bg-sky-50 text-sky-700 rounded-lg text-xs font-medium border border-sky-100 whitespace-nowrap">전체 기간</span>
            )}
            {selectedAccountId && (
              <span className="px-2.5 py-1 bg-purple-50 text-purple-700 rounded-lg text-xs font-medium border border-purple-100 whitespace-nowrap">
                {accounts.find(a => a.id === selectedAccountId)?.name || "알 수 없음"}
              </span>
            )}
            {selectedType !== "ALL" && (
              <span className={`px-2.5 py-1 rounded-lg text-xs font-medium border whitespace-nowrap ${selectedType === 'INCOME' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                {selectedType === "INCOME" ? "수입만" : "지출만"}
              </span>
            )}
            {selectedCategoryIds.length > 0 && (
              <span className="px-2.5 py-1 bg-orange-50 text-orange-700 rounded-lg text-xs font-medium border border-orange-100 whitespace-nowrap">
                카테고리 {selectedCategoryIds.length}개
              </span>
            )}
            {selectedCategoryCodes.length > 0 && (
              <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-medium border border-indigo-100 whitespace-nowrap">
                특수 분류 {selectedCategoryCodes.length}개
              </span>
            )}
            
            {/* 필터가 없을 때 */}
            {!searchTerm && !selectedAccountId && selectedType === "ALL" && selectedCategoryIds.length === 0 && selectedCategoryCodes.length === 0 && (!customStart || !customEnd) && (
              <span className="text-xs text-gray-400 font-medium px-1 whitespace-nowrap">모든 거래 (전체 기간)</span>
            )}
          </div>
        </section>


        <div className="flex flex-col shadow-md bg-white border border-gray-100 -mx-4 w-[calc(100%+2rem)] lg:mx-0 lg:w-full rounded-none lg:rounded-xl border-x-0 lg:border-x">
          <div className="sticky top-0 z-40 bg-white">
            <div className="w-full bg-[#1e3a8a] text-white overflow-x-auto no-scrollbar lg:rounded-t-xl border-b border-gray-200">
              <div className="flex flex-nowrap items-center min-w-max h-full min-h-[60px] md:min-h-[70px] px-4 md:px-5 gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm md:text-base font-bold text-sky-200">검색 결과</span>
                  <span className="text-lg md:text-xl font-bold text-white">{transactions.length}건</span>
                </div>
                
                <div className="flex-1 min-w-[20px]"></div>
                
                <button
                  onClick={() => setIsSearchModalOpen(true)}
                  className="flex shrink-0 items-center gap-1.5 px-3 py-1.5 md:px-4 md:py-2 bg-sky-800/80 hover:bg-sky-700 text-xs md:text-sm font-semibold rounded-lg transition-colors border border-sky-600/50 shadow-sm"
                >
                  <span>⚙️</span>
                  <span>필터 변경</span>
                </button>
              </div>
            </div>
          </div>
          <LedgerTable
            transactions={transactions}
            loading={isPageLoading}
            error={pageError?.message ?? null}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onReorder={handleReorder}
            currentAccountId={selectedAccountId}
            isExcelView={isExcelView}
          />

          <div className="sticky bottom-0 z-40 bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
            <div className="w-full bg-[#1e3a8a] text-white overflow-x-auto no-scrollbar lg:rounded-b-xl border-t-0">
              <div className="flex flex-nowrap items-center min-w-max h-full min-h-[60px] md:min-h-[70px]">
                <div className="px-4 py-2 md:py-3 flex flex-col justify-center min-w-[120px] md:min-w-[140px] bg-sky-900/40 border-r border-white/20">
                  <span className="text-[10px] md:text-xs text-sky-200 font-semibold mb-0.5 md:mb-1 uppercase tracking-wider">검색된 수입 합계</span>
                  <span className="text-sm md:text-base font-bold text-emerald-300">
                    +&#8361;{totalIncome.toLocaleString()}
                  </span>
                </div>
                <div className="px-4 py-2 md:py-3 flex flex-col justify-center min-w-[120px] md:min-w-[140px]">
                  <span className="text-[10px] md:text-xs text-sky-200 font-semibold mb-0.5 md:mb-1 uppercase tracking-wider">검색된 지출 합계</span>
                  <span className="text-sm md:text-base font-bold text-red-300">
                    -&#8361;{totalExpense.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

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

      </div>
    </div>

      {/* 검색 필터 바텀시트 */}
      <SearchFilterBottomSheet
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        accounts={accounts}
        rawCategories={rawCategories}
        initialFilters={currentFilters}
        onApply={(filters) => {
          const params = new URLSearchParams();
          if (filters.searchTerm) params.set("q", filters.searchTerm);
          if (filters.selectedAccountId) params.set("account", filters.selectedAccountId);
          if (filters.selectedType !== "ALL") params.set("type", filters.selectedType);
          if (filters.selectedCategoryIds.length > 0) {
            params.set("categories", filters.selectedCategoryIds.join(","));
          }
          if (filters.selectedCategoryCodes.length > 0) {
            params.set("codes", filters.selectedCategoryCodes.join(","));
          }
          if (filters.startDate) params.set("start", filters.startDate);
          if (filters.endDate) params.set("end", filters.endDate);
          
          router.replace(`/home/transactions/search?${params.toString()}`);
        }}
      />

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
