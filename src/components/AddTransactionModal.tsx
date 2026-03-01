/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useMemo, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/src/components/ui/dialog";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";
import { Textarea } from "@/src/components/ui/textarea";

export type TransactionType = "expense" | "income" | "transfer";

export interface Category {
  id: string;
  name: string;
}

export type PaymentMethodType =
  | "cash"
  | "credit_card"
  | "debit_card"
  | "account";

export interface PaymentMethod {
  id: string;
  type: PaymentMethodType | string;
  name: string;
  provider?: string;
  isActive?: boolean;
}

export interface CreateTransactionPayload {
  date: string; // YYYY-MM-DD
  type: TransactionType; // ✅ 모달에서 결정

  amount: number; // ✅ 서버에 보낼 최종 amount(지출 음수, 수입 양수)

  category: string; // (현재 서버 DTO 기준 문자열)

  paymentType: "cash" | "credit_card" | "debit_card"; // ✅ 1차
  cardProvider?: string | null; // ✅ 2차 (카드일 때만)

  // 아래는 지금 당장 서버에 안 보내도 됨.
  // TODO(api 확장): 서버 DTO에 추가되면 body에 포함시키면 됨.
  subcategoryText?: string | null;
  merchantText?: string | null;
  description?: string | null;
}

export interface AddTransactionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  categories: Category[];
  paymentMethods: PaymentMethod[];

  onSubmit: (payload: CreateTransactionPayload) => Promise<void>;

  defaultValues?: Partial<CreateTransactionPayload>;

  mode: "create" | "edit";
}

const CARD_PROVIDERS = [
  { id: "SAMSUNG", name: "삼성" },
  { id: "KB", name: "국민" },
  { id: "HYUNDAI", name: "현대" },
  { id: "SHINHAN", name: "신한" },
  { id: "WOORI", name: "우리" },
  { id: "HANA", name: "하나" },
  { id: "LOTTE", name: "롯데" },
  { id: "NH", name: "NH" },
] as const;

function todayISODateSeoul(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function toNumberOrNaN(v: string): number {
  const n = Number(v.replaceAll(",", ""));
  return Number.isFinite(n) ? n : NaN;
}

export default function AddTransactionModal(props: AddTransactionModalProps) {
  const { open, onOpenChange, categories, onSubmit, defaultValues, mode } =
    props;

  const initialDate = defaultValues?.date ?? todayISODateSeoul();

  // ✅ 수정 모드에서 type 추정: defaultValues.amount는 "표시용 절대값"으로 들어오므로,
  // type은 defaultValues.type이 있으면 그걸 쓰고, 없으면 expense로 기본.
  const initialType: TransactionType = defaultValues?.type ?? "expense";

  const [date, setDate] = useState<string>(initialDate);
  const [type, setType] = useState<TransactionType>(initialType);

  const [category, setCategory] = useState<string>(
    defaultValues?.category ?? "",
  );

  const [paymentType, setPaymentType] = useState<
    "cash" | "credit_card" | "debit_card"
  >(defaultValues?.paymentType ?? "cash");

  const [cardProvider, setCardProvider] = useState<string>(
    defaultValues?.cardProvider ?? "",
  );

  // 소분류(자유 텍스트)
  const [subcategoryText, setSubcategoryText] = useState<string>(
    defaultValues?.subcategoryText ?? "",
  );

  // 메모(description)
  const [description, setDescription] = useState<string>(
    defaultValues?.description ?? "",
  );

  // 금액 입력은 양수로만 받음(부호는 type로 결정)
  const [amountText, setAmountText] = useState<string>(
    defaultValues?.amount != null ? String(defaultValues.amount) : "",
  );

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string>("");

  // ✅ open될 때 type 기본값 리셋/반영 (핵심)
  useEffect(() => {
    if (!open) return;

    // 추가 모드: 항상 지출로 시작
    if (!defaultValues) {
      setType("expense");
      return;
    }

    // 수정 모드: defaultValues.type이 있으면 반영
    if (defaultValues.type) {
      setType(defaultValues.type);
    }
  }, [open, defaultValues]);

  // open될 때 기본값 반영 (defaultValues 없을 때만)
  useEffect(() => {
    if (!open) return;

    setError("");

    if (defaultValues) return;

    try {
      setCategory((prev) => prev);
      setDate(todayISODateSeoul());
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (paymentType === "cash") setCardProvider("");
  }, [paymentType]);

  const categoryOptions = useMemo(() => categories, [categories]);

  const amountAbs = useMemo(() => toNumberOrNaN(amountText), [amountText]);
  const isAmountValid = Number.isFinite(amountAbs) && amountAbs > 0;

  const needCardProvider = paymentType !== "cash";
  const canSubmit =
    Boolean(date) &&
    Boolean(category) &&
    isAmountValid &&
    !isSaving &&
    (!needCardProvider || Boolean(cardProvider));

  async function handleSubmit() {
    setError("");
    if (!canSubmit) return;

    // ✅ 서버에 저장될 최종 amount 부호 결정
    const signedAmount = type === "expense" ? -amountAbs : Math.abs(amountAbs);
    // TODO(정책): transfer는 현재 양수로 저장. 추후 transfer 처리 방식 정하면 수정.
    // const signedAmount = type === "transfer" ? Math.abs(amountAbs) : (type === "expense" ? -amountAbs : amountAbs)

    const payload: CreateTransactionPayload = {
      date,
      type,
      amount: Math.round(signedAmount),
      category,
      paymentType,
      cardProvider: paymentType === "cash" ? null : cardProvider,

      // TODO(api 확장): 서버 DTO에 필드 추가되면 body에 포함
      subcategoryText: subcategoryText.trim() ? subcategoryText.trim() : null,
      description: description.trim() ? description.trim() : null,
    };

    try {
      setIsSaving(true);
      await onSubmit(payload);

      onOpenChange(false);

      // 빠른 입력용 리셋(원하면 유지해도 됨)
      setAmountText("");
      setSubcategoryText("");
      setDescription("");
    } catch (e: any) {
      setError(e?.message || "저장에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-xl rounded-2xl px-6">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {mode === "edit" ? "거래 수정" : "거래 추가"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* 1) 거래유형 + 금액 (가장 먼저) */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="ml-1">거래유형</Label>
              <Select
                value={type}
                onValueChange={(v) => setType(v as TransactionType)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">지출</SelectItem>
                  <SelectItem value="income">수입</SelectItem>
                  {/* <SelectItem value="transfer">이체</SelectItem> */}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount" className="ml-1">
                금액
              </Label>
              <Input
                id="amount"
                inputMode="numeric"
                placeholder="예: 18000"
                value={amountText}
                onChange={(e) => setAmountText(e.target.value)}
                className="focus-visible:border-sky-500/50 focus-visible:ring-sky-500/30 focus-visible:ring-[3px]"
              />
              {!isAmountValid && amountText.length > 0 && (
                <p className="text-xs text-red-600">
                  금액은 0보다 커야 합니다.
                </p>
              )}
            </div>
          </div>

          {/* 2) 카테고리 + 세부항목 */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="ml-1">카테고리</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="카테고리 선택" />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map((c) => (
                    <SelectItem key={c.id} value={c.name}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="ml-1">세부 항목(기능 추가 예정)</Label>
              <Input
                placeholder="예: 술, 카페, 배달"
                value={subcategoryText}
                onChange={(e) => setSubcategoryText(e.target.value)}
                className="focus-visible:border-sky-500/50 focus-visible:ring-sky-500/30 focus-visible:ring-[3px]"
              />
              {/* TODO(api 확장): subcategoryText 저장/검색/표시 */}
            </div>
          </div>

          {/* 3) 결제수단 + 카드사 (조건부) */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="ml-1">결제수단(기능 추가 예정)</Label>
              <Select
                value={paymentType}
                onValueChange={(v) => setPaymentType(v as any)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="결제수단 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">현금</SelectItem>
                  <SelectItem value="credit_card">신용카드</SelectItem>
                  <SelectItem value="debit_card">체크카드</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label
                className={`ml-1 ${paymentType === "cash" ? "text-gray-300" : ""}`}
              >
                카드사(기능 추가 예정)
              </Label>
              <Select
                value={cardProvider}
                onValueChange={setCardProvider}
                disabled={paymentType === "cash"}
              >
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={
                      paymentType === "cash"
                        ? "현금 선택 시 비활성화"
                        : "카드사 선택"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {CARD_PROVIDERS.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {paymentType !== "cash" && !cardProvider && (
                <p className="text-xs text-gray-500 ml-1">
                  카드사를 선택해주세요.
                </p>
              )}
            </div>
          </div>

          {/* 4) 날짜 (마지막 확인용) */}
          <div className="space-y-2">
            <Label htmlFor="date" className="ml-1">
              날짜
            </Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="focus-visible:border-sky-500/50 focus-visible:ring-sky-500/30 focus-visible:ring-[3px]"
            />
          </div>

          {/* 5) 메모 (마지막) */}
          <div className="space-y-2">
            <Label htmlFor="description" className="ml-1">
              메모
            </Label>
            <Textarea
              id="description"
              placeholder="선택사항"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[88px] focus-visible:border-sky-500/50 focus-visible:ring-sky-500/30 focus-visible:ring-[3px]"
            />
            {/* NOTE: 메모는 분석 집계에 사용하지 않음(검색/표시용) */}
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            취소
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={!canSubmit}>
            {isSaving ? "저장 중..." : "저장"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
