/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import AddTransactionModal from "@/src/components/AddTransactionModal";
import { createClient } from "@/src/lib/supabase/client";
import { useEffect, useMemo, useRef, useState } from "react";
import LedgerTable from "./table/LedgerTable";
import MonthSelector from "../dashboard/section/MonthSelector";
import { CalendarDays, ChevronDown, Search, X } from "lucide-react";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { getCategories, getSubCategories } from "@/src/lib/api/categoryApi";
import TransactionPageSkeleton from "../../skeleton/TransactionPageSkeleton";
import { fetchTransactions, getDrafts, reorderTransactions, createTransfer, updateTransfer } from "@/src/lib/api/transaction/transactions";
import { getAccounts } from "@/src/lib/api/accountApi";
import { useToast } from "@/src/hook/useToast";

// .env.local에서 Spring Boot URL을 읽어옵니다.
const SPRING_BOOT_URL = process.env.NEXT_PUBLIC_SPRING_BOOT_URL!;

export default function TransactionPage() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // 무한 스크롤 로더
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  // 날짜
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // 검색
  const [searchTerm, setSearchTerm] = useState("");

  // 모바일 검색/필터 접기/펼치기 상태
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // 결제수단 필터
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");

  // 카테고리 필터
  const [selectedType, setSelectedType] = useState<
    "ALL" | "EXPENSE" | "INCOME"
  >("ALL");
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [selectedCategoryCodes, setSelectedCategoryCodes] = useState<string[]>([]);

  const [isModalOpen, setIsModalOpen] = useState(false);

  // 활성 탭 (거래 내역 / 임시 보관함)
  const [activeTab, setActiveTab] = useState<"transactions" | "drafts">("transactions");

  // 임시 내역 분류 모달 모드
  const [isDraftMode, setIsDraftMode] = useState(false);

  // 날짜 범위 필터
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateRangeMode, setDateRangeMode] = useState<"month" | "custom">("month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [tempStart, setTempStart] = useState("");
  const [tempEnd, setTempEnd] = useState("");

  // 새 거래용 defaultValues
  const [modalDefaultValues, setModalDefaultValues] = useState<
    Partial<CreateTransactionPayload> | undefined
  >(undefined);

  // 수정할 거래 내역 (null이면 추가 모드)
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);

  const { startDate, endDate } = useMemo(() => {
    if (dateRangeMode === "custom" && customStart && customEnd) {
      return { startDate: customStart, endDate: customEnd };
    }
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const start = `${year}-${String(month + 1).padStart(2, "0")}-01`;
    const lastDay = new Date(year, month + 1, 0).getDate();
    const end = `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    return { startDate: start, endDate: end };
  }, [dateRangeMode, customStart, customEnd, currentMonth]);

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
    return rawCategories.filter(
      (c) =>
        c.type === "INCOME" &&
        c.code !== "TRANSFER_INCOME" &&
        c.code !== "SAVINGS_INCOME"
    );
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

  const toggleCategoryCode = (codes: string[]) => {
    setSelectedCategoryCodes((prev) => {
      const hasAll = codes.every((c) => prev.includes(c));
      if (hasAll) {
        return prev.filter((c) => !codes.includes(c));
      } else {
        const newPrev = prev.filter((c) => !codes.includes(c));
        return [...newPrev, ...codes];
      }
    });
  };

  // 전체 카테고리 선택 해제 = 전체 보기
  const handleSelectAllCategories = () => {
    setSelectedCategoryIds([]);
    setSelectedCategoryCodes([]);
  };

  const assetManagementCodes = [
    "TRANSFER_EXPENSE", "TRANSFER_INCOME",
    "SAVINGS_EXPENSE", "SAVINGS_INCOME",
    "BALANCE_ADJUST_EXPENSE", "BALANCE_ADJUST_INCOME"
  ];

  // 수입 전체 버튼 활성 상태
  const isAllIncomeCategoriesSelected =
    incomeCategories.length > 0 &&
    incomeCategories.every((c) => selectedCategoryIds.includes(c.id));

  // 지출 전체 버튼 활성 상태
  const isAllExpenseCategoriesSelected =
    expenseCategories.length > 0 &&
    expenseCategories.every((c) => selectedCategoryIds.includes(c.id));

  // 자산 관리 전체 버튼 활성 상태
  const isAllAssetManagementCategoriesSelected =
    assetManagementCodes.every((c) => selectedCategoryCodes.includes(c));

  // 수입 카테고리 전체 선택/해제
  const handleSelectAllIncomeCategories = () => {
    if (isAllIncomeCategoriesSelected) {
      // 이미 모두 선택된 상태면 수입 카테고리만 제거
      setSelectedCategoryIds((prev) => prev.filter((id) => !incomeCategories.some((c) => c.id === id)));
    } else {
      // 모두 선택되지 않은 상태면 수입 카테고리 모두 추가
      setSelectedCategoryIds((prev) => {
        const otherIds = prev.filter((id) => !incomeCategories.some((c) => c.id === id));
        return [...otherIds, ...incomeCategories.map((c) => c.id)];
      });
    }
  };

  // 지출 카테고리 전체 선택/해제
  const handleSelectAllExpenseCategories = () => {
    if (isAllExpenseCategoriesSelected) {
      setSelectedCategoryIds((prev) => prev.filter((id) => !expenseCategories.some((c) => c.id === id)));
    } else {
      setSelectedCategoryIds((prev) => {
        const otherIds = prev.filter((id) => !expenseCategories.some((c) => c.id === id));
        return [...otherIds, ...expenseCategories.map((c) => c.id)];
      });
    }
  };

  // 자산 관리 전체 선택/해제
  const handleSelectAllAssetManagementCategories = () => {
    if (isAllAssetManagementCategoriesSelected) {
      setSelectedCategoryCodes((prev) => prev.filter((code) => !assetManagementCodes.includes(code)));
    } else {
      setSelectedCategoryCodes((prev) => {
        const otherCodes = prev.filter((code) => !assetManagementCodes.includes(code));
        return [...otherCodes, ...assetManagementCodes];
      });
    }
  };

  // 전체 버튼 활성 상태 (어느 것도 선택되지 않았을 때)
  const isAllCategoriesSelected = selectedCategoryIds.length === 0 && selectedCategoryCodes.length === 0;
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

  /* 임시 보관함 조회 */
  const {
    data: drafts = [],
    isLoading: isDraftsLoading,
  } = useQuery({
    queryKey: ["drafts"],
    queryFn: getDrafts,
  });

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

  // 임시 내역 분류 모달 열기
  const handleOpenDraftModal = (draft: DraftTransaction) => {
    setEditingTransaction(draft as unknown as Transaction);
    setIsDraftMode(true);
    setModalDefaultValues({
      date: draft.date,
      type: draft.type ?? "EXPENSE",
      amount: Math.abs(draft.amount),
      categoryId: draft.category?.id ?? "",
      subCategoryId: draft.subcategory?.id ?? "",
      accountId: draft.account?.id ?? "",
      description: draft.description ?? "",
    });
    setIsModalOpen(true);
  };

  // 모달 닫기(새 props 방식)
  const handleOpenChange = (open: boolean) => {
    setIsModalOpen(open);
    if (!open) {
      setEditingTransaction(null);
      setModalDefaultValues(undefined);
      setIsDraftMode(false);
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
      ...(isDraftMode && { isDraft: false }),
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
    if (isDraftMode) {
      queryClient.invalidateQueries({ queryKey: ["drafts"] });
    }
    // 모달 닫기 + 수정 해제
    setIsModalOpen(false);
    setEditingTransaction(null);
  };

  /* 임시저장 (날짜, 금액, 메모만 업데이트) */
  const handleSaveDraft = async (
    payload: Partial<CreateTransactionPayload>,
  ): Promise<void> => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) throw new Error("로그인이 필요합니다.");

    if (!editingTransaction?.id) {
      throw new Error("수정할 임시 내역이 없습니다.");
    }

    const apiUrl = `${SPRING_BOOT_URL}/api/v1/transactions/${editingTransaction.id}`;

    const bodyForDraft = {
      date: payload.date,
      amount: payload.amount,
      type: payload.type,
      categoryId: payload.categoryId ?? null,
      subcategoryId: payload.subCategoryId ?? null,
      accountId: payload.accountId ?? null,
      description: payload.description ?? null,
      isDraft: true, // 임시 상태 유지
    };

    const res = await fetch(apiUrl, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(bodyForDraft),
    });

    if (!res.ok) {
      let msg = "임시저장 실패";
      try {
        const errJson = await res.json();
        msg = errJson?.message || msg;
      } catch {}
      throw new Error(msg);
    }

    queryClient.invalidateQueries({ queryKey: ["drafts"] });
    setIsModalOpen(false);
    setEditingTransaction(null);
  };

  /* 날짜 범위 */
  const handleOpenDatePicker = () => {
    if (showDatePicker) {
      setShowDatePicker(false);
      return;
    }
    setTempStart(startDate);
    setTempEnd(endDate);
    setShowDatePicker(true);
  };

  const applyDateRange = () => {
    if (!tempStart || !tempEnd || tempStart > tempEnd) return;
    setCustomStart(tempStart);
    setCustomEnd(tempEnd);
    setDateRangeMode("custom");
    setShowDatePicker(false);
  };

  const clearCustomRange = () => {
    setCustomStart("");
    setCustomEnd("");
    setDateRangeMode("month");
    setShowDatePicker(false);
  };

  /* 이전/다음 달 */
  const handlePreviousMonth = () => {
    setDateRangeMode("month");
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1),
    );
  };

  const handleNextMonth = () => {
    setDateRangeMode("month");
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
        {/* 탭 바 */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-1 rounded-xl bg-gray-100 p-1">
            <button
              onClick={() => setActiveTab("transactions")}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                activeTab === "transactions"
                  ? "bg-sky-600 text-white shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              거래 내역
            </button>
            <button
              onClick={() => setActiveTab("drafts")}
              className={`relative flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                activeTab === "drafts"
                  ? "bg-amber-500 text-white shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              임시 보관함
              {drafts.length > 0 && (
                <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[11px] font-bold">
                  {drafts.length}
                </span>
              )}
            </button>
          </div>

          <button
            onClick={() => {
              setEditingTransaction(null);
              setIsDraftMode(false);
              setModalDefaultValues({
                date: new Date().toISOString().split("T")[0],
                type: "EXPENSE",
                categoryId: rawCategories.find((c) => c.type === "EXPENSE")?.id,
                accountId: accounts[0]?.id,
              });
              setIsModalOpen(true);
            }}
            className="bg-sky-600 text-white px-5 py-2 rounded-lg font-semibold hover:bg-sky-700 transition-colors text-sm shadow-sm"
          >
            + 새 거래 추가
          </button>
        </div>

        {activeTab === "transactions" && (
          <>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row gap-4 sm:justify-between sm:items-center bg-white p-4 md:p-5 rounded-xl shadow-sm border border-gray-100">
                <MonthSelector
                  currentMonth={currentMonth}
                  onPrev={handlePreviousMonth}
                  onNext={handleNextMonth}
                />
                <button
                  onClick={handleOpenDatePicker}
                  className={`whitespace-nowrap shrink-0 flex justify-center items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                    dateRangeMode === "custom"
                      ? "bg-sky-50 text-sky-700 border-sky-300"
                      : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <CalendarDays size={16} />
                  <span>
                    {dateRangeMode === "custom"
                      ? `${customStart} ~ ${customEnd}`
                      : "기간 지정"}
                  </span>
                  {dateRangeMode === "custom" && (
                    <X
                      size={14}
                      className="ml-1 cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        clearCustomRange();
                      }}
                    />
                  )}
                </button>
              </div>

              {showDatePicker && (
                <div className="bg-white p-4 md:p-5 rounded-xl shadow-sm border border-gray-100 flex flex-wrap items-end gap-4">
                  <div className="flex flex-col gap-1.5 flex-1 min-w-[120px]">
                    <label className="text-xs font-semibold text-gray-500">시작일</label>
                    <input
                      type="date"
                      value={tempStart}
                      onChange={(e) => setTempStart(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                    />
                  </div>
                  <span className="mb-3 text-gray-400 font-medium">~</span>
                  <div className="flex flex-col gap-1.5 flex-1 min-w-[120px]">
                    <label className="text-xs font-semibold text-gray-500">종료일</label>
                    <input
                      type="date"
                      value={tempEnd}
                      onChange={(e) => setTempEnd(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                    />
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                    <button
                      onClick={applyDateRange}
                      disabled={!tempStart || !tempEnd || tempStart > tempEnd}
                      className="flex-1 sm:flex-none px-4 py-2 bg-sky-600 text-white text-sm rounded-lg font-medium hover:bg-sky-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      적용
                    </button>
                    <button
                      onClick={() => setShowDatePicker(false)}
                      className="flex-1 sm:flex-none px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                    >
                      닫기
                    </button>
                  </div>
                </div>
              )}
            </div>

        {/* 검색/필터 */}
        <div className="bg-white p-4 md:p-5 rounded-xl shadow-sm border border-gray-100 mb-6 mt-4">
          {/* 모바일에서만 검색/필터 접기/펼치기 헤더 표시 */}
          <div className="flex items-center justify-between md:hidden cursor-pointer" onClick={() => setIsMobileFilterOpen((prev) => !prev)}>
            <p className="text-sm font-semibold text-gray-900">검색 및 필터</p>
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-50 p-1"
            >
              <ChevronDown
                size={22}
                className={`transition-transform duration-300 ease-in-out ${
                  isMobileFilterOpen ? "rotate-180" : "rotate-0"
                }`}
              />
            </button>
          </div>

          <div
            className={`overflow-hidden transition-all duration-300 ease-in-out md:overflow-visible ${
              isMobileFilterOpen
                ? "max-h-[1500px] opacity-100 mt-4"
                : "max-h-0 opacity-0"
            } md:max-h-none md:opacity-100 md:mt-0`}
          >
            <div className="flex flex-col gap-5">
              {/* 검색 + 결제수단 필터 */}
              <div className="flex flex-col gap-3 md:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="거래 내역 검색..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:bg-white transition-colors"
                  />
                </div>
                <select
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  className="py-2.5 px-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:bg-white transition-colors md:w-56"
                >
                  <option value="">결제수단 전체</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 카테고리 필터 섹션 */}
              <div className="pt-4 border-t border-gray-100">
                {/* 전체일 때만 전체 / 수입 전체 / 지출 전체 / 자산 관리 전체 버튼 노출 */}
                {selectedType === "ALL" ? (
                  <div className="mb-4 flex flex-wrap gap-2">
                    <button
                      onClick={handleSelectAllCategories}
                      className={`px-4 py-2 text-sm rounded-lg font-medium whitespace-nowrap transition-colors ${
                        isAllCategoriesSelected
                          ? "bg-gray-800 text-white shadow-sm"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      전체
                    </button>
                    <button
                      onClick={handleSelectAllIncomeCategories}
                      className={`px-4 py-2 text-sm rounded-lg font-medium whitespace-nowrap transition-colors ${
                        isAllIncomeCategoriesSelected
                          ? "bg-emerald-600 text-white shadow-sm"
                          : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                      }`}
                    >
                      수입 전체
                    </button>
                    <button
                      onClick={handleSelectAllExpenseCategories}
                      className={`px-4 py-2 text-sm rounded-lg font-medium whitespace-nowrap transition-colors ${
                        isAllExpenseCategoriesSelected
                          ? "bg-sky-600 text-white shadow-sm"
                          : "bg-sky-50 text-sky-700 hover:bg-sky-100"
                      }`}
                    >
                      지출 전체
                    </button>
                    <button
                      onClick={handleSelectAllAssetManagementCategories}
                      className={`px-4 py-2 text-sm rounded-lg font-medium whitespace-nowrap transition-colors ${
                        isAllAssetManagementCategoriesSelected
                          ? "bg-purple-600 text-white shadow-sm"
                          : "bg-purple-50 text-purple-700 hover:bg-purple-100"
                      }`}
                    >
                      자산 관리 전체
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleSelectAllCategories}
                    className={`mb-4 px-4 py-2 text-sm rounded-lg font-medium whitespace-nowrap transition-colors ${
                      isAllCategoriesSelected
                        ? "bg-gray-800 text-white shadow-sm"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    전체
                  </button>
                )}

                {/* 거래 유형이 전체일 때는 수입 / 지출 / 자산관리 카테고리를 섹션으로 분리해서 표시 */}
                {selectedType === "ALL" ? (
                  <div className="space-y-5">
                    {/* 수입 카테고리 섹션 */}
                    <div>
                      <p className="mb-2.5 text-xs font-semibold text-gray-400">수입</p>
                      <div className="flex flex-wrap gap-2">
                        {incomeCategories.map((c) => {
                          const selected = selectedCategoryIds.includes(c.id);
                          return (
                            <button
                              key={c.id}
                              onClick={() => toggleCategory(c.id)}
                              className={`px-3.5 py-1.5 text-sm rounded-full font-medium whitespace-nowrap transition-colors border ${
                                selected
                                  ? "bg-emerald-50 border-emerald-500 text-emerald-700"
                                  : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300"
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
                      <p className="mb-2.5 text-xs font-semibold text-gray-400">지출</p>
                      <div className="flex flex-wrap gap-2">
                        {expenseCategories.map((c) => {
                          const selected = selectedCategoryIds.includes(c.id);
                          return (
                            <button
                              key={c.id}
                              onClick={() => toggleCategory(c.id)}
                              className={`px-3.5 py-1.5 text-sm rounded-full font-medium whitespace-nowrap transition-colors border ${
                                selected
                                  ? "bg-sky-50 border-sky-500 text-sky-700"
                                  : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300"
                              }`}
                            >
                              {c.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    {/* 자산 관리 섹션 */}
                    <div>
                      <p className="mb-2.5 text-xs font-semibold text-gray-400">자산 관리</p>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { label: "이체", codes: ["TRANSFER_EXPENSE", "TRANSFER_INCOME"] },
                          { label: "저축/투자", codes: ["SAVINGS_EXPENSE", "SAVINGS_INCOME"] },
                          { label: "잔액 조정", codes: ["BALANCE_ADJUST_EXPENSE", "BALANCE_ADJUST_INCOME"] },
                        ].map((sys) => {
                          const selected = sys.codes.every((c) => selectedCategoryCodes.includes(c));
                          return (
                            <button
                              key={sys.label}
                              onClick={() => toggleCategoryCode(sys.codes)}
                              className={`px-3.5 py-1.5 text-sm rounded-full font-medium whitespace-nowrap transition-colors border ${
                                selected
                                  ? "bg-purple-50 border-purple-500 text-purple-700"
                                  : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300"
                              }`}
                            >
                              {sys.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  // 거래 유형이 지출/수입으로 선택된 경우에는 기존처럼 한 그룹으로 표시
                  <div className="flex flex-wrap gap-2 mt-2">
                    {filteredCategories.map((c) => {
                      const selected = selectedCategoryIds.includes(c.id);
                      return (
                        <button
                          key={c.id}
                          onClick={() => toggleCategory(c.id)}
                          className={`px-3.5 py-1.5 text-sm rounded-full font-medium whitespace-nowrap transition-colors border ${
                             selected
                               ? selectedType === "INCOME"
                                 ? "bg-emerald-50 border-emerald-500 text-emerald-700"
                                 : "bg-sky-50 border-sky-500 text-sky-700"
                               : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300"
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
          onReorder={handleReorder}
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
        </>
        )}

        {activeTab === "drafts" && (
          <div className="space-y-3">
            {isDraftsLoading ? (
              <div className="py-12 text-center text-sm text-gray-500">임시 보관함 불러오는 중...</div>
            ) : drafts.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-gray-400 text-sm">임시 보관함이 비어 있습니다.</p>
                <p className="text-gray-300 text-xs mt-1">빠른 추가로 등록한 내역이 여기에 쌓입니다.</p>
              </div>
            ) : (
              drafts.map((draft) => (
                <button
                  key={draft.id}
                  onClick={() => handleOpenDraftModal(draft)}
                  className="w-full flex items-center justify-between px-5 py-4 bg-white border border-amber-100 rounded-xl shadow-sm hover:bg-amber-50 hover:border-amber-300 transition-colors text-left group"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium text-gray-800">
                      {draft.description || "(설명 없음)"}
                    </span>
                    <span className="text-xs text-gray-400">{draft.date}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-sm font-semibold ${
                        draft.amount < 0 ? "text-red-500" : "text-blue-500"
                      }`}
                    >
                      {draft.amount < 0 ? "-" : "+"}
                      {Math.abs(draft.amount).toLocaleString()}원
                    </span>
                    <span className="text-xs text-amber-400 group-hover:text-amber-600 transition-colors whitespace-nowrap">
                      탭하여 분류하기 →
                    </span>
                  </div>
                </button>
              ))
            )}
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
            onSaveDraft={isDraftMode ? handleSaveDraft : undefined}
            defaultValues={modalDefaultValues}
            mode={isDraftMode ? "confirm-draft" : editingTransaction ? "edit" : "create"}
          />
        </>
      )}
    </>
  );
}
