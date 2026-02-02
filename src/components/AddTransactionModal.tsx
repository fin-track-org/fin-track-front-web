"use client";

import { useState } from "react";
import { createClient } from "../lib/supabase/client";
// ⬇️ '@/' 별칭 사용 유지

// (4) API 응답 데이터의 타입 정의
interface Transaction {
  id?: number; // 수정 모드일 때만 존재
  date: string;
  category: string;
  description: string;
  amount: number;
}

// (5) Props 타입 정의: currentTransaction을 추가하여 수정 모드를 지원합니다.
interface AddTransactionModalProps {
  onClose: () => void;
  onSaveSuccess: () => void; // 부모의 목록을 새로고침하기 위한 함수
  currentTransaction?: Transaction; // 수정할 데이터 (옵셔널)
}

// .env.local에서 Spring Boot URL을 읽어옵니다.
const SPRING_BOOT_URL = process.env.NEXT_PUBLIC_SPRING_BOOT_URL!;

export default function AddTransactionModal({
  onClose,
  onSaveSuccess,
  currentTransaction,
}: AddTransactionModalProps) {
  const supabase = createClient();

  // (A) 초기 상태 설정: currentTransaction이 있으면 수정 모드로 초기화
  const initialAmount = currentTransaction
    ? Math.abs(currentTransaction.amount)
    : 0;
  const initialIsExpense = currentTransaction
    ? currentTransaction.amount < 0
    : true;

  const [date, setDate] = useState(
    currentTransaction?.date || new Date().toISOString().split("T")[0],
  );
  const [amount, setAmount] = useState(initialAmount);
  const [category, setCategory] = useState(
    currentTransaction?.category || "식비",
  );
  const [description, setDescription] = useState(
    currentTransaction?.description || "",
  );
  const [isExpense, setIsExpense] = useState(initialIsExpense); // 출금(지출) 여부

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // (B) 모달 제목 및 API 정보 설정
  const isEditing = !!currentTransaction;
  const modalTitle = isEditing ? "거래 내역 수정" : "새 거래 추가";
  const apiMethod = isEditing ? "PUT" : "POST";
  const apiUrl = isEditing
    ? `${SPRING_BOOT_URL}/api/v1/transactions/${currentTransaction!.id}` // 수정 모드 시 ID 사용
    : `${SPRING_BOOT_URL}/api/v1/transactions`;

  // (C) 제출/저장 핸들러
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (amount <= 0 || !description) {
        throw new Error("금액과 내역은 필수 입력 항목입니다.");
      }

      // [JWT 가져오기]
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("로그인이 필요합니다. 다시 로그인해주세요.");
      }
      const token = session.access_token;

      // [금액 최종 처리]
      const finalAmount = isExpense ? -amount : amount;

      // 서버의 DTO 형식에 맞게 데이터를 구성합니다.
      const transactionData = {
        date,
        amount: Math.round(finalAmount),
        category,
        description,
      };

      // [API 호출]
      const response = await fetch(apiUrl, {
        method: apiMethod,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(transactionData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `${modalTitle}에 실패했습니다.`);
      }

      // [성공]
      alert(`${modalTitle.replace(" 내역", "")}되었습니다!`);
      onSaveSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    // 모달 배경 (최신 Tailwind 문법: bg-black/50)
    <div
      className="fixed inset-0 bg-black/50 flex justify-center items-center z-50"
      onClick={onClose}
    >
      {/* 모달 컨텐츠 */}
      <div
        className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold text-gray-800 mb-6">{modalTitle}</h2>

        {error && (
          <p className="text-sm text-red-600 text-center mb-4">{error}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 입금/출금 토글 */}
          <div className="flex rounded-md shadow-sm">
            <button
              type="button"
              onClick={() => setIsExpense(true)}
              className={` flex-1 px-4 py-2 rounded-l-md transition-colors ${
                isExpense
                  ? "bg-red-500 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
              disabled={loading}
            >
              출금 (지출)
            </button>
            <button
              type="button"
              onClick={() => setIsExpense(false)}
              className={` flex-1 px-4 py-2 rounded-r-md transition-colors ${
                !isExpense
                  ? "bg-sky-500 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
              disabled={loading}
            >
              입금 (수입)
            </button>
          </div>

          {/* 날짜 */}
          <div>
            <label
              htmlFor="date"
              className="block text-sm font-medium text-gray-700"
            >
              날짜
            </label>
            <input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500"
              disabled={loading}
            />
          </div>

          {/* 금액 */}
          <div>
            <label
              htmlFor="amount"
              className="block text-sm font-medium text-gray-700"
            >
              금액 (원)
            </label>
            <input
              id="amount"
              type="number"
              value={amount === 0 ? "" : amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              required
              min="0"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500"
              placeholder="0"
              disabled={loading}
            />
          </div>

          {/* 카테고리 (간단한 select) */}
          <div>
            <label
              htmlFor="category"
              className="block text-sm font-medium text-gray-700"
            >
              카테고리
            </label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500"
              disabled={loading}
            >
              <option>식비</option>
              <option>교통</option>
              <option>문화생활</option>
              <option>생필품</option>
              <option>급여</option>
              <option>기타</option>
            </select>
          </div>

          {/* 내역 */}
          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-gray-700"
            >
              내역
            </label>
            <input
              id="description"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500"
              placeholder="예: 스타벅스"
              disabled={loading}
            />
          </div>

          {/* 버튼 그룹 */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              className=" px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
              onClick={onClose}
              disabled={loading}
            >
              취소
            </button>
            <button
              type="submit"
              className={` px-4 py-2 bg-sky-500 text-white rounded-md hover:bg-sky-600 ${
                loading ? "opacity-50 cursor-not-allowed" : ""
              }`}
              disabled={loading}
            >
              {loading ? "저장 중..." : isEditing ? "수정하기" : "저장하기"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
