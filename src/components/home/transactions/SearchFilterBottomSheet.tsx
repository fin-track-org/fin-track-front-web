import { CalendarDays, ChevronDown, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";


interface SearchFilterBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  rawCategories: Category[];
  initialFilters?: {
    searchTerm?: string;
    selectedAccountId?: string;
    selectedType?: "ALL" | "EXPENSE" | "INCOME";
    selectedCategoryIds?: string[];
    selectedCategoryCodes?: string[];
    startDate?: string;
    endDate?: string;
  };
  onApply: (filters: {
    searchTerm: string;
    selectedAccountId: string;
    selectedType: "ALL" | "EXPENSE" | "INCOME";
    selectedCategoryIds: string[];
    selectedCategoryCodes: string[];
    startDate: string;
    endDate: string;
  }) => void;
}

export default function SearchFilterBottomSheet({
  isOpen,
  onClose,
  accounts,
  rawCategories,
  initialFilters,
  onApply,
}: SearchFilterBottomSheetProps) {
  const [searchTerm, setSearchTerm] = useState(initialFilters?.searchTerm || "");
  const [selectedAccountId, setSelectedAccountId] = useState(initialFilters?.selectedAccountId || "");
  const [selectedType, setSelectedType] = useState<"ALL" | "EXPENSE" | "INCOME">(initialFilters?.selectedType || "ALL");
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>(initialFilters?.selectedCategoryIds || []);
  const [selectedCategoryCodes, setSelectedCategoryCodes] = useState<string[]>(initialFilters?.selectedCategoryCodes || []);

  const [dateRangeMode, setDateRangeMode] = useState<"month" | "custom">("month");
  const [customStart, setCustomStart] = useState(initialFilters?.startDate || "");
  const [customEnd, setCustomEnd] = useState(initialFilters?.endDate || "");
  const [tempStart, setTempStart] = useState("");
  const [tempEnd, setTempEnd] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      setIsClosing(false);
      
      if (initialFilters) {
        setSearchTerm(initialFilters.searchTerm || "");
        setSelectedAccountId(initialFilters.selectedAccountId || "");
        setSelectedType(initialFilters.selectedType || "ALL");
        setSelectedCategoryIds(initialFilters.selectedCategoryIds || []);
        setSelectedCategoryCodes(initialFilters.selectedCategoryCodes || []);
        
        if (initialFilters.startDate || initialFilters.endDate) {
          setDateRangeMode("custom");
          setCustomStart(initialFilters.startDate || "");
          setCustomEnd(initialFilters.endDate || "");
        } else {
          setDateRangeMode("month");
          setCustomStart("");
          setCustomEnd("");
        }
      }
    } else if (isVisible) {
      setIsClosing(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        setIsClosing(false);
      }, 250); // wait for exit animation
      return () => clearTimeout(timer);
    }
  }, [isOpen, initialFilters, isVisible]);

  const { startDate, endDate } = useMemo(() => {
    if (dateRangeMode === "custom" && customStart && customEnd) {
      return { startDate: customStart, endDate: customEnd };
    }
    return { startDate: "", endDate: "" };
  }, [dateRangeMode, customStart, customEnd]);

  const incomeCategories = useMemo(() => {
    return rawCategories.filter(
      (c) =>
        c.type === "INCOME" &&
        c.code !== "TRANSFER_INCOME" &&
        c.code !== "SAVINGS_INCOME"
    );
  }, [rawCategories]);

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

  const handleSelectAllCategories = () => {
    setSelectedCategoryIds([]);
    setSelectedCategoryCodes([]);
    setSelectedType("ALL");
  };

  const handleSelectAllIncomeCategories = () => {
    const allIncomeIds = incomeCategories.map((c) => c.id);
    setSelectedCategoryIds(allIncomeIds);
    setSelectedCategoryCodes([]);
    setSelectedType("ALL");
  };

  const handleSelectAllExpenseCategories = () => {
    const allExpenseIds = expenseCategories.map((c) => c.id);
    setSelectedCategoryIds(allExpenseIds);
    setSelectedCategoryCodes([]);
    setSelectedType("ALL");
  };

  const handleSelectAllAssetManagementCategories = () => {
    setSelectedCategoryIds([]);
    setSelectedCategoryCodes([
      "TRANSFER_EXPENSE",
      "TRANSFER_INCOME",
      "SAVINGS_EXPENSE",
      "SAVINGS_INCOME",
      "BALANCE_ADJUST_EXPENSE",
      "BALANCE_ADJUST_INCOME",
    ]);
    setSelectedType("ALL");
  };

  const isAllCategoriesSelected =
    selectedCategoryIds.length === 0 &&
    selectedCategoryCodes.length === 0 &&
    selectedType === "ALL";

  const isAllIncomeCategoriesSelected =
    incomeCategories.length > 0 &&
    incomeCategories.every((c) => selectedCategoryIds.includes(c.id)) &&
    selectedCategoryCodes.length === 0;

  const isAllExpenseCategoriesSelected =
    expenseCategories.length > 0 &&
    expenseCategories.every((c) => selectedCategoryIds.includes(c.id)) &&
    selectedCategoryCodes.length === 0;

  const isAllAssetManagementCategoriesSelected =
    selectedCategoryIds.length === 0 &&
    [
      "TRANSFER_EXPENSE",
      "TRANSFER_INCOME",
      "SAVINGS_EXPENSE",
      "SAVINGS_INCOME",
      "BALANCE_ADJUST_EXPENSE",
      "BALANCE_ADJUST_INCOME",
    ].every((c) => selectedCategoryCodes.includes(c));

  const filteredCategories = useMemo(() => {
    if (selectedType === "ALL") return rawCategories;
    return rawCategories.filter((c) => c.type === selectedType);
  }, [rawCategories, selectedType]);

  const handleApply = () => {
    onApply({
      searchTerm,
      selectedAccountId,
      selectedType,
      selectedCategoryIds,
      selectedCategoryCodes,
      startDate,
      endDate,
    });
    onClose();
  };

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

  const handleQuickDate = (type: "this_month" | "last_month" | "this_week" | "all") => {
    if (type === "all") {
      setTempStart("");
      setTempEnd("");
      clearCustomRange();
      return;
    }

    const today = new Date();
    let start = "";
    let end = "";
    
    if (type === "this_month") {
      start = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
      end = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    } else if (type === "last_month") {
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      start = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, "0")}-01`;
      const lastDay = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0).getDate();
      end = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    } else if (type === "this_week") {
      const day = today.getDay();
      const diff = today.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(new Date().setDate(diff));
      start = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, "0")}-${String(monday.getDate()).padStart(2, "0")}`;
      const sunday = new Date(monday);
      sunday.setDate(sunday.getDate() + 6);
      end = `${sunday.getFullYear()}-${String(sunday.getMonth() + 1).padStart(2, "0")}-${String(sunday.getDate()).padStart(2, "0")}`;
    }
    
    setTempStart(start);
    setTempEnd(end);
  };

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!isVisible || !mounted) return null;

  return createPortal(
    <div className={`fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm ${isClosing ? 'animate-fade-out-overlay' : 'animate-fade-in-overlay'}`} onClick={onClose}>
      <div 
        onClick={(e) => e.stopPropagation()}
        className={`absolute bottom-0 left-0 right-0 sm:left-1/2 sm:-translate-x-1/2 bg-white w-full sm:max-w-2xl sm:rounded-2xl rounded-t-2xl shadow-xl flex flex-col h-[85dvh] sm:h-auto sm:max-h-[80vh] overflow-hidden ${isClosing ? 'animate-slide-down-bottom-sheet' : 'animate-slide-up-bottom-sheet'}`}
      >
        <div className="flex items-center justify-between p-4 md:p-5 border-b border-gray-100 shrink-0">
          <h2 className="text-lg font-bold text-gray-900">거래내역 검색 및 필터</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-5">
          <div className="flex flex-col gap-5">
            {/* 기간 지정 + 검색 + 결제수단 필터 */}
            <div className="flex flex-col gap-3 md:flex-row">
              <div className="relative">
                <button
                  onClick={handleOpenDatePicker}
                  className={`h-full whitespace-nowrap w-full shrink-0 flex justify-center items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                    dateRangeMode === "custom"
                      ? "bg-sky-50 text-sky-700 border-sky-300"
                      : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <CalendarDays size={16} />
                  <span>
                    {dateRangeMode === "custom"
                      ? `${customStart} ~ ${customEnd}`
                      : "전체 기간"}
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
                
                {/* 날짜 선택 팝업 */}
                {showDatePicker && (
                  <div className="absolute top-full left-0 mt-2 z-10 bg-white p-4 md:p-5 rounded-xl shadow-[0_0_15px_rgba(0,0,0,0.1)] border border-gray-100 flex flex-col gap-4 w-72">
                    
                    {/* 빠른 선택 뱃지 */}
                    <div className="flex flex-wrap gap-1.5 pb-3 border-b border-gray-100">
                      <button onClick={() => handleQuickDate("this_month")} className="px-2.5 py-1 text-[11px] font-semibold bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors">이번 달</button>
                      <button onClick={() => handleQuickDate("last_month")} className="px-2.5 py-1 text-[11px] font-semibold bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors">지난 달</button>
                      <button onClick={() => handleQuickDate("this_week")} className="px-2.5 py-1 text-[11px] font-semibold bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors">이번 주</button>
                      <button onClick={() => handleQuickDate("all")} className="px-2.5 py-1 text-[11px] font-semibold bg-sky-50 text-sky-700 rounded-md hover:bg-sky-100 transition-colors">전체 기간</button>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-gray-500">시작일</label>
                      <input
                        type="date"
                        value={tempStart}
                        onChange={(e) => setTempStart(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-gray-500">종료일</label>
                      <input
                        type="date"
                        value={tempEnd}
                        onChange={(e) => setTempEnd(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                      />
                    </div>
                    <div className="flex gap-2 w-full mt-2">
                      <button
                        onClick={applyDateRange}
                        disabled={!tempStart || !tempEnd || tempStart > tempEnd}
                        className="flex-1 px-4 py-2 bg-sky-600 text-white text-sm rounded-lg font-medium hover:bg-sky-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        적용
                      </button>
                      <button
                        onClick={() => setShowDatePicker(false)}
                        className="flex-1 px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                      >
                        닫기
                      </button>
                    </div>
                  </div>
                )}
              </div>

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

        <div className="p-4 md:p-5 border-t border-gray-100 bg-gray-50 shrink-0 pb-8 sm:pb-4 md:pb-5">
          <button
            onClick={handleApply}
            className="w-full py-3 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl transition-colors shadow-sm"
          >
            검색 결과 보기
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
