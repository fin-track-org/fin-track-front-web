"use client";

import AddTransactionModal, {
  CreateTransactionPayload,
} from "@/src/components/AddTransactionModal";
import { createClient } from "@/src/lib/supabase/client";
import { useState } from "react";
import LedgerTable from "./LedgerTable";
import MonthSelector from "../dashboard/section/MonthSelector";
import { Search } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Label } from "../../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";

// .env.local에서 Spring Boot URL을 읽어옵니다.
const SPRING_BOOT_URL = process.env.NEXT_PUBLIC_SPRING_BOOT_URL!;

const categories = [
  { id: "ALL", name: "전체" },
  { id: "FOOD", name: "식비" },
  { id: "TRANSPORT", name: "교통/차량" },
  { id: "HOUSING", name: "주거/공과금" },
  { id: "SHOPPING", name: "쇼핑/생활" },
  { id: "CULTURE", name: "문화/여가" },
  { id: "MEDICAL", name: "의료/건강" },
  { id: "EDUCATION", name: "교육/자기계발" },
  { id: "FINANCE", name: "금융" },
  { id: "INCOME", name: "수입" },
  { id: "ETC", name: "기타" },
];

const paymentMethods = [
  { id: "CASH", type: "cash", name: "현금" },
  { id: "SAMSUNG_CREDIT", type: "credit_card", name: "삼성카드 (신용)" },
  { id: "KB_DEBIT", type: "debit_card", name: "국민카드 (체크)" },
];

export default function TransactionPage() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  // 날짜
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // 검색
  const [searchTerm, setSearchTerm] = useState("");

  // 카테고리 필터
  const [selectedCategoryId, setSelectedCategoryId] = useState("ALL");

  const [isModalOpen, setIsModalOpen] = useState(false);

  // 새 거래용 defaultValues
  const [modalDefaultValues, setModalDefaultValues] = useState<
    Partial<CreateTransactionPayload> | undefined
  >(undefined);

  // 수정할 거래 내역 (null이면 추가 모드)
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);

  const getYearMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`; // 예: 2026-02
  };

  /* 조회 api */
  const getTransactions = async (): Promise<Transaction[]> => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) throw new Error("로그인이 필요합니다.");

    const yearMonth = getYearMonth(currentMonth);

    const response = await fetch(
      `${SPRING_BOOT_URL}/api/v1/transactions?month=${yearMonth}`,
      {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error("데이터를 불러오는 데 실패했습니다.");
    }

    const result = await response.json();
    return result.data ?? [];
  };

  const {
    data: transactions = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["transactions", getYearMonth(currentMonth)],
    queryFn: getTransactions,
    placeholderData: (previousData) => previousData,
  });

  // ------------------- 삭제 -----------------------
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
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

  const handleDelete = (id: number) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    deleteMutation.mutate(id);
  };
  // -------------------------------------------------

  // 수정 버튼 클릭
  const handleEdit = (t: Transaction) => {
    setEditingTransaction(t);
    setModalDefaultValues({
      date: t.date,
      type: t.amount < 0 ? "expense" : "income",
      amount: Math.abs(t.amount),
      category: t.category,
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

    // ✅ 수정 모드면 PUT, 아니면 POST
    const isEditing = Boolean(editingTransaction?.id);
    const apiUrl = isEditing
      ? `${SPRING_BOOT_URL}/api/v1/transactions/${editingTransaction!.id}`
      : `${SPRING_BOOT_URL}/api/v1/transactions`;

    const method = isEditing ? "PUT" : "POST";

    // ✅ 현재 Spring Boot DTO가 (date, amount, category, description)만 받는 상태라고 가정
    // 나머지 필드는 API 확장 후 함께 보낼 예정
    const bodyForNow = {
      date: payload.date,
      amount: payload.amount,
      category: payload.category,
      description: payload.description ?? "",

      // TODO(api 확장 예시):
      // subcategoryText: payload.subcategoryText,
      // merchantText: payload.merchantText,
      // paymentMethodId: payload.paymentMethodId,
      // type: payload.type,
    };

    const res = await fetch(apiUrl, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(bodyForNow),
    });

    if (!res.ok) {
      let msg = "저장 실패";
      try {
        const errJson = await res.json();
        msg = errJson?.message || msg;
      } catch {}
      throw new Error(msg);
    }

    queryClient.invalidateQueries({ queryKey: ["transactions"] });
    // 모달 닫기 + 수정 해제
    setIsModalOpen(false);
    setEditingTransaction(null);
  };

  /* 이전/다음 달 */
  const handlePreviousMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1),
    );
  };

  const handleNextMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1),
    );
  };

  // 월 필터
  const filteredByMonth = transactions.filter((t) => {
    const txDate = new Date(t.date);
    return (
      txDate.getFullYear() === currentMonth.getFullYear() &&
      txDate.getMonth() === currentMonth.getMonth()
    );
  });

  return (
    <>
      <section className="space-y-4 md:space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-center">
          <MonthSelector
            currentMonth={currentMonth}
            onPrev={handlePreviousMonth}
            onNext={handleNextMonth}
          />
          <button
            onClick={() => {
              setEditingTransaction(null);
              setModalDefaultValues({
                date: new Date().toISOString().split("T")[0],
                type: "expense",
                category: "식비",
                paymentMethodId: "CASH",
              });
              setIsModalOpen(true);
            }}
            className="flex-none w-full md:w-auto bg-sky-500 text-white px-5 py-2 rounded-lg font-semibold hover:bg-sky-600 transition-colors text-sm md:text-base shadow-sm"
          >
            + 새 거래 추가
          </button>
        </div>

        {/* 검색/필터 */}
        <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
          <div className="flex flex-col gap-3">
            {/* 검색 */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="거래 내역 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 모바일: Select */}
            <div className="md:hidden">
              <Label className="text-xs text-gray-500 ml-1 mb-1">
                카테고리
              </Label>
              <Select
                value={selectedCategoryId}
                onValueChange={setSelectedCategoryId}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="선택" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                  {/* <SelectItem value="transfer">이체</SelectItem> */}
                </SelectContent>
              </Select>
            </div>

            {/* 데스크탑: 칩 */}
            <div className="hidden md:flex flex-wrap gap-2">
              {categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCategoryId(c.id)}
                  className={`px-4 py-2 text-sm rounded-lg font-medium whitespace-nowrap transition-colors ${
                    selectedCategoryId === c.name
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        <LedgerTable
          transactions={filteredByMonth}
          loading={isLoading}
          error={isError ? (error as Error).message : null}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </section>

      {(isModalOpen || editingTransaction) && (
        <>
          {/* 모달 */}
          <AddTransactionModal
            open={isModalOpen}
            onOpenChange={handleOpenChange}
            categories={categories.filter((c) => c.id !== "ALL")} // 모달에서 "전체" 제외
            paymentMethods={paymentMethods}
            onSubmit={handleSubmitTransaction}
            defaultValues={modalDefaultValues}
            mode={editingTransaction ? "edit" : "create"}
          />
        </>
      )}
    </>
  );
}
