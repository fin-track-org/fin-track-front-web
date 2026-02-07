"use client";

import AddTransactionModal from "@/src/components/AddTransactionModal";
import { createClient } from "@/src/lib/supabase/client";
import { useState } from "react";
import LedgerTable from "./LedgerTable";
import MonthSelector from "../dashboard/section/MonthSelector";
import { Search } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

// (3) .env.local에서 Spring Boot URL을 읽어옵니다. (서버 재시작 필수!)
const SPRING_BOOT_URL = process.env.NEXT_PUBLIC_SPRING_BOOT_URL!;

// (4) API 응답 데이터의 타입 정의 (Transaction 엔티티와 일치)
interface Transaction {
  id: number;
  date: string;
  category: string;
  description: string;
  amount: number;
}

const CATEGORIES = [
  "전체",
  "식비",
  "교통/차량",
  "주거/공과금",
  "쇼핑/생활",
  "문화/여가",
  "의료/건강",
  "교육/자기계발",
  "금융",
  "수입",
  "기타",
];

export default function TransactionPage() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  // 날짜
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // 검색
  const [searchTerm, setSearchTerm] = useState("");

  // 카테고리 필터
  const [selectedCategory, setSelectedCategory] = useState("전체");

  const [isModalOpen, setIsModalOpen] = useState(false);
  // 수정할 거래 내역의 상태를 추가합니다. (null이면 추가 모드)
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
      queryClient.invalidateQueries({
        queryKey: ["transactions"],
      });
    },
  });

  const handleDelete = (id: number) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    deleteMutation.mutate(id);
  };
  // -------------------------------------------------

  // 수정 버튼 클릭 핸들러: 모달을 열고 수정할 데이터를 설정
  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setIsModalOpen(true);
  };

  // 모달 닫기 핸들러
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTransaction(null); // 수정 모드 해제
  };

  // 저장 성공 시 모달이 호출할 함수 (onSaveSuccess 에러 해결)
  const handleSaveSuccess = () => {
    queryClient.invalidateQueries({
      queryKey: ["transactions"],
    });
    setEditingTransaction(null);
  };

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

  // 임시 필터링
  const filteredByMonth = transactions.filter((t) => {
    const txDate = new Date(t.date);
    return (
      txDate.getFullYear() === currentMonth.getFullYear() &&
      txDate.getMonth() === currentMonth.getMonth()
    );
  });

  return (
    <>
      <section className="space-y-6">
        <div className="flex justify-between items-center">
          <MonthSelector
            currentMonth={currentMonth}
            onPrev={handlePreviousMonth}
            onNext={handleNextMonth}
          />
          <button
            onClick={() => {
              setEditingTransaction(null);
              setIsModalOpen(true);
            }}
            className=" bg-sky-500 text-white px-5 py-2 rounded-lg font-medium hover:bg-sky-600 transition-colors"
          >
            + 새 거래 추가
          </button>
        </div>

        {/* 필터 및 검색 (선택 사항) */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="거래 내역 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto">
              {CATEGORIES.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 text-sm rounded-lg font-medium whitespace-nowrap transition-colors ${
                    selectedCategory === category
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          {/* 엑셀 시트형 테이블 */}
          <LedgerTable
            transactions={filteredByMonth}
            loading={isLoading}
            error={isError ? (error as Error).message : null}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </div>
      </section>

      {/* ⬇️ (15) 👈 모달의 상태와 데이터를 처리 */}
      {(isModalOpen || editingTransaction) && (
        <AddTransactionModal
          onClose={handleCloseModal} // 수정 모드 해제 로직 포함
          onSaveSuccess={handleSaveSuccess}
          currentTransaction={editingTransaction || undefined} // 수정 모드일 때만 데이터 전달
        />
      )}
    </>
  );
}
