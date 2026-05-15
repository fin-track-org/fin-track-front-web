"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import MonthSelector from "./section/MonthSelector";
import SummaryCards from "./section/SummaryCards";
import BalanceChart from "./section/BalanceChart";
import CategoryChart from "./section/CategoryChart";
import BudgetBar from "./section/BudgetBar";
import RecentTransactions from "./section/RecentTransactions";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DashboardSkeleton from "../../skeleton/DashboardSkeleton";
import { useRouter } from "next/navigation";
import { formatMonth } from "@/src/utils/date";
import { getDashboardSummary } from "@/src/lib/api/dashboard/summary";
import { getDashboardDaily } from "@/src/lib/api/dashboard/daily";
import { getCategories } from "@/src/lib/api/categoryApi";
import { getDashboardExpenseCategory } from "@/src/lib/api/dashboard/pie";
import { AuthError } from "@/src/lib/api/authError";
import { getRecentTransactions } from "@/src/lib/api/dashboard/recent";
import { quickAddTransaction } from "@/src/lib/api/transaction/transactions";
import { Plus, X } from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // 날짜
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // 빠른 추가 모달
  const [isQuickModalOpen, setIsQuickModalOpen] = useState(false);
  const [quickDate, setQuickDate] = useState("");
  const [quickAmount, setQuickAmount] = useState("");
  const [quickDescription, setQuickDescription] = useState("");
  const [quickError, setQuickError] = useState("");
  const descriptionRef = useRef<HTMLInputElement>(null);

  const openQuickModal = () => {
    setQuickDate(new Date().toISOString().split("T")[0]);
    setQuickAmount("");
    setQuickDescription("");
    setQuickError("");
    setIsQuickModalOpen(true);
  };

  const { mutate: submitQuick, isPending: isQuickPending } = useMutation({
    mutationFn: quickAddTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drafts"] });
      queryClient.invalidateQueries({ queryKey: ["recentTransactions"] });
      setIsQuickModalOpen(false);
    },
    onError: (err: Error) => {
      setQuickError(err.message);
    },
  });

  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = Number(quickAmount.replace(/,/g, ""));
    if (!quickDate) return setQuickError("날짜를 선택해주세요.");
    if (!quickAmount || isNaN(parsed) || parsed <= 0)
      return setQuickError("금액을 올바르게 입력해주세요.");
    setQuickError("");
    submitQuick({ date: quickDate, amount: parsed, description: quickDescription });
  };

  // 선택한 날짜 0000-00 형태 변경 포맷 유틸
  const selectedMonth = useMemo(
    () => formatMonth(currentMonth),
    [currentMonth],
  );

  const [viewType, setViewType] = useState<"chart" | "table">("chart");

  /* 카테고리 조회 api */
  const { data: rawCategories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: () => getCategories(),
  });

  /* Summary 요약 내용 */
  const {
    data: summary,
    isLoading: isSummaryLoading,
    isError: isSummaryError,
    error: summaryError,
  } = useQuery({
    queryKey: ["dashboardSummary", selectedMonth],
    queryFn: () => getDashboardSummary(selectedMonth),
    retry: false,
  });

  /* 자산 변화 차트 */
  const {
    data: dailyData = [],
    isLoading: isDailyLoading,
    isError: isDailyError,
    error: dailyError,
  } = useQuery({
    queryKey: ["dashboardDaily", selectedMonth],
    queryFn: () => getDashboardDaily(selectedMonth),
    retry: false,
  });

  /* 카테고리 파이 차트 */
  const {
    data: expenseCategoryData = [],
    isLoading: isExpenseCategoryLoading,
    isError: isExpenseCategoryError,
    error: expenseCategoryError,
  } = useQuery({
    queryKey: ["dashboardExpenseCategory", selectedMonth],
    queryFn: () => getDashboardExpenseCategory(selectedMonth),
    retry: false,
  });

  /* 카테고리 colorCode 매핑 */
  const categoryColorByName = useMemo(() => {
    return Object.fromEntries(rawCategories.map((c) => [c.name, c.colorCode]));
  }, [rawCategories]);

  /* 파이 데이터 매핑 */
  const pieData = expenseCategoryData.map((item) => ({
    name: item.category,
    value: item.amount,
    percentage: item.percentage,
    color: categoryColorByName[item.category] ?? "#9ca3af",
  }));

  /* 최근 거래 내역 */
  const { data: recentTransactions = [] } = useQuery({
    queryKey: ["recentTransactions"],
    queryFn: () => getRecentTransactions(10),
  });

  /* 다음 달 이동 버튼 */
  const handlePreviousMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1),
    );
  };

  /* 이번 달 이동 버튼 */
  const handleNextMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1),
    );
  };

  const pageIsLoading =
    isSummaryLoading || isDailyLoading || isExpenseCategoryLoading;

  const pageIsError = isSummaryError || isDailyError || isExpenseCategoryError;

  const pageError = summaryError || dailyError || expenseCategoryError;

  /* 로그인 안되어 있으면 로그인 페이지로 이동 */
  useEffect(() => {
    if (pageError instanceof AuthError) {
      router.replace("/login");
    }
  }, [pageError, router]);

  /* 로딩 */
  if (pageIsLoading) {
    return <DashboardSkeleton />;
  }

  /* 에러 */
  if (pageIsError || !summary) {
    return (
      <div className="py-12 text-center text-red-500">
        {((summaryError || dailyError || expenseCategoryError) as Error)
          ?.message ?? "오류가 발생했습니다."}
      </div>
    );
  }
  return (
    <div className="space-y-6">
      {/* 0. 월 선택 버튼 */}
      <MonthSelector
        currentMonth={currentMonth}
        onPrev={handlePreviousMonth}
        onNext={handleNextMonth}
      />

      {/* 1. 공통 요약 카드 (반응형 그리드) */}
      <SummaryCards summary={summary} />

      {/* 2. Chart */}
      <div className="flex flex-col xl:flex-row gap-6">
        {/* Left - 이번 달 자산 변화 */}
        <BalanceChart
          data={dailyData.map((d) => ({
            date: d.date.substring(5),
            income: d.income,
            expense: d.expense,
            balance: d.balance,
          }))}
        />

        {/* Right - 카테고리별 지출 */}
        <CategoryChart
          data={pieData}
          viewType={viewType}
          onChangeView={setViewType}
        />
      </div>

      {/* 3. 예산 및 소비 분석 */}
      <div className="mb-8">
        {/* 예산 Budget Bar */}
        <BudgetBar month={selectedMonth} />
      </div>

      {/* 최근 거래 내역 테이블 */}
      <RecentTransactions data={recentTransactions} />

      {/* 빠른 추가 FAB */}
      <button
        onClick={openQuickModal}
        aria-label="빠른 거래 추가"
        className="fixed bottom-6 right-6 z-40 flex items-center justify-center w-14 h-14 rounded-full bg-sky-600 text-white shadow-lg hover:bg-sky-700 active:scale-95 transition-all"
      >
        <Plus size={26} strokeWidth={2.5} />
      </button>

      {/* 빠른 추가 모달 */}
      {isQuickModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          onClick={(e) => { if (e.target === e.currentTarget) setIsQuickModalOpen(false); }}
        >
          {/* backdrop */}
          <div className="absolute inset-0 bg-black/40" />

          <div className="relative w-full sm:max-w-sm mx-auto bg-white rounded-t-2xl sm:rounded-2xl shadow-xl p-6 space-y-5">
            {/* 헤더 */}
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-800">빠른 거래 추가</h2>
              <button
                onClick={() => setIsQuickModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="닫기"
              >
                <X size={20} />
              </button>
            </div>

            <p className="text-xs text-gray-400 -mt-2">
              임시 보관함에 저장됩니다. 나중에 카테고리를 지정해 정식 내역으로 분류하세요.
            </p>

            <form onSubmit={handleQuickSubmit} className="space-y-4">
              {/* 날짜 */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">날짜</label>
                <input
                  type="date"
                  value={quickDate}
                  onChange={(e) => setQuickDate(e.target.value)}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                />
              </div>

              {/* 금액 */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">금액</label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    value={quickAmount}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^0-9]/g, "");
                      setQuickAmount(raw ? Number(raw).toLocaleString() : "");
                    }}
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">원</span>
                </div>
              </div>

              {/* 내용 */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">내용 <span className="text-gray-300">(선택)</span></label>
                <input
                  ref={descriptionRef}
                  type="text"
                  placeholder="예) 편의점, 버스요금"
                  value={quickDescription}
                  onChange={(e) => setQuickDescription(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                />
              </div>

              {quickError && (
                <p className="text-xs text-red-500">{quickError}</p>
              )}

              <button
                type="submit"
                disabled={isQuickPending}
                className="w-full bg-sky-600 text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-sky-700 transition-colors disabled:opacity-60"
              >
                {isQuickPending ? "저장 중..." : "임시 저장"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
