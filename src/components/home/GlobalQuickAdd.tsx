"use client";

import { useState, useRef } from "react";
import { Plus, X, Zap, FileText } from "lucide-react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { quickAddTransaction } from "@/src/lib/api/transaction/transactions";
import { usePathname } from "next/navigation";
import AddTransactionModal from "@/src/components/AddTransactionModal";
import { getCategories } from "@/src/lib/api/categoryApi";
import { getAccounts } from "@/src/lib/api/accountApi";
import { createClient } from "@/src/lib/supabase/client";

const SPRING_BOOT_URL = process.env.NEXT_PUBLIC_SPRING_BOOT_URL!;

export default function GlobalQuickAdd() {
  const pathname = usePathname();
  const queryClient = useQueryClient();

  // 특정 페이지에서 버튼 숨기기 (예: 마이페이지)
  if (pathname.includes("/home/profile")) {
    return null;
  }

  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // 빠른 추가 모달 상태
  const [isQuickModalOpen, setIsQuickModalOpen] = useState(false);
  const [quickDate, setQuickDate] = useState("");
  const [quickAmount, setQuickAmount] = useState("");
  const [quickDescription, setQuickDescription] = useState("");
  const [quickError, setQuickError] = useState("");
  const descriptionRef = useRef<HTMLInputElement>(null);

  // 일반 상세 추가 모달 상태
  const [isRegularModalOpen, setIsRegularModalOpen] = useState(false);

  // 일반 상세 추가를 위한 데이터 조회
  const { data: rawCategories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: () => getCategories(),
  });

  const { data: rawAccounts = [] } = useQuery({
    queryKey: ["accounts"],
    queryFn: () => getAccounts(),
  });

  const openQuickModal = () => {
    // 로컬 타임존 기준 YYYY-MM-DD 생성
    const today = new Date();
    const offset = today.getTimezoneOffset() * 60000;
    const localDate = new Date(today.getTime() - offset).toISOString().split("T")[0];
    
    setQuickDate(localDate);
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
      queryClient.invalidateQueries({ queryKey: ["dashboardBalances"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
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

  const handleSubmitRegularTransaction = async (payload: any): Promise<void> => {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) throw new Error("로그인이 필요합니다.");

    const apiUrl = `${SPRING_BOOT_URL}/api/v1/transactions`;
    const bodyForNow = {
      date: payload.date,
      amount: payload.amount,
      type: payload.type,
      categoryId: payload.categoryId,
      subcategoryId: payload.subCategoryId ?? null,
      description: payload.description ?? null,
      accountId: payload.accountId ?? null,
    };

    const res = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(bodyForNow),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`저장에 실패했습니다. (${res.status}) ${errText}`);
    }

    queryClient.invalidateQueries({ queryKey: ["transactions"] });
    queryClient.invalidateQueries({ queryKey: ["recentTransactions"] });
    queryClient.invalidateQueries({ queryKey: ["dashboardBalances"] });
    queryClient.invalidateQueries({ queryKey: ["dashboardDaily"] });
    queryClient.invalidateQueries({ queryKey: ["dashboardSummary"] });
  };

  return (
    <>
      {/* 백드롭 (메뉴 열렸을 때 화면 어둡게 하고 바깥 클릭 시 닫기 용도) */}
      {isMenuOpen && (
        <div 
          className="fixed inset-0 z-30 bg-black/10 backdrop-blur-[1px] transition-opacity"
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      {/* FAB 및 스피드 다이얼 메뉴 */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">
        {/* 일반 등록 버튼 */}
        <div
          className={`flex items-center gap-3 transition-all duration-300 origin-bottom ${
            isMenuOpen ? "translate-y-0 opacity-100 scale-100" : "translate-y-12 opacity-0 scale-50 pointer-events-none"
          }`}
        >
          <span className="bg-white text-gray-700 px-3 py-1.5 rounded-lg shadow-md text-sm font-bold border border-gray-100">
            상세 등록
          </span>
          <button
            onClick={() => {
              setIsMenuOpen(false);
              setIsRegularModalOpen(true);
            }}
            className="flex items-center justify-center w-14 h-14 rounded-full bg-emerald-500 text-white shadow-lg hover:bg-emerald-600 transition-colors"
          >
            <FileText size={24} />
          </button>
        </div>

        {/* 빠른 등록 버튼 */}
        <div
          className={`flex items-center gap-3 transition-all duration-200 origin-bottom ${
            isMenuOpen ? "translate-y-0 opacity-100 scale-100" : "translate-y-6 opacity-0 scale-50 pointer-events-none"
          }`}
        >
          <span className="bg-white text-gray-700 px-3 py-1.5 rounded-lg shadow-md text-sm font-bold border border-gray-100">
            빠른 등록 (임시 보관)
          </span>
          <button
            onClick={() => {
              setIsMenuOpen(false);
              openQuickModal();
            }}
            className="flex items-center justify-center w-14 h-14 rounded-full bg-amber-500 text-white shadow-lg hover:bg-amber-600 transition-colors"
          >
            <Zap size={24} />
          </button>
        </div>

        {/* 메인 토글 버튼 */}
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="메뉴 열기"
          className="flex items-center justify-center w-14 h-14 rounded-full bg-sky-600 text-white shadow-xl hover:bg-sky-700 active:scale-95 transition-all z-10 relative"
        >
          <Plus size={28} strokeWidth={2.5} className={`transition-transform duration-300 ${isMenuOpen ? "rotate-[135deg]" : "rotate-0"}`} />
        </button>
      </div>

      {/* 빠른 추가 모달 */}
      {isQuickModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          onClick={(e) => { if (e.target === e.currentTarget) setIsQuickModalOpen(false); }}
        >
          {/* backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

          <div className="relative w-full sm:max-w-sm mx-auto bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl p-6 space-y-5 animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:fade-in-0 duration-200">
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
              임시 보관함에 저장됩니다. 나중에 카테고리를 지정해 거래 내역으로 분류하세요.
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
                className="w-full bg-sky-600 text-white py-2.5 rounded-lg font-bold text-sm hover:bg-sky-700 transition-colors disabled:opacity-60"
              >
                {isQuickPending ? "저장 중..." : "임시 저장"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 일반 거래 추가 모달 */}
      <AddTransactionModal
        open={isRegularModalOpen}
        onOpenChange={setIsRegularModalOpen}
        categories={rawCategories}
        accounts={rawAccounts}
        onSubmit={handleSubmitRegularTransaction}
        mode="create"
      />
    </>
  );
}
