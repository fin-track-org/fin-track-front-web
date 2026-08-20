"use client";

import { useState, useEffect } from "react";
import { Plus, Zap, FileText, RefreshCw } from "lucide-react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { quickAddTransaction } from "@/src/lib/api/transaction/transactions";
import { usePathname } from "next/navigation";
import AddTransactionModal from "@/src/components/AddTransactionModal";
import { getCategories } from "@/src/lib/api/categoryApi";
import { getAccounts } from "@/src/lib/api/accountApi";
import { createClient } from "@/src/lib/supabase/client";
import { createTransfer } from "@/src/lib/api/transaction/transactions";
import { getTransferAccountIds } from "@/src/lib/transactionEntry";
import { getDashboardBalances } from "@/src/lib/api/dashboard/balance";
import AdjustBalanceModal from "@/src/components/AdjustBalanceModal";
import { useQuestStore } from "@/src/store/useQuestStore";
import { useToast } from "@/src/hook/useToast";
import { useRouter } from "next/navigation";

const SPRING_BOOT_URL = process.env.NEXT_PUBLIC_SPRING_BOOT_URL!;

export default function GlobalQuickAdd() {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // ----------------------------
  // 통합 모달 상태
  // ----------------------------
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "quick">("create");

  const { activeQuestCode, stepIndex, nextStep, stopQuest } = useQuestStore();
  const { toast } = useToast();

  useEffect(() => {
    // 책상형 모바일 홈의 "빠르게 기록하기"(IMPLEMENTATION_BRIEF_010 §5)는 스피드 다이얼
    // 메뉴를 거치지 않고 quick 모드 모달을 바로 열어야 한다. 기존 호출자(MobileBottomNav의
    // "+" 버튼)는 payload 없는 단순 Event로 메뉴만 toggle하므로, CustomEvent의
    // `detail.mode === "quick"`일 때만 새 동작으로 분기하고 그 외에는 기존 toggle을 그대로
    // 유지해 하위 호환을 보존한다.
    const handleOpen = (e: Event) => {
      const detail = (e as CustomEvent<{ mode?: "quick" }>).detail;
      if (detail?.mode === "quick") {
        setIsMenuOpen(false);
        setModalMode("quick");
        setIsModalOpen(true);
        return;
      }
      setIsMenuOpen((prev) => !prev);
    };
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

  // 일반 상세 추가를 위한 데이터 조회
  const { data: rawCategories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: () => getCategories(),
  });

  const { data: rawAccounts = [] } = useQuery({
    queryKey: ["accounts"],
    queryFn: () => getAccounts(),
  });

  const { data: balanceData } = useQuery({
    queryKey: ["dashboardBalances"],
    queryFn: () => getDashboardBalances(),
    retry: false,
  });

  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);

  // 모달이 열렸을 때 퀘스트 스텝 업데이트 로직
  useEffect(() => {
    if (activeQuestCode === "FAST_DRAFT" && isModalOpen && stepIndex === 1) {
      // 모달 애니메이션이 끝난 후 스텝 이동 (안전하게 350ms 대기)
      setTimeout(() => nextStep(), 350);
    }
  }, [activeQuestCode, isModalOpen, stepIndex, nextStep]);

  const { mutateAsync: submitQuickAsync } = useMutation({
    mutationFn: quickAddTransaction,
    // 낙관적 업데이트: 서버 응답을 기다리지 않고 "나중에 분류" 목록에 바로 반영한다.
    // (design-package/screens-v1/HANDOFF.md "빠른 기록은 낙관적으로 목록에 반영하며 실패 시 입력값 유지")
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: ["drafts"] });
      const previousDrafts = queryClient.getQueryData<DraftTransaction[]>(["drafts"]);

      const optimisticDraft: DraftTransaction = {
        id: `optimistic-${Date.now()}`,
        date: payload.date,
        amount:
          payload.type === "EXPENSE"
            ? -Math.abs(payload.amount)
            : Math.abs(payload.amount),
        type: payload.type === "INCOME" ? "INCOME" : "EXPENSE",
        category: null,
        subcategory: null,
        description: payload.description,
        sortOrder: 0,
        account: null,
      };

      queryClient.setQueryData<DraftTransaction[]>(["drafts"], (old) => [
        optimisticDraft,
        ...(old ?? []),
      ]);

      return { previousDrafts };
    },
    onError: (error, _payload, context) => {
      // 실패 시 목록을 원래대로 되돌린다. 입력값 자체는 모달이 닫히지 않아 그대로 유지된다.
      // `previousDrafts`는 빈 배열([])이면 truthy이므로 존재 여부는 undefined 비교로만 판단한다
      // (DESIGN_QA_01.md P2-1: 캐시가 아예 없던 첫 방문 상태에서는 낙관적 항목이 안 지워지던 문제 수정)
      if (!context) return;
      if (context.previousDrafts !== undefined) {
        queryClient.setQueryData(["drafts"], context.previousDrafts);
      } else {
        // 애초에 캐시된 값이 없었다면(첫 조회 전) 방금 낙관적으로 넣은 항목만 지우고
        // 다음에 실제로 필요할 때 서버에서 새로 받아오도록 쿼리 자체를 제거한다.
        queryClient.removeQueries({ queryKey: ["drafts"], exact: true });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drafts"] });
      queryClient.invalidateQueries({ queryKey: ["recentTransactions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardBalances"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      setIsModalOpen(false);
      toast.success("잘 적어뒀어요. 분류는 나중에 해도 돼요.");

      if (activeQuestCode === "FAST_DRAFT" && stepIndex === 2) {
        nextStep(); // 폼 저장 시 즉시 스텝을 3으로 증가시켜 모달 닫힘에 의한 stopQuest 방지
      }
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
      const { fromAccountId, toAccountId } = getTransferAccountIds(payload);

      await createTransfer({
        fromAccountId,
        toAccountId,
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
        {/* 잔액 조정 버튼 */}
        <div
          className={`relative flex items-center justify-center transition-all duration-500 origin-bottom ${isMenuOpen ? "translate-y-0 opacity-100 scale-100" : "translate-y-16 opacity-0 scale-50 pointer-events-none"
            }`}
        >
          <span className="absolute right-full mr-4 w-max bg-white text-gray-700 px-3 py-1.5 rounded-lg shadow-md text-sm font-bold border border-gray-100">
            잔액 조정
          </span>
          <button
            onClick={() => {
              setIsMenuOpen(false);
              setIsAdjustModalOpen(true);
            }}
            className="flex items-center justify-center w-14 h-14 rounded-full bg-indigo-500 text-white shadow-lg hover:bg-indigo-600 transition-colors"
          >
            <RefreshCw size={24} />
          </button>
        </div>

        {/* 일반 등록 버튼 */}
        <div
          className={`relative flex items-center justify-center transition-all duration-300 origin-bottom ${isMenuOpen ? "translate-y-0 opacity-100 scale-100" : "translate-y-12 opacity-0 scale-50 pointer-events-none"
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
          className={`relative flex items-center justify-center transition-all duration-200 origin-bottom ${isMenuOpen ? "translate-y-0 opacity-100 scale-100" : "translate-y-6 opacity-0 scale-50 pointer-events-none"
            }`}
        >
          <span className="absolute right-full mr-4 w-max bg-white text-gray-700 px-3 py-1.5 rounded-lg shadow-md text-sm font-bold border border-gray-100">
            빠른 등록 (임시 보관)
          </span>
          <button
            id="tutorial-quick-add-menu-item"
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
            id="tutorial-quick-add-desktop"
            onClick={() => {
              setIsMenuOpen(!isMenuOpen);
              if (activeQuestCode === "FAST_DRAFT" && stepIndex === 0) {
                setTimeout(() => nextStep(), 350);
              }
            }}
            aria-label="메뉴 열기"
            className="hidden lg:flex items-center justify-center w-14 h-14 rounded-full bg-sky-600 text-white shadow-xl hover:bg-sky-700 active:scale-95 transition-all z-10 relative"
          >
            <Plus size={28} strokeWidth={2.5} className={`transition-transform duration-300 ${isMenuOpen ? "rotate-[135deg]" : "rotate-0"}`} />
          </button>
        )}
      </div>

      {/* 통합 거래 추가 모달 */}
      <div id="tutorial-quick-add-modal">
        <AddTransactionModal
          open={isModalOpen}
          onOpenChange={(newOpen) => {
            setIsModalOpen(newOpen);
            // 튜토리얼 도중에 모달을 닫아버리면 튜토리얼 강제 종료
            // 주의: 클로저 버그 방지를 위해 Zustand에서 최신 상태를 직접 가져옴
            const currentStep = useQuestStore.getState().stepIndex;
            if (!newOpen && activeQuestCode === "FAST_DRAFT" && currentStep <= 2) {
              stopQuest();
            }
          }}
          categories={rawCategories}
          accounts={rawAccounts}
          onSubmit={handleSubmitRegularTransaction}
          onSaveDraft={handleSaveDraftFromModal}
          mode={modalMode}
          isTutorialMode={activeQuestCode === "FAST_DRAFT"}
        />
      </div>

      {/* 잔액 조정 모달 */}
      <AdjustBalanceModal
        isOpen={isAdjustModalOpen}
        onClose={() => setIsAdjustModalOpen(false)}
        paymentMethods={balanceData?.paymentMethods || []}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["dashboardBalances"] });
          queryClient.invalidateQueries({ queryKey: ["dashboardSummary"] });
          queryClient.invalidateQueries({ queryKey: ["dashboardDaily"] });
          queryClient.invalidateQueries({ queryKey: ["transactions"] });
          queryClient.invalidateQueries({ queryKey: ["recentTransactions"] });
        }}
      />
    </>
  );
}
