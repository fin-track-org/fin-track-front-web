"use client";

import { useState } from "react";
import { Plus, Zap, FileText } from "lucide-react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { quickAddTransaction } from "@/src/lib/api/transaction/transactions";
import { usePathname } from "next/navigation";
import AddTransactionModal from "@/src/components/AddTransactionModal";
import { getCategories } from "@/src/lib/api/categoryApi";
import { getAccounts } from "@/src/lib/api/accountApi";
import { createClient } from "@/src/lib/supabase/client";
import { createTransfer } from "@/src/lib/api/transaction/transactions";

const SPRING_BOOT_URL = process.env.NEXT_PUBLIC_SPRING_BOOT_URL!;

export default function GlobalQuickAdd() {
  const pathname = usePathname();
  const queryClient = useQueryClient();

  // 특정 페이지에서 버튼 숨기기 (예: 마이페이지)
  if (pathname.includes("/home/profile")) {
    return null;
  }

  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // ----------------------------
  // 통합 모달 상태
  // ----------------------------
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "quick">("create");

  // 일반 상세 추가를 위한 데이터 조회
  const { data: rawCategories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: () => getCategories(),
  });

  const { data: rawAccounts = [] } = useQuery({
    queryKey: ["accounts"],
    queryFn: () => getAccounts(),
  });

  const { mutateAsync: submitQuickAsync } = useMutation({
    mutationFn: quickAddTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drafts"] });
      queryClient.invalidateQueries({ queryKey: ["recentTransactions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardBalances"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      setIsModalOpen(false);
    },
  });

  const handleSaveDraftFromModal = async (payload: any) => {
    const parsedAmount = Number(payload.amount);
    if (!payload.date || isNaN(parsedAmount) || parsedAmount <= 0) {
      throw new Error("금액과 날짜를 확인해주세요.");
    }
    await submitQuickAsync({
      date: payload.date,
      amount: parsedAmount,
      description: payload.description || "",
    });
  };

  const handleSubmitRegularTransaction = async (payload: any): Promise<void> => {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) throw new Error("로그인이 필요합니다.");

    if (payload.type === "TRANSFER" || payload.isSavings) {
      const fromId = payload.type === "INCOME" ? payload.toAccountId! : payload.accountId;
      const toId = payload.type === "INCOME" ? payload.accountId : payload.toAccountId!;

      await createTransfer({
        fromAccountId: fromId,
        toAccountId: toId,
        amount: payload.amount,
        date: payload.date,
        description: payload.description || "",
        isSavings: payload.isSavings || false,
      });
    } else {
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
              setModalMode("create");
              setIsModalOpen(true);
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
              setModalMode("quick");
              setIsModalOpen(true);
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

      {/* 통합 거래 추가 모달 */}
      <AddTransactionModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        categories={rawCategories}
        accounts={rawAccounts}
        onSubmit={handleSubmitRegularTransaction}
        onSaveDraft={handleSaveDraftFromModal}
        mode={modalMode}
      />
    </>
  );
}
