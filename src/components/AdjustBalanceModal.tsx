"use client";

import { useState, useEffect, useRef } from "react";
import { X, RefreshCw } from "lucide-react";
import { adjustAccountBalance } from "@/src/lib/api/accountApi";

interface AdjustBalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  paymentMethods: PaymentMethodBalance[];
  onSuccess: () => void;
}

export default function AdjustBalanceModal({
  isOpen,
  onClose,
  paymentMethods,
  onSuccess,
}: AdjustBalanceModalProps) {
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [actualBalance, setActualBalance] = useState("");
  const [reason, setReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const isPopStateTriggered = useRef(false);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      isPopStateTriggered.current = false;
      window.history.pushState({ modal: "AdjustBalanceModal" }, "", window.location.href);

      const handlePopState = () => {
        isPopStateTriggered.current = true;
        onCloseRef.current();
      };

      window.addEventListener("popstate", handlePopState);

      return () => {
        window.removeEventListener("popstate", handlePopState);
        if (!isPopStateTriggered.current) {
          if (window.history.state?.modal === "AdjustBalanceModal") {
            window.history.back();
          }
        }
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccountId) {
      setError("결제수단을 선택해주세요.");
      return;
    }
    if (!actualBalance) {
      setError("실제 잔액을 입력해주세요.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      await adjustAccountBalance(selectedAccountId, {
        actualBalance: Number(actualBalance),
        reason: reason || "잔액 조정",
      });
      onSuccess();
      onClose();
      // 초기화
      setSelectedAccountId("");
      setActualBalance("");
      setReason("");
    } catch (err: any) {
      setError(err.message || "잔액 조정에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const selectedMethod = paymentMethods.find((m) => m.accountId === selectedAccountId);

  return (
    <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center">
      {/* backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />

      <div className="relative w-full sm:max-w-md mx-auto bg-white rounded-t-[1.75rem] sm:rounded-2xl shadow-[0_-8px_30px_rgba(0,0,0,0.12)] p-5 sm:p-6 flex flex-col animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:fade-in-0 duration-300 max-h-[92dvh] sm:max-h-[90vh]">
        
        <div className="flex-1 overflow-y-auto pb-[calc(1rem+env(safe-area-inset-bottom))] px-1 custom-scrollbar">
          {/* 모바일 손잡이(핸들) */}
          <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-5 sm:hidden" />
          
          <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-6">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <RefreshCw className="text-primary" size={24} />
              잔액 조정
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-full"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              결제수단 선택
            </label>
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
              required
            >
              <option value="" disabled>
                결제수단을 선택해주세요
              </option>
              {paymentMethods.map((method) => (
                <option key={method.accountId} value={method.accountId}>
                  {method.paymentMethodName}
                </option>
              ))}
            </select>
            {selectedMethod && (
              <p className="mt-2 text-sm text-gray-500">
                앱 내 현재 잔액: <span className="font-medium text-gray-900">{selectedMethod.balance.toLocaleString()}원</span>
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              실제 잔액
            </label>
            <div className="relative">
              <input
                type="number"
                value={actualBalance}
                onChange={(e) => setActualBalance(e.target.value)}
                placeholder="실제 지갑이나 통장의 잔액을 입력하세요"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                required
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">
                원
              </span>
            </div>
            {selectedMethod && actualBalance && (
              <p className={`mt-2 text-sm font-medium ${Number(actualBalance) - selectedMethod.balance > 0 ? 'text-green-600' : Number(actualBalance) - selectedMethod.balance < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                차액: {(Number(actualBalance) - selectedMethod.balance).toLocaleString()}원
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              오차 사유 (선택)
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
            >
              <option value="">사유를 선택해주세요 (선택사항)</option>
              <option value="이자/수익">이자/수익</option>
              <option value="수수료">수수료</option>
              <option value="빌려준 돈">빌려준 돈</option>
              <option value="빌린 돈">빌린 돈</option>
              <option value="포인트 적립/사용">포인트 적립/사용</option>
              <option value="입출금 내역 누락">입출금 내역 누락</option>
              <option value="기타">기타</option>
            </select>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading || !selectedAccountId || !actualBalance}
              className="w-full py-4 bg-primary text-white rounded-xl font-bold text-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "조정 중..." : "잔액 조정하기"}
            </button>
          </div>
          </form>
        </div>
      </div>
    </div>
  );
}
