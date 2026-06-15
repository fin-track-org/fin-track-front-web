"use client";

import { useState, useEffect } from "react";
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

  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const handleOpen = () => setIsMenuOpen(prev => !prev);
    window.addEventListener("open-quick-add", handleOpen);
    return () => window.removeEventListener("open-quick-add", handleOpen);
  }, []);

  // ----------------------------
  // 라우트 변경 시 닫기
  // ----------------------------
  useEffect(() => {
    setIsMenuOpen(false);
    setIsModalOpen(false);
  }, [pathname]);

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
      type: payload.type === "INCOME" ? "INCOME" : "EXPENSE",
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

  // 마이페이지 등 특정 페이지에서 데스크탑 FAB 버튼만 숨기기 위해
  // 컴포넌트 자체를 null로 반환하면 이벤트 리스너가 죽어서 모바일 탭 바의 버튼이 작동하지 않습니다.
  const isProfilePage = pathname.includes("/home/profile");

  return (
    <>
      {/* 딤 배경 */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-[1px] z-[90]"
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      {/* FAB 및 스피드 다이얼 메뉴 */}
      <div className={`fixed z-[100] flex flex-col items-center lg:items-end gap-3 transition-all duration-300 ${isMenuOpen ? 'bottom-[110px] left-1/2 -translate-x-1/2 lg:left-auto lg:-translate-x-0 lg:bottom-24 lg:right-6' : 'bottom-0 left-1/2 -translate-x-1/2 lg:left-auto lg:-translate-x-0 lg:bottom-6 lg:right-6 pointer-events-none lg:pointer-events-auto'}`}>
        {/* 일반 등록 버튼 */}
        <div
          className={`relative flex items-center justify-center transition-all duration-300 origin-bottom ${
            isMenuOpen ? "translate-y-0 opacity-100 scale-100" : "translate-y-12 opacity-0 scale-50 pointer-events-none"
          }`}
        >
          <span className="absolute right-full mr-4 w-max bg-white text-gray-700 px-3 py-1.5 rounded-lg shadow-md text-sm font-bold border border-gray-100">
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
          className={`relative flex items-center justify-center transition-all duration-200 origin-bottom ${
            isMenuOpen ? "translate-y-0 opacity-100 scale-100" : "translate-y-6 opacity-0 scale-50 pointer-events-none"
          }`}
        >
          <span className="absolute right-full mr-4 w-max bg-white text-gray-700 px-3 py-1.5 rounded-lg shadow-md text-sm font-bold border border-gray-100">
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

        {/* 메인 토글 버튼 (데스크탑에서만 표시, 모바일은 하단 탭 바에서 이벤트 발생) */}
        {!isProfilePage && (
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="메뉴 열기"
            className="hidden lg:flex items-center justify-center w-14 h-14 rounded-full bg-sky-600 text-white shadow-xl hover:bg-sky-700 active:scale-95 transition-all z-10 relative"
          >
            <Plus size={28} strokeWidth={2.5} className={`transition-transform duration-300 ${isMenuOpen ? "rotate-[135deg]" : "rotate-0"}`} />
          </button>
        )}
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
