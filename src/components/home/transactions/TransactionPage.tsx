/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import AddTransactionModal from "@/src/components/AddTransactionModal";
import { createClient } from "@/src/lib/supabase/client";
import { useEffect, useMemo, useRef, useState } from "react";
import LedgerTable from "./table/LedgerTable";
import TransactionDateSelector from "./TransactionDateSelector";
import { CalendarDays, ChevronDown, X } from "lucide-react";
import Link from "next/link";
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
import { getOpeningBalance, getClosingBalance } from "@/src/lib/api/balanceApi";
import { useToast } from "@/src/hook/useToast";
import { useUserSettings } from "@/src/hook/useUserSettings";
import { getDashboardBalances } from "@/src/lib/api/dashboard/balance";
import LedgerTopBanner from "./LedgerTopBanner";
import LedgerBottomBanner from "./LedgerBottomBanner";

// .env.local에서 Spring Boot URL을 읽어옵니다.
const SPRING_BOOT_URL = process.env.NEXT_PUBLIC_SPRING_BOOT_URL!;

export default function TransactionPage() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // 무한 스크롤 로더
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  // 날짜 및 뷰 모드
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"daily" | "weekly" | "monthly" | "custom">("weekly");

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
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [tempStart, setTempStart] = useState("");
  const [tempEnd, setTempEnd] = useState("");

  const { userSetting } = useUserSettings();
  const isExcelView = userSetting?.ledgerTheme === "EXCEL";

  // 새 거래용 defaultValues
  const [modalDefaultValues, setModalDefaultValues] = useState<
    Partial<CreateTransactionPayload> | undefined
  >(undefined);

  // 수정할 거래 내역 (null이면 추가 모드)
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);

  const { startDate, endDate } = useMemo(() => {
    if (viewMode === "custom" && customStart && customEnd) {
      return { startDate: customStart, endDate: customEnd };
    }

    const d = new Date(currentDate);
    const year = d.getFullYear();
    const month = d.getMonth();
    const date = d.getDate();
    const day = d.getDay(); // 0 (Sun) to 6 (Sat)

    if (viewMode === "daily") {
      const yyyyMmDd = `${year}-${String(month + 1).padStart(2, "0")}-${String(date).padStart(2, "0")}`;
      return { startDate: yyyyMmDd, endDate: yyyyMmDd };
    }

    if (viewMode === "weekly") {
      const diffToMonday = day === 0 ? -6 : 1 - day;
      const startOfWeek = new Date(d);
      startOfWeek.setDate(date + diffToMonday);

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);

      const sYear = startOfWeek.getFullYear();
      const sMonth = startOfWeek.getMonth();
      const sDate = startOfWeek.getDate();
      const start = `${sYear}-${String(sMonth + 1).padStart(2, "0")}-${String(sDate).padStart(2, "0")}`;

      const eYear = endOfWeek.getFullYear();
      const eMonth = endOfWeek.getMonth();
      const eDate = endOfWeek.getDate();
      const end = `${eYear}-${String(eMonth + 1).padStart(2, "0")}-${String(eDate).padStart(2, "0")}`;

      return { startDate: start, endDate: end };
    }

    // "monthly"
    const start = `${year}-${String(month + 1).padStart(2, "0")}-01`;
    const lastDay = new Date(year, month + 1, 0).getDate();
    const end = `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    return { startDate: start, endDate: end };
  }, [viewMode, customStart, customEnd, currentDate]);

  const dateDisplayString = useMemo(() => {
    if (viewMode === "custom") return `${startDate} ~ ${endDate}`;

    const d = new Date(currentDate);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const date = d.getDate();

    if (viewMode === "daily") {
      return `${year}년 ${month}월 ${date}일`;
    }
    if (viewMode === "weekly") {
      const [, sm, sd] = startDate.split("-");
      const [, em, ed] = endDate.split("-");

      // Calculate week of month based on Thursday
      const thursday = new Date(startDate);
      thursday.setDate(thursday.getDate() + 3);

      const targetMonth = thursday.getMonth() + 1;
      const targetDate = thursday.getDate();

      const firstDayOfMonth = new Date(thursday.getFullYear(), thursday.getMonth(), 1);
      const firstDayOffset = firstDayOfMonth.getDay() === 0 ? 6 : firstDayOfMonth.getDay() - 1; // 0(Mon) to 6(Sun)

      const weekNumber = Math.ceil((targetDate + firstDayOffset) / 7);

      // Always use m/d ~ m/d format for consistency
      return `${targetMonth}월 ${weekNumber}주차 (${parseInt(sm)}/${parseInt(sd)} ~ ${parseInt(em)}/${parseInt(ed)})`;
    }
    // monthly
    return `${year}년 ${month}월`;
  }, [viewMode, currentDate, startDate, endDate]);

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
  /* 잔액 조회 (장부 뷰) */
  const { data: openingBalance, isLoading: isOpeningLoading } = useQuery({
    queryKey: ["openingBalance", startDate, selectedAccountId],
    queryFn: () => getOpeningBalance(startDate, selectedAccountId),
  });

  const { data: closingBalance, isLoading: isClosingLoading } = useQuery({
    queryKey: ["closingBalance", endDate, selectedAccountId],
    queryFn: () => getClosingBalance(endDate, selectedAccountId),
  });
  /* 결제수단별 잔액 조회 */
  const {
    data: balanceData,
    isLoading: isBalanceLoading,
  } = useQuery({
    queryKey: ["dashboardBalances"],
    queryFn: () => getDashboardBalances(),
    retry: false,
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
        sortDirection: "ASC",
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
  const rawTransactions = data?.pages.flatMap((page) => page.content) ?? [];

  // 잔액 누적 계산 로직 (수입/지출/잔액/계좌잔액)
  const transactions = useMemo(() => {
    if (!openingBalance || rawTransactions.length === 0) return rawTransactions;

    let currentTotal = openingBalance.totalAmount;
    const accMap = new Map<string, number>();
    openingBalance.accounts.forEach((a) => accMap.set(a.accountId, a.amount));

    return rawTransactions.map((t) => {
      const isTransfer = !!t.transferDetail || (t.type as string) === "TRANSFER";
      const signedAmount = t.type === "EXPENSE" ? -t.amount : t.amount;
      let runningAccountBalance = 0;
      let runningLinkedAccountBalance: number | undefined = undefined;

      if (isTransfer) {
        if (selectedAccountId) {
          // 특정 계좌 조회 중이면 해당 계좌의 잔액만 업데이트
          const newAccBal = (accMap.get(t.account.id) || 0) + signedAmount;
          accMap.set(t.account.id, newAccBal);
          runningAccountBalance = newAccBal;
        } else {
          // 전체 계좌 조회 중이면 출금/입금 양쪽 모두 업데이트 시도
          const newAccBal = (accMap.get(t.account.id) || 0) + signedAmount;
          accMap.set(t.account.id, newAccBal);
          runningAccountBalance = newAccBal;

          if (t.transferDetail && t.type === "EXPENSE") {
            const linkedId = t.transferDetail.toAccount.id;
            const linkedBal = (accMap.get(linkedId) || 0) + t.amount;
            accMap.set(linkedId, linkedBal);
            runningLinkedAccountBalance = linkedBal;
          }
        }
      } else {
        // 일반 거래
        const newAccBal = (accMap.get(t.account.id) || 0) + signedAmount;
        accMap.set(t.account.id, newAccBal);
        runningAccountBalance = newAccBal;
      }

      // 총 잔액 업데이트 (전체 계좌 보기 시 이체 내역은 총 잔액 변동 없음)
      if (isTransfer && !selectedAccountId) {
        // 총 잔액 유지
      } else {
        currentTotal += signedAmount;
      }

      return {
        ...t,
        runningTotalBalance: currentTotal,
        runningAccountBalance: runningAccountBalance,
        runningLinkedAccountBalance: runningLinkedAccountBalance,
      };
    });
  }, [rawTransactions, openingBalance, selectedAccountId]);

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
      } catch { }
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
    setViewMode("custom");
    setShowDatePicker(false);
  };

  const clearCustomRange = () => {
    setCustomStart("");
    setCustomEnd("");
    setViewMode("weekly");
    setShowDatePicker(false);
  };

  /* 이전/다음 달 */
  const handlePrevious = () => {
    const d = new Date(currentDate);
    if (viewMode === "daily") {
      d.setDate(d.getDate() - 1);
    } else if (viewMode === "weekly") {
      d.setDate(d.getDate() - 7);
    } else if (viewMode === "monthly") {
      d.setMonth(d.getMonth() - 1);
    }
    setCurrentDate(d);
  };

  const handleNext = () => {
    const d = new Date(currentDate);
    if (viewMode === "daily") {
      d.setDate(d.getDate() + 1);
    } else if (viewMode === "weekly") {
      d.setDate(d.getDate() + 7);
    } else if (viewMode === "monthly") {
      d.setMonth(d.getMonth() + 1);
    }
    setCurrentDate(d);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
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
      <div className="w-full flex justify-center pb-4 lg:pb-0 bg-gray-50 min-h-screen">
        <div className="w-full max-w-[1920px] mx-auto flex flex-col gap-3 sm:gap-4 lg:p-6 px-1 py-4 sm:p-4">
          {/* --- 뷰 컨트롤 툴바 --- */}
          <section className={`flex flex-col xl:flex-row gap-2 xl:items-center xl:justify-between bg-white p-2 md:p-4 shadow-sm ${isExcelView ? "-mx-4 w-[calc(100%+2rem)] lg:mx-0 lg:w-full rounded-none lg:rounded-xl border-y border-x-0 lg:border border-gray-200" : "rounded-xl border border-gray-200"}`}>
            {activeTab === "transactions" ? (
              <>
                {/* 좌측: 날짜 선택 */}
                <div className="flex flex-wrap items-center gap-2 md:gap-4 w-full xl:w-auto justify-between">
                  <TransactionDateSelector
                    viewMode={viewMode}
                    onChangeViewMode={(mode) => {
                      setViewMode(mode);
                      if (mode === "custom") setShowDatePicker(true);
                      else setShowDatePicker(false);
                    }}
                    dateDisplayString={dateDisplayString}
                    onPrev={handlePrevious}
                    onNext={handleNext}
                    onToday={handleToday}
                  />
                </div>

                {/* 우측: 검색뷰 전환, 임시보관함 전환, 새 거래 추가 */}
                <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto justify-end">
                  <Link
                    href="/home/transactions/search"
                    className="flex items-center gap-1 md:gap-1.5 px-2.5 md:px-4 py-1.5 md:py-2 rounded-lg text-[11px] md:text-sm font-semibold bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                  >
                    <span className="text-xs md:text-base">🔍</span> 검색 뷰
                  </Link>

                  {drafts.length > 0 && (
                    <button
                      onClick={() => setActiveTab("drafts")}
                      className="relative flex items-center gap-1 md:gap-1.5 px-2.5 md:px-4 py-1.5 md:py-2 rounded-lg text-[11px] md:text-sm font-semibold transition-colors bg-white border border-amber-200 text-amber-600 hover:bg-amber-50"
                    >
                      <span className="text-xs md:text-base">📬</span> 임시 보관함
                      <span className="inline-flex items-center justify-center min-w-[16px] h-[16px] md:min-w-[18px] md:h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] md:text-[11px] font-bold">
                        {drafts.length}
                      </span>
                    </button>
                  )}

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
                    className="hidden md:inline-flex bg-sky-600 text-white px-5 py-2 rounded-lg font-semibold hover:bg-sky-700 transition-colors text-sm shadow-sm"
                  >
                    + 새 거래 추가
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* 임시 보관함 모드 툴바 */}
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📬</span>
                  <h1 className="text-xl font-bold text-gray-900">임시 보관함</h1>
                  <span className="px-2.5 py-0.5 rounded-full bg-red-100 text-red-600 text-xs font-bold">{drafts.length}건</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveTab("transactions")}
                    className="px-4 py-2 rounded-lg text-sm font-semibold bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                  >
                    ← 장부 뷰로 돌아가기
                  </button>
                </div>
              </>
            )}
          </section>

          {activeTab === "transactions" && (
            <>
              <div className="flex flex-col gap-3">

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

              <div className={`flex flex-col shadow-md bg-white border border-gray-100 ${isExcelView ? "-mx-4 w-[calc(100%+2rem)] lg:mx-0 lg:w-full rounded-none lg:rounded-xl border-x-0 lg:border-x" : "rounded-xl"}`}>
                <div className="sticky top-0 z-40 bg-white">
                  <LedgerTopBanner
                    balanceData={balanceData}
                    isLoading={isBalanceLoading}
                    accounts={accounts}
                    selectedAccountId={selectedAccountId}
                    onSelectAccount={setSelectedAccountId}
                  />
                </div>

                <LedgerTable
                  transactions={transactions}
                  loading={isTransactionsLoading && !isFetchingNextPage}
                  error={pageError?.message || null}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onReorder={handleReorder}
                  currentAccountId={selectedAccountId}
                  isExcelView={isExcelView}
                />

                <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] lg:bottom-0 z-40 bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                  <LedgerBottomBanner balanceData={balanceData} isLoading={isBalanceLoading} accounts={accounts} />
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
                        className={`text-sm font-semibold ${draft.amount < 0 ? "text-red-500" : "text-blue-500"
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
        </div>
      </div>

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
