"use client";

import AddTransactionModal from "@/src/components/AddTransactionModal";
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

const categories: { id: string; name: string }[] = [
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

const subCategory: Record<string, { id: string; name: string }[]> = {
  FOOD: [
    { id: "FOOD_EAT_OUT", name: "외식" },
    { id: "FOOD_DELIVERY", name: "배달" },
    { id: "FOOD_CAFE", name: "카페" },
    { id: "FOOD_SNACK", name: "간식" },
    { id: "FOOD_MART", name: "마트" },
    { id: "FOOD_CONVENIENCE", name: "편의점" },
    { id: "FOOD_ALCOHOL", name: "술/주류" },
  ],

  TRANSPORT: [
    { id: "TRANSPORT_SUBWAY", name: "지하철" },
    { id: "TRANSPORT_BUS", name: "버스" },
    { id: "TRANSPORT_TAXI", name: "택시" },
    { id: "TRANSPORT_TRAIN", name: "KTX/고속버스" },
    { id: "TRANSPORT_FLIGHT", name: "항공" },
    { id: "TRANSPORT_GAS", name: "주유" },
    { id: "TRANSPORT_PARKING", name: "주차" },
    { id: "TRANSPORT_MAINTENANCE", name: "정비" },
    { id: "TRANSPORT_INSURANCE", name: "차량보험" },
    { id: "TRANSPORT_TOLL", name: "톨게이트" },
  ],

  HOUSING: [
    { id: "HOUSING_RENT", name: "월세" },
    { id: "HOUSING_MANAGEMENT", name: "관리비" },
    { id: "HOUSING_ELECTRIC", name: "전기" },
    { id: "HOUSING_GAS", name: "가스" },
    { id: "HOUSING_WATER", name: "수도" },
    { id: "HOUSING_INTERNET", name: "인터넷" },
    { id: "HOUSING_PHONE", name: "휴대폰" },
    { id: "HOUSING_REPAIR", name: "수리/유지보수" },
    { id: "HOUSING_MOVE", name: "이사" },
  ],

  SHOPPING: [
    { id: "SHOPPING_ONLINE", name: "온라인쇼핑" },
    { id: "SHOPPING_CLOTHES", name: "의류" },
    { id: "SHOPPING_SHOES", name: "신발" },
    { id: "SHOPPING_ACCESSORY", name: "잡화" },
    { id: "SHOPPING_ELECTRONICS", name: "전자기기" },
    { id: "SHOPPING_APPLIANCE", name: "가전" },
    { id: "SHOPPING_FURNITURE", name: "가구" },
    { id: "SHOPPING_DAILY", name: "생필품" },
    { id: "SHOPPING_PET", name: "반려동물" },
  ],

  CULTURE: [
    { id: "CULTURE_MOVIE", name: "영화" },
    { id: "CULTURE_PERFORMANCE", name: "공연" },
    { id: "CULTURE_EXHIBITION", name: "전시" },
    { id: "CULTURE_TRAVEL", name: "여행" },
    { id: "CULTURE_STAY", name: "숙박" },
    { id: "CULTURE_HOBBY", name: "취미" },
    { id: "CULTURE_GAME", name: "게임" },
    { id: "CULTURE_BOOK", name: "도서" },
    { id: "CULTURE_SUBSCRIPTION", name: "구독서비스" },
  ],

  MEDICAL: [
    { id: "MEDICAL_HOSPITAL", name: "병원" },
    { id: "MEDICAL_PHARMACY", name: "약국" },
    { id: "MEDICAL_DENTAL", name: "치과" },
    { id: "MEDICAL_ORIENTAL", name: "한의원" },
    { id: "MEDICAL_SUPPLEMENT", name: "영양제" },
    { id: "MEDICAL_HEALTH", name: "헬스" },
    { id: "MEDICAL_BEAUTY", name: "미용" },
  ],

  EDUCATION: [
    { id: "EDU_ACADEMY", name: "학원" },
    { id: "EDU_ONLINE", name: "온라인강의" },
    { id: "EDU_BOOK", name: "도서" },
    { id: "EDU_CERT", name: "자격증" },
    { id: "EDU_EXAM", name: "시험응시료" },
  ],

  FINANCE: [
    { id: "FINANCE_LOAN", name: "대출상환" },
    { id: "FINANCE_INTEREST", name: "이자" },
    { id: "FINANCE_INSURANCE", name: "보험료" },
    { id: "FINANCE_CARD_PAYMENT", name: "카드대금" },
    { id: "FINANCE_FEE", name: "수수료" },
    { id: "FINANCE_INVEST", name: "투자" },
    { id: "FINANCE_TAX", name: "세금" },
  ],

  INCOME: [
    { id: "INCOME_SALARY", name: "급여" },
    { id: "INCOME_BONUS", name: "상여" },
    { id: "INCOME_ALLOWANCE", name: "용돈" },
    { id: "INCOME_REFUND", name: "환급/캐시백" },
    { id: "INCOME_SIDE", name: "부수입" },
    { id: "INCOME_INVEST", name: "투자수익" },
  ],
};

const paymentMethods = [
  { id: "CASH", type: "cash", name: "현금" },
  { id: "SAMSUNG_CREDIT", type: "credit_card", name: "신용카드" },
  { id: "KB_DEBIT", type: "debit_card", name: "체크카드" },
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

      // TODO(api 확장):
      // paymentType: payload.paymentType,
      // cardProvider: payload.cardProvider,
      // subCategory: payload.subCategory,
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
                category: "FOOD",
                paymentType: "cash",
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
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/30"
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
                    selectedCategoryId === c.id
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
            subCategories={subCategory} // 모달에서 "전체" 제외
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
