/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import AddTransactionModal from "@/src/components/AddTransactionModal";
import TransactionDetailModal from "./TransactionDetailModal";
import { createClient } from "@/src/lib/supabase/client";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import LedgerTable from "./table/LedgerTable";
import TransactionDateSelector from "./TransactionDateSelector";
import { CalendarDays, ChevronDown, X, Trash2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import SearchFilterBottomSheet from "./SearchFilterBottomSheet";
import DraftInbox from "./DraftInbox";
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
import { getOpeningBalance, getClosingBalance, type BalanceRes } from "@/src/lib/api/balanceApi";
import { useToast } from "@/src/hook/useToast";
import { useUserSettings } from "@/src/hook/useUserSettings";
import { getDashboardBalances } from "@/src/lib/api/dashboard/balance";
import LedgerTopBanner from "./LedgerTopBanner";
import LedgerBottomBanner from "./LedgerBottomBanner";
import SequentialCategorizer from "./SequentialCategorizer";
import { useQuestStore } from "@/src/store/useQuestStore";
import { completeQuest, claimQuestReward } from "@/src/lib/api/questApi";
import { useIsMobileViewport } from "@/src/hook/useIsMobileViewport";
import MobileTransactionView from "./mobile/MobileTransactionView";
import { calculateForwardBalances, calculateReverseBalances, filterBalanceBySavings } from "@/src/lib/ledgerBalance";

// .env.local에서 Spring Boot URL을 읽어옵니다.
const SPRING_BOOT_URL = process.env.NEXT_PUBLIC_SPRING_BOOT_URL!;

export default function TransactionPage() {
  const supabase = createClient();
  const { activeQuestCode, stepIndex, quests, stopQuest } = useQuestStore();
  const fastDraftQuest = quests.find(q => q.questCode === "FAST_DRAFT");
  const isFastDraftAlreadyCompleted = fastDraftQuest?.isCompleted || fastDraftQuest?.isRewardClaimed;
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // 무한 스크롤 로더
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  // 모바일 편하게 보기(DESC) 전용 무한 스크롤 로더
  const loadMoreDescRef = useRef<HTMLDivElement | null>(null);

  // 날짜 및 뷰 모드
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"daily" | "weekly" | "monthly" | "custom">("weekly");
  const [isViewModeLoaded, setIsViewModeLoaded] = useState(false);

  // 검색
  const [searchTerm, setSearchTerm] = useState("");

  // 모바일 검색/필터 접기/펼치기 상태
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // 배너 스크롤 동기화를 위한 ref 및 상태
  const topBannerRef = useRef<HTMLDivElement>(null);
  const bottomBannerRef = useRef<HTMLDivElement>(null);
  const isSyncingTop = useRef(false);
  const isSyncingBottom = useRef(false);

  const handleTopScroll = () => {
    if (isSyncingTop.current) {
      isSyncingTop.current = false;
      return;
    }
    if (topBannerRef.current && bottomBannerRef.current) {
      isSyncingBottom.current = true;
      bottomBannerRef.current.scrollLeft = topBannerRef.current.scrollLeft;
    }
  };

  const handleBottomScroll = () => {
    if (isSyncingBottom.current) {
      isSyncingBottom.current = false;
      return;
    }
    if (topBannerRef.current && bottomBannerRef.current) {
      isSyncingTop.current = true;
      topBannerRef.current.scrollLeft = bottomBannerRef.current.scrollLeft;
    }
  };

  // 결제수단 필터
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");

  // 카테고리 필터
  const [selectedType, setSelectedType] = useState<
    "ALL" | "EXPENSE" | "INCOME"
  >("ALL");
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [selectedCategoryCodes, setSelectedCategoryCodes] = useState<string[]>([]);

  // 검색·필터 결과 모드(DECISION_013, IMPLEMENTATION_BRIEF_012 §3) — 검색어/유형/카테고리
  // 조건이 하나 이상 적용된 상태를 뜻한다. 아래 balance/transaction query들이 이 값을
  // 참조하므로 관련 filter state 바로 옆에서 먼저 계산해 둔다.
  const activeFilterCount =
    selectedCategoryIds.length +
    selectedCategoryCodes.length +
    (searchTerm.trim() ? 1 : 0) +
    (selectedType !== "ALL" ? 1 : 0);
  const hasActiveFilters = activeFilterCount > 0;

  // 검색·필터 결과의 조회 범위(DECISION_013 "조회 범위 선택지") — 일반 장부 기간과는
  // 별개의 state다. 시트를 새로 열 때 기본값은 항상 "전체 기간".
  const [appliedSearchRange, setAppliedSearchRange] = useState<SearchRange>({ mode: "all" });
  // 검색·필터 결과 모드에 처음 진입하기 직전의 일반 장부 상태 snapshot(§9 "복귀 규칙").
  // 결과 모드를 종료하거나 마지막 조건이 사라지면 이 값으로 복원한다.
  const [ledgerSnapshot, setLedgerSnapshot] = useState<{
    viewMode: "daily" | "weekly" | "monthly" | "custom";
    currentDate: Date;
    customStart: string;
    customEnd: string;
    selectedAccountId: string;
  } | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

  // 활성 탭 (거래 내역 / 나중에 분류)
  const [activeTab, setActiveTab] = useState<"transactions" | "drafts">("transactions");

  // "나중에 분류" 연속 처리 플로우 (홈의 책상 위 메모와 동일한 컴포넌트를 공유한다)
  const [isSequentialOpen, setIsSequentialOpen] = useState(false);
  const [sequentialStartIndex, setSequentialStartIndex] = useState(0);

  // 자동 탭 전환 효과 제거 (유저가 직접 나중에 분류 탭을 누르도록 유도)

  // 날짜 범위 필터
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [tempStart, setTempStart] = useState("");
  const [tempEnd, setTempEnd] = useState("");

  useEffect(() => {
    const savedMode = localStorage.getItem("transaction_view_mode");
    if (savedMode === "daily" || savedMode === "weekly" || savedMode === "monthly" || savedMode === "custom") {
      setViewMode(savedMode);
    }
    const savedStart = localStorage.getItem("transaction_custom_start");
    if (savedStart) setCustomStart(savedStart);
    const savedEnd = localStorage.getItem("transaction_custom_end");
    if (savedEnd) setCustomEnd(savedEnd);

    setIsViewModeLoaded(true);
  }, []);

  useEffect(() => {
    if (isViewModeLoaded) {
      localStorage.setItem("transaction_view_mode", viewMode);
      if (customStart) localStorage.setItem("transaction_custom_start", customStart);
      if (customEnd) localStorage.setItem("transaction_custom_end", customEnd);
    }
  }, [viewMode, customStart, customEnd, isViewModeLoaded]);

  const { userSetting, changeLedgerTheme } = useUserSettings();
  const isExcelView = userSetting?.ledgerTheme === "EXCEL";

  // lg(1024px) 미만 여부 — 기존 모바일 홈과 동일한 breakpoint(IMPLEMENTATION_BRIEF_011 §3).
  const isMobile = useIsMobileViewport();

  // 데스크톱은 검색·필터 적용이 별도 페이지로 이동하므로 위 filter state들을 절대 건드리지
  // 않는다(그래서 desktop에서는 hasActiveFilters가 항상 false다) — isMobile로 한 번 더
  // 명시적으로 가둬 결과 모드 전용 UI/쿼리 분기가 데스크톱에 영향을 주지 않게 한다.
  const isSearchResultMode = isMobile === true && hasActiveFilters;

  // 새 거래용 defaultValues
  const [modalDefaultValues, setModalDefaultValues] = useState<
    Partial<CreateTransactionPayload> | undefined
  >(undefined);

  // 수정할 거래 내역 (null이면 추가 모드)
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);

  // 상세보기 중인 거래 내역 (모바일 카드 탭 시)
  const [detailTransaction, setDetailTransaction] =
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

  // "8/17~8/23"처럼 짧은 mm/dd 범위 문자열 — 검색·필터 결과 범위 칩과 "현재 보고 있는
  // 기간" radio 라벨에 쓴다(IMPLEMENTATION_BRIEF_012 §4 예시 문구).
  const formatShortRange = (start: string, end: string) => {
    const fmt = (d: string) => {
      const [, m, day] = d.split("-");
      return `${parseInt(m, 10)}/${parseInt(day, 10)}`;
    };
    return `${fmt(start)}~${fmt(end)}`;
  };

  const currentLedgerRange = useMemo(
    () => ({ startDate, endDate, label: formatShortRange(startDate, endDate) }),
    [startDate, endDate],
  );

  // 검색·필터 결과에 실제 적용된 조회 범위 — 결과 모드가 아니면 항상 일반 장부 기간을
  // 그대로 쓴다(§6 "일반 장부: 기존 계산 날짜 전달"). ASC(데스크톱/모바일 엑셀)와
  // DESC(모바일 편하게 보기) query, 잔액 query가 모두 이 값 하나만 참조한다.
  const effectiveRange = useMemo((): { mode: "ledger" | "all" | "current" | "custom"; startDate?: string; endDate?: string } => {
    if (!isSearchResultMode) return { mode: "ledger", startDate, endDate };
    if (appliedSearchRange.mode === "all") return { mode: "all", startDate: undefined, endDate: undefined };
    return { mode: appliedSearchRange.mode, startDate: appliedSearchRange.startDate, endDate: appliedSearchRange.endDate };
  }, [isSearchResultMode, appliedSearchRange, startDate, endDate]);

  const isEffectiveRangeAll = effectiveRange.mode === "all";

  // QA_REVIEW_027 P2 — 검색·필터 결과 모드에서는 거래 후 잔액(러닝 밸런스)을 표시하지 않는다
  // (필터로 빠진 중간 거래가 있으면 부정확해지므로, §1 참고). 카드·엑셀 컴포넌트에 명시적으로
  // 내려주는 prop이다 — 값 자체가 `undefined`인 것과 별개로 "왜 안 보이는지" UI가 알 수 있게 한다.
  const showRunningBalances = !isSearchResultMode;

  // 결과 헤더의 범위 칩 문구(§8) — appliedSearchRange를 snapshot 그대로 표시한다(렌더마다
  // 일반 장부 state를 다시 참조하지 않는다, §3 "current를 적용할 때는... 값으로 복사한다").
  const searchRangeLabel = useMemo(() => {
    if (appliedSearchRange.mode === "all") return "전체 기간";
    if (appliedSearchRange.mode === "current") return `현재 기간 · ${appliedSearchRange.label}`;
    return formatShortRange(appliedSearchRange.startDate, appliedSearchRange.endDate);
  }, [appliedSearchRange]);

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

  // 저축/투자 계좌 표시 여부
  const [showSavingsAccount, setShowSavingsAccount] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("show_savings_accounts");
    if (saved !== null) {
      setShowSavingsAccount(saved === "true");
    }
  }, []);

  const handleToggleSavingsAccount = (checked: boolean) => {
    setShowSavingsAccount(checked);
    localStorage.setItem("show_savings_accounts", String(checked));
  };

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

  // 필터링된 결제수단 목록
  const filteredAccounts = useMemo(() => {
    if (showSavingsAccount) return accounts;
    return accounts.filter(a => a.type !== "SAVINGS_INVESTMENT");
  }, [accounts, showSavingsAccount]);

  // 저축·투자 계좌 id 집합 — ledgerBalance.ts의 순수 함수들이 이걸로 잔액 포함 여부를 판단한다.
  const savingsAccountIds = useMemo(
    () => new Set(accounts.filter(a => a.type === "SAVINGS_INVESTMENT").map(a => a.id)),
    [accounts],
  );

  // 선택 중인 계좌가 저축·투자 계좌인데 포함 스위치를 끄면 전체로 초기화한다(§6).
  useEffect(() => {
    if (!showSavingsAccount && selectedAccountId && savingsAccountIds.has(selectedAccountId)) {
      setSelectedAccountId("");
    }
  }, [showSavingsAccount, selectedAccountId, savingsAccountIds]);

  /* 잔액 조회 (장부 뷰) — effectiveRange를 참조하므로 결과 모드에서는 검색 범위 날짜를,
   * 아니면 일반 장부 날짜를 그대로 쓴다. "전체 기간"(isEffectiveRangeAll)에서는 의미 있는
   * 시작 시점이 없으므로 아예 호출하지 않는다(DECISION_013 금지 사항 "전체 기간에
   * opening balance API 호출"). */
  const { data: openingBalance, isLoading: isOpeningLoading, isError: isOpeningError, refetch: refetchOpening } = useQuery({
    queryKey: ["openingBalance", effectiveRange.startDate ?? "", selectedAccountId],
    queryFn: () => getOpeningBalance(effectiveRange.startDate ?? "", selectedAccountId),
    enabled: !isEffectiveRangeAll,
  });

  const { data: closingBalance, isLoading: isClosingLoading, isError: isClosingError, refetch: refetchClosing } = useQuery({
    queryKey: ["closingBalance", effectiveRange.endDate ?? "", selectedAccountId],
    queryFn: () => getClosingBalance(effectiveRange.endDate ?? "", selectedAccountId),
    enabled: !isEffectiveRangeAll,
  });

  // 필터링된 시작 잔액(저축·투자 제외 반영) — ledgerBalance.ts로 뺀 순수 함수 재사용.
  const filteredOpeningBalance = useMemo(
    () => filterBalanceBySavings(openingBalance, showSavingsAccount, savingsAccountIds),
    [openingBalance, showSavingsAccount, savingsAccountIds],
  );

  // 필터링된 기말 잔액
  const filteredClosingBalance = useMemo(
    () => filterBalanceBySavings(closingBalance, showSavingsAccount, savingsAccountIds),
    [closingBalance, showSavingsAccount, savingsAccountIds],
  );

  /* 결제수단별 "현재" 잔액 조회 — "전체 기간" 검색 결과의 유일한 잔액 출처다(§7 "기존
   * getDashboardBalances()가 현재 계좌별 breakdown을 제공한다면 이를 재사용"). 날짜와
   * 무관하게 항상 지금 시점의 실제 잔액이라 opening 개념 자체가 필요 없다. */
  const {
    data: balanceData,
    isLoading: isBalanceLoading,
    isError: isBalanceError,
    refetch: refetchBalanceData,
  } = useQuery({
    queryKey: ["dashboardBalances"],
    queryFn: () => getDashboardBalances(),
    retry: false,
  });

  const dashboardBalanceAsBalanceRes = useMemo<BalanceRes | undefined>(() => {
    if (!balanceData) return undefined;
    return {
      totalAmount: balanceData.totalBalance,
      accounts: balanceData.paymentMethods.map((p) => ({ accountId: p.accountId, amount: p.balance })),
    };
  }, [balanceData]);

  /* 잔액 선반(모바일 전용) — selectedAccountId로 이미 범위가 좁혀진 openingBalance/closingBalance와
   * 달리, 선반은 항상 "전체 결제수단" 기준의 개별 계좌 breakdown이 필요하다. selectedAccountId가
   * 비어있을 때는 위 openingBalance/closingBalance가 이미 전체 breakdown이라 그대로 재사용하고,
   * 특정 계좌가 선택된 경우에만 별도로 "전체" 잔액을 조회한다(불필요한 중복 호출 방지).
   * "전체 기간"에서는 이 두 query도 필요 없다 — dashboardBalanceAsBalanceRes가 이미 전체
   * 계좌 breakdown이라 그대로 재사용한다. */
  const needsShelfAllAccountsQuery = isMobile === true && selectedAccountId !== "" && !isEffectiveRangeAll;

  const { data: shelfOpeningAll, isLoading: isShelfOpeningAllLoading, isError: isShelfOpeningAllError, refetch: refetchShelfOpeningAll } = useQuery({
    queryKey: ["openingBalance", effectiveRange.startDate ?? "", ""],
    queryFn: () => getOpeningBalance(effectiveRange.startDate ?? "", ""),
    enabled: needsShelfAllAccountsQuery,
  });
  const { data: shelfClosingAll, isLoading: isShelfClosingAllLoading, isError: isShelfClosingAllError, refetch: refetchShelfClosingAll } = useQuery({
    queryKey: ["closingBalance", effectiveRange.endDate ?? "", ""],
    queryFn: () => getClosingBalance(effectiveRange.endDate ?? "", ""),
    enabled: needsShelfAllAccountsQuery,
  });

  const shelfOpeningBalanceRaw = isEffectiveRangeAll ? undefined : (selectedAccountId === "" ? openingBalance : shelfOpeningAll);
  const shelfClosingBalanceRaw = isEffectiveRangeAll ? dashboardBalanceAsBalanceRes : (selectedAccountId === "" ? closingBalance : shelfClosingAll);
  const isShelfLoading = isEffectiveRangeAll
    ? isBalanceLoading
    : (selectedAccountId === "" ? (isOpeningLoading || isClosingLoading) : (isShelfOpeningAllLoading || isShelfClosingAllLoading));
  const isShelfError = isEffectiveRangeAll
    ? isBalanceError
    : (selectedAccountId === "" ? (isOpeningError || isClosingError) : (isShelfOpeningAllError || isShelfClosingAllError));
  const retryShelf = () => {
    if (isEffectiveRangeAll) {
      refetchBalanceData();
      return;
    }
    if (selectedAccountId === "") {
      refetchOpening();
      refetchClosing();
    } else {
      refetchShelfOpeningAll();
      refetchShelfClosingAll();
    }
  };

  const shelfOpeningBalance = useMemo(
    () => filterBalanceBySavings(typeof shelfOpeningBalanceRaw === "number" ? undefined : shelfOpeningBalanceRaw, showSavingsAccount, savingsAccountIds),
    [shelfOpeningBalanceRaw, showSavingsAccount, savingsAccountIds],
  );
  const shelfClosingBalance = useMemo(
    () => filterBalanceBySavings(typeof shelfClosingBalanceRaw === "number" ? undefined : shelfClosingBalanceRaw, showSavingsAccount, savingsAccountIds),
    [shelfClosingBalanceRaw, showSavingsAccount, savingsAccountIds],
  );

  // NOTE(QA_REVIEW_027 P1): 검색·필터 결과 모드에서는 거래 후 잔액을 아예 계산하지 않는다
  // (아래 `transactions`/`mobileEasyTransactions`) — 그래서 여기서 "전체 기간 결과 모드의
  // DESC 역산 seed"로 쓰던 `filteredDashboardBalance`는 더 이상 필요 없다. 잔액 선반은
  // `dashboardBalanceAsBalanceRes`(저축 필터 전 raw 값)를 직접 쓰고 `shelfClosingBalance`
  // useMemo가 그 필터를 적용한다 — 중복 계산이라 제거했다.

  type TransactionCursor = {
    cursorDate: string | null;
    cursorSortOrder: number | null;
  };

  // 모바일 "편하게 보기"(최신순)만 DESC를 쓰고, 데스크톱과 엑셀 장부(모바일 포함)는 기존
  // ASC를 그대로 쓴다(IMPLEMENTATION_BRIEF_011 §7 "API 요청부터 DESC로 받아야 한다").
  // 두 query 모두 key에 정렬 방향을 포함해 다른 방향의 캐시가 섞이지 않게 한다
  // (§7 "동일 query key 사용 금지"). 다만 첫 세그먼트는 그대로 "transactions"로 유지한다 —
  // `GlobalQuickAdd`/`SearchPage`/`useDraftClassification` 등 여러 곳이
  // `invalidateQueries({queryKey:["transactions"]})`로 접두사 매칭 무효화를 걸어두고 있어서,
  // 첫 세그먼트를 바꾸면(예: "transactions-asc") 그 무효화가 이 query를 더 이상 찾지 못한다.
  const isMobileEasyView = isMobile === true && !isExcelView;

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isTransactionsLoading,
    isError: isTransactionsError,
    error: transactionsError,
  } = useInfiniteQuery({
    queryKey: ["transactions", "ASC", searchTerm, selectedCategoryIds, selectedCategoryCodes, selectedAccountId, effectiveRange.mode, effectiveRange.startDate, effectiveRange.endDate],
    enabled: !isMobileEasyView,
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
        startDate: effectiveRange.startDate,
        endDate: effectiveRange.endDate,
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

  const {
    data: descData,
    fetchNextPage: fetchNextDescPage,
    hasNextPage: hasNextDescPage,
    isFetchingNextPage: isFetchingNextDescPage,
    isLoading: isDescTransactionsLoading,
    isError: isDescTransactionsError,
    error: descTransactionsError,
    refetch: refetchDescTransactions,
  } = useInfiniteQuery({
    queryKey: ["transactions", "DESC", searchTerm, selectedCategoryIds, selectedCategoryCodes, selectedAccountId, effectiveRange.mode, effectiveRange.startDate, effectiveRange.endDate],
    enabled: isMobileEasyView,
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
        startDate: effectiveRange.startDate,
        endDate: effectiveRange.endDate,
        size: 20,
        sortDirection: "DESC",
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

  // LedgerTable(ASC/엑셀)에 넘길 실제 거래 배열 추출
  const rawTransactions = useMemo(() => data?.pages.flatMap((page) => page.content) ?? [], [data]);
  // 모바일 편하게 보기(DESC)에 넘길 실제 거래 배열 추출
  const rawTransactionsDesc = useMemo(() => descData?.pages.flatMap((page) => page.content) ?? [], [descData]);

  const balanceCalcOptions = useMemo(
    () => ({ selectedAccountId, showSavingsAccount, savingsAccountIds }),
    [selectedAccountId, showSavingsAccount, savingsAccountIds],
  );

  // 잔액 누적 계산(ASC 정방향) — ledgerBalance.ts로 뺀 순수 함수. 동작은 이전과 동일하다.
  //
  // QA_REVIEW_027 P1: `calculateForwardBalances`/`calculateReverseBalances`는 전달받은 배열이
  // 그 기간의 "모든" 거래라는 전제에서만 정확하다. 검색·필터 결과 모드(`isSearchResultMode`)의
  // `rawTransactions`는 검색어/카테고리/유형으로 걸러진 "일부" 거래라 중간에 빠진 거래가
  // 있으면 러닝 밸런스가 실제 장부와 달라진다 — opening/closing seed가 맞아도 소용없다. 그래서
  // 결과 모드에서는 계산 함수를 아예 호출하지 않고 원본 거래를 그대로 반환한다(가짜 값을 만든
  // 뒤 UI에서만 가리는 대신, 데이터 자체에 `runningTotalBalance` 등을 넣지 않는다 — 아래
  // `MobileTransactionCard`/`LedgerRow`의 `showRunningBalances` prop이 이를 명시적으로 감춘다).
  // "전체 기간"(isEffectiveRangeAll)은 항상 결과 모드에서만 나오는 값이라(§ effectiveRange
  // 정의) 이 분기가 먼저 걸려 자연히 처리된다 — 별도 0-seed 분기가 더 이상 필요 없다.
  const transactions = useMemo(() => {
    if (rawTransactions.length === 0) return rawTransactions;
    if (isSearchResultMode) return rawTransactions;
    if (!openingBalance) return rawTransactions;
    const openingTotal = filteredOpeningBalance?.totalAmount ?? 0;
    return calculateForwardBalances(openingTotal, openingBalance.accounts ?? [], rawTransactions, balanceCalcOptions);
  }, [rawTransactions, openingBalance, filteredOpeningBalance, balanceCalcOptions, isSearchResultMode]);

  // 잔액 역산(DESC 역방향) — 모바일 편하게 보기 전용. 종료 잔액에서 최신 거래부터 되돌린다.
  // 위와 같은 이유로 검색·필터 결과 모드에서는 계산하지 않는다.
  const mobileEasyTransactions = useMemo(() => {
    if (rawTransactionsDesc.length === 0) return rawTransactionsDesc;
    if (isSearchResultMode) return rawTransactionsDesc;
    if (!closingBalance) return rawTransactionsDesc;
    const closingTotal = filteredClosingBalance?.totalAmount ?? 0;
    return calculateReverseBalances(closingTotal, closingBalance.accounts ?? [], rawTransactionsDesc, balanceCalcOptions);
  }, [rawTransactionsDesc, closingBalance, filteredClosingBalance, balanceCalcOptions, isSearchResultMode]);

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

  /* 무한 스크롤 — 모바일 편하게 보기(DESC) 전용. 위 ASC observer와 별개의 sentinel을 본다. */
  useEffect(() => {
    const target = loadMoreDescRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (
          first.isIntersecting &&
          hasNextDescPage &&
          !isFetchingNextDescPage &&
          !isDescTransactionsLoading
        ) {
          fetchNextDescPage();
        }
      },
      { root: null, rootMargin: "200px", threshold: 0 },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [fetchNextDescPage, hasNextDescPage, isFetchingNextDescPage, isDescTransactionsLoading]);

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
      queryClient.invalidateQueries({ queryKey: ["drafts"] });
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

  // "나중에 분류" 연속 처리 플로우 열기 (특정 항목부터 시작)
  const handleOpenSequentialFlow = (draft: DraftTransaction) => {
    const idx = drafts.findIndex((d) => d.id === draft.id);
    setSequentialStartIndex(idx >= 0 ? idx : 0);
    setIsSequentialOpen(true);
  };

  // 모달 닫기(새 props 방식)
  const handleOpenChange = useCallback((open: boolean) => {
    setIsModalOpen(open);
    if (!open) {
      setEditingTransaction(null);
      setModalDefaultValues(undefined);
    }
  }, []);

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

  // 모바일/데스크톱 계산에 쓰는 파생값 — isMobile 분기와 무관하게 항상 계산한다(Hooks 규칙).
  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);
  // 오늘이 조회 기간에 포함되면 "현재", 완전히 지난 기간이면 "종료"(DECISION_012 "잔액 문구").
  // 결과 모드에서는 effectiveRange(검색 범위)를 기준으로 판단한다.
  const showCurrentLabel =
    todayStr >= (effectiveRange.startDate ?? startDate) && todayStr <= (effectiveRange.endDate ?? endDate);

  // 검색·필터 결과 모드 종료(DECISION_013 §9 "종료·복원") — 조건을 모두 비우고 조회 범위를
  // 초기화한 뒤, 진입 전 snapshot이 있으면 일반 장부 상태를 그대로 되돌린다. 결제수단
  // 선택도 결과 탐색용 임시 상태로 보고 함께 복원한다.
  const exitSearchResultMode = useCallback(() => {
    setSearchTerm("");
    setSelectedType("ALL");
    setSelectedCategoryIds([]);
    setSelectedCategoryCodes([]);
    setAppliedSearchRange({ mode: "all" });
    if (ledgerSnapshot) {
      setViewMode(ledgerSnapshot.viewMode);
      setCurrentDate(ledgerSnapshot.currentDate);
      setCustomStart(ledgerSnapshot.customStart);
      setCustomEnd(ledgerSnapshot.customEnd);
      setSelectedAccountId(ledgerSnapshot.selectedAccountId);
    }
    setLedgerSnapshot(null);
  }, [ledgerSnapshot]);

  // 모바일 상단 활성 필터 칩(QA_REVIEW_024 §4, DECISION_013 §8) — 최대 3개까지만 노출하고,
  // 각 칩은 그 필터만 개별 해제한다. 단, 그 칩을 지우면 남는 조건이 0개가 되는 경우(=마지막
  // 조건 제거)라면 결과 모드 전체를 종료해 snapshot을 복원한다(§9 "마지막 검색·필터 조건이
  // 제거되면 결과 모드를 종료"). count 배지는 `activeFilterCount` 전체 값을 그대로 쓴다.
  const activeFilterChips = useMemo(() => {
    const chips: { key: string; label: string; onRemove: () => void }[] = [];
    const makeRemove = (clear: () => void, ownCount: number) => () => {
      if (isSearchResultMode && activeFilterCount - ownCount <= 0) {
        exitSearchResultMode();
      } else {
        clear();
      }
    };
    if (searchTerm.trim()) {
      chips.push({ key: "search", label: `"${searchTerm.trim()}"`, onRemove: makeRemove(() => setSearchTerm(""), 1) });
    }
    if (selectedType !== "ALL") {
      chips.push({
        key: "type",
        label: selectedType === "INCOME" ? "수입만" : "지출만",
        onRemove: makeRemove(() => setSelectedType("ALL"), 1),
      });
    }
    if (selectedCategoryIds.length > 0) {
      chips.push({
        key: "categories",
        label: `카테고리 ${selectedCategoryIds.length}개`,
        onRemove: makeRemove(() => setSelectedCategoryIds([]), selectedCategoryIds.length),
      });
    }
    if (selectedCategoryCodes.length > 0) {
      chips.push({
        key: "codes",
        label: `이체·저축 등 ${selectedCategoryCodes.length}개`,
        onRemove: makeRemove(() => setSelectedCategoryCodes([]), selectedCategoryCodes.length),
      });
    }
    return chips.slice(0, 3);
  }, [searchTerm, selectedType, selectedCategoryIds, selectedCategoryCodes, isSearchResultMode, activeFilterCount, exitSearchResultMode]);

  // 기간 시작 잔액 북마크 라벨 — 결과 모드에서는 effectiveRange(검색 범위)의 시작일을 쓴다.
  // "전체 기간"은 어차피 hideOpeningBookmark로 아예 감춰지므로 값 자체는 의미가 없다.
  const openingBalanceDateLabel = useMemo(() => {
    const base = effectiveRange.startDate ?? startDate;
    const [, m, d] = base.split("-");
    return `${parseInt(m, 10)}월 ${parseInt(d, 10)}일`;
  }, [effectiveRange.startDate, startDate]);

  // isMobile 판별 전에는 모바일/데스크톱 어느 트리도 마운트하지 않는다 — 잘못된 쪽으로
  // 확정 짓고 렌더하면 QA_REVIEW_020 P1-1과 같은 문제(반대쪽 화면이 잠깐 보이는 것)가
  // 재발한다. `TransactionPageSkeleton`은 query 없이 마크업만 그리므로 그대로 재사용한다.
  if (isMobile === null || isInitialLoading) {
    return <TransactionPageSkeleton />;
  }
  return (
    <>
      <div className="w-full flex justify-center pb-4 lg:pb-0 bg-gray-50 min-h-screen">
        <div className="w-full max-w-[1920px] mx-auto flex flex-col gap-3 sm:gap-4 lg:p-6 px-1 py-4 sm:p-4">
          {/* --- 뷰 컨트롤 툴바 --- */}
          <section className="flex flex-col xl:flex-row gap-2 xl:items-center xl:justify-between bg-white p-2 md:p-4 shadow-sm -mx-4 w-[calc(100%+2rem)] lg:mx-0 lg:w-full rounded-none lg:rounded-xl border-y border-x-0 lg:border border-gray-200">
            {activeTab === "transactions" ? (
              <>
                {/* 좌측: 날짜 선택 — 모바일에서는 MobileLedgerToolbar가 이 역할을 대신한다
                    (IMPLEMENTATION_BRIEF_011 §5). isMobile은 이미 확정된 뒤라(위에서
                    null이면 return) 안전하게 조건부로 감출 수 있다. */}
                {!isMobile && (
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
                )}

                {/* 우측: 검색뷰 전환, 임시보관함 전환, 새 거래 추가.
                    "나중에 분류" 진입점(tutorial-draft-tab)은 모바일에서도 그대로 유지한다 —
                    FAST_DRAFT 튜토리얼 4단계가 이 id를 그대로 찾는다. */}
                <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto justify-end">
                  {!isMobile && (
                    <button
                      onClick={() => setIsSearchModalOpen(true)}
                      className="flex items-center gap-1 md:gap-1.5 px-2.5 md:px-4 py-1.5 md:py-2 rounded-lg text-[11px] md:text-sm font-semibold bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                    >
                      <span className="text-xs md:text-base">🔍</span> 거래내역 검색
                    </button>
                  )}

                  {drafts.length > 0 && (
                    <button
                      id="tutorial-draft-tab"
                      onClick={() => {
                        setActiveTab("drafts");
                        if (activeQuestCode === "FAST_DRAFT" && stepIndex === 4) {
                          useQuestStore.getState().nextStep();
                        }
                      }}
                      className="relative flex items-center gap-1 md:gap-1.5 px-2.5 md:px-4 py-1.5 md:py-2 rounded-lg text-[11px] md:text-sm font-semibold transition-colors bg-white border border-ll-tomato/40 text-ll-tomato hover:bg-ll-tomato/10"
                    >
                      <span className="text-xs md:text-base">📝</span> 나중에 분류
                      <span className="inline-flex items-center justify-center min-w-[16px] h-[16px] md:min-w-[18px] md:h-[18px] px-1 rounded-full bg-ll-tomato text-white text-[10px] md:text-[11px] font-bold">
                        {drafts.length}
                      </span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setEditingTransaction(null);
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
                {/* 나중에 분류 탭 툴바 */}
                <div className="flex items-center gap-2 md:gap-3 w-full">
                  <button
                    onClick={() => setActiveTab("transactions")}
                    className="p-1.5 md:p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors focus:outline-none"
                    aria-label="장부 뷰로 돌아가기"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <span className="text-xl">📝</span>
                  <h1 className="text-lg font-bold text-gray-900">나중에 분류</h1>
                  <span className="px-2 py-0.5 rounded-full bg-ll-tomato/15 text-ll-tomato text-[11px] md:text-xs font-bold">{drafts.length}건</span>

                  {drafts.length > 0 && (
                    <button
                      onClick={() => {
                        setSequentialStartIndex(0);
                        setIsSequentialOpen(true);
                      }}
                      className="ml-auto min-h-[36px] rounded-full bg-ll-ink px-3.5 py-1.5 text-xs font-bold text-ll-paper hover:bg-ll-ink/90 md:text-sm"
                    >
                      하나씩 정리
                    </button>
                  )}
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

              {!isMobile ? (
                <>
                  <div className="flex flex-col shadow-md bg-white border border-gray-100 -mx-4 w-[calc(100%+2rem)] lg:mx-0 lg:w-full rounded-none lg:rounded-xl border-x-0 lg:border-x">
                    <div className="flex items-center justify-end px-4 py-2 border-b border-gray-100 bg-gray-50/50">
                      <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={showSavingsAccount}
                          onChange={(e) => handleToggleSavingsAccount(e.target.checked)}
                          className="w-4 h-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500"
                        />
                        저축/투자 계좌 포함
                      </label>
                    </div>
                    <div className="sticky top-0 z-40 bg-white">
                      <LedgerTopBanner
                        balanceData={typeof filteredOpeningBalance !== "number" ? filteredOpeningBalance : undefined}
                        isLoading={isOpeningLoading}
                        accounts={filteredAccounts}
                        selectedAccountId={selectedAccountId}
                        onSelectAccount={setSelectedAccountId}
                        scrollRef={topBannerRef}
                        onScroll={handleTopScroll}
                      />
                    </div>

                    <LedgerTable
                      transactions={transactions}
                      loading={isTransactionsLoading && !isFetchingNextPage}
                      error={pageError?.message || null}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onReorder={handleReorder}
                      onViewDetail={setDetailTransaction}
                      currentAccountId={selectedAccountId}
                      isExcelView={isExcelView}
                      openingBalanceAmount={typeof filteredOpeningBalance === "number" ? filteredOpeningBalance : (filteredOpeningBalance?.totalAmount ?? 0)}
                    />

                    <div className="sticky bottom-0 z-40 bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                      <LedgerBottomBanner
                        balanceData={typeof filteredClosingBalance !== "number" ? filteredClosingBalance : undefined}
                        isLoading={isClosingLoading}
                        accounts={filteredAccounts}
                        selectedAccountId={selectedAccountId}
                        onSelectAccount={setSelectedAccountId}
                        scrollRef={bottomBannerRef}
                        onScroll={handleBottomScroll}
                      />
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
              ) : (
                <MobileTransactionView
                  onOpenSearchFilter={() => setIsSearchModalOpen(true)}
                  activeFilterCount={activeFilterCount}
                  activeFilterChips={activeFilterChips}
                  isSearchResultMode={isSearchResultMode}
                  searchRangeLabel={searchRangeLabel}
                  isExcelView={isExcelView}
                  onChangeIsExcelView={(isExcel) => changeLedgerTheme(isExcel ? "EXCEL" : "DEFAULT")}
                  viewMode={viewMode}
                  onChangeViewMode={(mode) => {
                    setViewMode(mode);
                    if (mode === "custom") setShowDatePicker(true);
                    else setShowDatePicker(false);
                  }}
                  dateDisplayString={dateDisplayString}
                  onPrev={handlePrevious}
                  onNext={handleNext}
                  filteredAccounts={filteredAccounts}
                  shelfOpeningBalance={shelfOpeningBalance}
                  shelfClosingBalance={shelfClosingBalance}
                  isShelfLoading={isShelfLoading}
                  isShelfError={isShelfError}
                  onRetryShelf={retryShelf}
                  selectedAccountId={selectedAccountId}
                  onSelectAccount={setSelectedAccountId}
                  showSavingsAccount={showSavingsAccount}
                  onToggleSavings={handleToggleSavingsAccount}
                  showCurrentLabel={showCurrentLabel}
                  hideOpeningBalance={isEffectiveRangeAll}
                  balanceNotice={isEffectiveRangeAll ? "잔액은 검색 조건과 무관한 실제 계좌 잔액이에요" : undefined}
                  easyTransactions={mobileEasyTransactions}
                  isEasyLoading={isDescTransactionsLoading && !isFetchingNextDescPage}
                  isEasyError={isDescTransactionsError}
                  easyErrorMessage={(descTransactionsError as Error | null)?.message}
                  onRetryEasy={() => refetchDescTransactions()}
                  hasActiveFilters={hasActiveFilters}
                  onResetFilters={exitSearchResultMode}
                  onViewDetail={setDetailTransaction}
                  loadMoreRef={loadMoreDescRef}
                  hasNextPage={!!hasNextDescPage}
                  isFetchingNextPage={isFetchingNextDescPage}
                  openingBalanceAmount={typeof filteredOpeningBalance === "number" ? filteredOpeningBalance : filteredOpeningBalance?.totalAmount}
                  openingBalanceDate={openingBalanceDateLabel}
                  hideOpeningBookmark={isEffectiveRangeAll}
                  showRunningBalances={showRunningBalances}
                  excelTransactions={transactions}
                  isExcelLoading={isTransactionsLoading && !isFetchingNextPage}
                  excelErrorMessage={pageError?.message || null}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onReorder={handleReorder}
                  excelOpeningBalanceAmount={typeof filteredOpeningBalance === "number" ? filteredOpeningBalance : (filteredOpeningBalance?.totalAmount ?? 0)}
                />
              )}
            </>
          )}

          {activeTab === "drafts" && (
            <DraftInbox
              drafts={drafts}
              isLoading={isDraftsLoading}
              onOpenDraft={handleOpenSequentialFlow}
              onDeleteDraft={handleDelete}
            />
          )}
        </div>
      </div>

      {/* FAST_DRAFT 커스텀 튜토리얼 완료 모달 */}
      {activeQuestCode === "FAST_DRAFT" && stepIndex === 5 && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-2xl shadow-2xl p-6 md:p-8 max-w-sm w-full flex flex-col items-center text-center animate-in zoom-in-95 duration-300">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
              <span className="text-4xl">🎉</span>
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">튜토리얼 완료!</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              나중에 분류에 들어왔습니다!<br/>
              여기서 상세 내용을 마저 적으면<br/>
              <span className="font-semibold text-emerald-600">실제 거래 내역으로 등록</span>됩니다.
            </p>
            {isFastDraftAlreadyCompleted ? (
              <button
                onClick={() => {
                  useQuestStore.getState().stopQuest();
                }}
                className="w-full py-3.5 bg-gray-500 hover:bg-gray-600 text-white font-bold rounded-xl shadow-lg transition-all active:scale-95"
              >
                닫기
              </button>
            ) : (
              <button
                onClick={async () => {
                  try {
                    await completeQuest("FAST_DRAFT");
                    await claimQuestReward("FAST_DRAFT");
                    queryClient.invalidateQueries({ queryKey: ["quests"] });
                    queryClient.invalidateQueries({ queryKey: ["me"] }); // 포인트 갱신을 위해 me 조회 무효화
                    useQuestStore.getState().stopQuest();
                    toast.success("빠른 추가 튜토리얼 완료! 포인트를 획득했습니다.");
                  } catch (e) {
                    console.error(e);
                    toast.error("미션 보상 수령 중 오류가 발생했습니다.");
                  }
                }}
                className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/30 transition-all active:scale-95"
              >
                미션 완료하고 포인트 받기!
              </button>
            )}
          </div>
        </div>
      )}

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

      {/* "나중에 분류" 연속 처리 플로우 (나중에 분류 탭 + 개별 항목 클릭이 공유) */}
      <SequentialCategorizer
        open={isSequentialOpen}
        onOpenChange={setIsSequentialOpen}
        drafts={drafts}
        startIndex={sequentialStartIndex}
        categories={rawCategories}
        accounts={accounts}
      />

      {/* 거래 상세보기 모달 (모바일 카드 탭) */}
      <TransactionDetailModal
        transaction={detailTransaction}
        open={!!detailTransaction}
        onOpenChange={(open) => !open && setDetailTransaction(null)}
        onEdit={(t) => {
          setDetailTransaction(null);
          handleEdit(t);
        }}
        onDelete={(id) => {
          setDetailTransaction(null);
          handleDelete(id);
        }}
        currentAccountId={selectedAccountId}
      />

      {/* 검색 바텀 시트 — 모바일은 같은 화면 state를 직접 갱신하고(QA_REVIEW_024 §4 권장안),
          데스크톱은 기존처럼 별도 검색 결과 페이지로 이동한다(동작 변경 없음). 모바일은
          `mobileSearchRange`/`currentLedgerRange`를 넘겨 조회 범위 radio group을 쓴다
          (DECISION_013, IMPLEMENTATION_BRIEF_012 §4) — QA_REVIEW_025 대응으로 썼던
          `hideDateRange`(기간 UI를 그냥 숨기는 임시 구조)는 제거했다. */}
      <SearchFilterBottomSheet
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        accounts={accounts}
        rawCategories={rawCategories}
        hideAccountSelect={isMobile === true}
        applyButtonLabel={isMobile === true ? "필터 적용" : "검색 결과 보기"}
        mobileSearchRange={isMobile === true ? (isSearchResultMode ? appliedSearchRange : { mode: "all" }) : undefined}
        currentLedgerRange={isMobile === true ? currentLedgerRange : undefined}
        initialFilters={
          isMobile === true
            ? {
                searchTerm,
                selectedType,
                selectedCategoryIds,
                selectedCategoryCodes,
              }
            : undefined
        }
        onApply={(filters, mobileRange) => {
          if (isMobile) {
            // 모바일: 같은 화면의 ASC/DESC query가 바로 갱신되도록 기존 state를 직접 바꾼다.
            // 결제수단은 잔액 선반이 기본 선택기이므로(시트의 select는 hideAccountSelect로
            // 숨겼다) selectedAccountId는 건드리지 않는다(§7 "결제수단 선택은 검색 조건으로
            // 계산하지 않는다").
            const willHaveActiveFilters =
              filters.searchTerm.trim() !== "" ||
              filters.selectedType !== "ALL" ||
              filters.selectedCategoryIds.length > 0 ||
              filters.selectedCategoryCodes.length > 0;

            if (!willHaveActiveFilters) {
              // 검색 조건이 전혀 없으면 범위만으로 결과 모드에 진입하지 않는다(§5). 이미
              // 결과 모드였다면 마지막 조건이 사라진 것과 같으므로 완전히 종료한다.
              if (isSearchResultMode) exitSearchResultMode();
              return;
            }

            // 처음 진입할 때만 일반 장부 상태를 snapshot으로 저장한다(§9 "복귀 규칙").
            if (!isSearchResultMode) {
              setLedgerSnapshot({ viewMode, currentDate, customStart, customEnd, selectedAccountId });
            }

            setSearchTerm(filters.searchTerm);
            setSelectedType(filters.selectedType);
            setSelectedCategoryIds(filters.selectedCategoryIds);
            setSelectedCategoryCodes(filters.selectedCategoryCodes);
            if (mobileRange) setAppliedSearchRange(mobileRange);
            return;
          }

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

          window.location.href = `/home/transactions/search?${params.toString()}`;
        }}
      />
    </>
  );
}
