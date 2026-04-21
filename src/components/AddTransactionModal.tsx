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
import { todayISODateSeoul, toNumberOrNaN } from "../hook/useTransaction";
import { getSubCategories } from "../lib/api/categoryApi";
import { useQuery } from "@tanstack/react-query";

/* const CARD_PROVIDERS = [
  { id: "SAMSUNG", name: "삼성" },
  { id: "KB", name: "국민" },
  { id: "HYUNDAI", name: "현대" },
  { id: "SHINHAN", name: "신한" },
  { id: "WOORI", name: "우리" },
  { id: "HANA", name: "하나" },
  { id: "LOTTE", name: "롯데" },
  { id: "NH", name: "NH" },
] as const; */

export default function AddTransactionModal(props: AddTransactionModalProps) {
  const {
    open,
    onOpenChange,
    categories,
    accounts,
    onSubmit,
    defaultValues,
    mode,
  } = props;

  // ----------------------------
  // 초기값
  // ----------------------------
  const initialDate = defaultValues?.date ?? todayISODateSeoul();
  const initialType = defaultValues?.type ?? "EXPENSE";

  // ----------------------------
  // Form State
  // ----------------------------
  const [date, setDate] = useState<string>(initialDate);
  const [type, setType] = useState<TransactionType>(initialType);

  const [category, setCategory] = useState<string>(
    defaultValues?.categoryId ?? "",
  );
  const [subCategory, setSubCategory] = useState<string>(
    defaultValues?.subCategoryId ?? "",
  );

  const [accountId, setAccountId] = useState<string>(
    defaultValues?.accountId ?? "",
  );

  const [description, setDescription] = useState<string>(
    defaultValues?.description ?? "",
  );

  const [amountText, setAmountText] = useState<string>(
    defaultValues?.amount != null ? String(defaultValues.amount) : "",
  );

  // ----------------------------
  // SubCategory (Custom Add)
  // ----------------------------
  const [customSubCategories, setCustomSubCategories] = useState<
    Record<string, SubCategory[]>
  >({});
  const [subCatAddOpen, setSubCatAddOpen] = useState<boolean>(false);

  const [newSubCatName, setNewSubCatName] = useState<string>("");
  const [isAddingSubCat, setIsAddingSubCat] = useState<boolean>(false);
  const [subCatError, setSubCatError] = useState<string>("");

  // ----------------------------
  // Save State
  // ----------------------------
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string>("");

  // ----------------------------
  // Derived
  // ----------------------------
  const categoryOptions = useMemo(() => {
    if (type === "EXPENSE") {
      return categories.filter((c) => c.type === "EXPENSE");
    }

    if (type === "INCOME") {
      return categories.filter((c) => c.type === "INCOME");
    }

    return categories;
  }, [categories, type]);

  const isIncomeType = type === "INCOME";

  const isAccountIdCash = accountId === "cash";

  const selectedCategory = useMemo(() => {
    return categories.find((c) => c.id === category);
  }, [categories, category]);

  const selectedCategoryId = selectedCategory?.id ?? "";
  const selectedCategoryCode = selectedCategory?.code ?? "";

  /* 세부 항목 (소분류) 조회 */
  const { data: fetchedSubCategories = [] } = useQuery({
    queryKey: ["subCategories", selectedCategoryId],
    queryFn: () => getSubCategories(selectedCategoryId),
    enabled: open && !!selectedCategoryId,
    staleTime: 1000 * 60 * 5,
  });

  const mergedSubCategories = useMemo(() => {
    const base = fetchedSubCategories.map((item) => ({
      id: item.id,
      name: item.name,
    }));

    const custom = customSubCategories[selectedCategoryCode] ?? [];
    const map = new Map([...base, ...custom].map((x) => [x.name, x]));
    return Array.from(map.values());
  }, [fetchedSubCategories, customSubCategories, selectedCategoryCode]);

  const currentSubCats = mergedSubCategories;

  console.log(currentSubCats);

  const amountAbs = useMemo(() => toNumberOrNaN(amountText), [amountText]);
  const isAmountValid = Number.isFinite(amountAbs) && amountAbs > 0;

  const isEtcCategory =
    selectedCategory?.code === "ETC_EXPENSE" ||
    selectedCategory?.code === "ETC_INCOME";

    // jsg [2026.04.21] accountId는 일단 필수에서 제외 -> 백엔드에서 현금 작업 후 필수로 변경 예정
  const canSubmit =
    Boolean(date) &&
    Boolean(category) &&
    (isEtcCategory ? true : Boolean(subCategory)) &&
    isAmountValid &&
    !isSaving &&
    // Boolean(accountId) &&
    Boolean(description);

  // ----------------------------
  // Effects
  // ----------------------------

  // open될 때 type 기본값 리셋/반영
  useEffect(() => {
    if (!open) return;

    // 추가 모드: 항상 지출로 시작
    if (!defaultValues) {
      setType("EXPENSE");
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
      const initialCategory =
        type === "INCOME"
          ? (categories.find((c) => c.type === "INCOME")?.id ?? "")
          : (categories.find((c) => c.type === "EXPENSE")?.id ?? "");

      setCategory(initialCategory);
      setSubCategory("");
      setDate(todayISODateSeoul());
    } catch {
      // ignore
    }
  }, [open, defaultValues, type, categories]);

  useEffect(() => {
    if (type === "INCOME") {
      setAccountId("cash");
    }
  }, [type]);

  useEffect(() => {
    const validCategoryNames = categoryOptions.map((c) => c.id);

    if (!validCategoryNames.includes(category)) {
      setCategory(categoryOptions[0]?.id ?? "");
      setSubCategory("");
    }
  }, [categoryOptions, category]);

  useEffect(() => {
    if (isEtcCategory) {
      setSubCategory("");
      return;
    }

    const list = mergedSubCategories;
    const exists = list.some((x) => x.id === subCategory);

    if (!exists) {
      setSubCategory(list[0]?.id ?? "");
    }
  }, [mergedSubCategories, subCategory, isEtcCategory]);

  useEffect(() => {
    if (!open) return;

    setDate(defaultValues?.date ?? todayISODateSeoul());
    setType(defaultValues?.type ?? "EXPENSE");
    setCategory(defaultValues?.categoryId ?? "");
    setSubCategory(defaultValues?.subCategoryId ?? "");
    setAccountId(defaultValues?.accountId ?? "");
    setDescription(defaultValues?.description ?? "");
    setAmountText(
      defaultValues?.amount != null ? String(defaultValues.amount) : "",
    );
    setError("");
    setSubCatError("");
  }, [open, defaultValues]);

  // ----------------------------
  // Handlers
  // ----------------------------

  async function handleAddSubCategory() {
    setSubCatError("");

    if (!category) {
      setSubCatError("먼저 카테고리를 선택해주세요.");
      return;
    }

    const name = newSubCatName.trim();
    if (!name) {
      setSubCatError("세부 항목 이름을 입력해주세요.");
      return;
    }

    // 중복 검사(대소문자/공백 무시)
    const normalized = name.replace(/\s+/g, "").toLowerCase();
    const dup = currentSubCats.some(
      (x) => x.name.replace(/\s+/g, "").toLowerCase() === normalized,
    );
    if (dup) {
      setSubCatError("이미 존재하는 세부 항목입니다.");
      return;
    }

    try {
      setIsAddingSubCat(true);

      const id = `CUSTOM_${selectedCategoryCode}_${Date.now()}`;
      const created: SubCategory = {
        id,
        categoryId: selectedCategoryId,
        name,
        sortOrder: currentSubCats.length,
        isSystem: false,
      };

      setCustomSubCategories((prev) => {
        const existing = prev[selectedCategoryCode] ?? [];
        return { ...prev, [selectedCategoryCode]: [...existing, created] };
      });

      // 추가 후 즉시 선택
      setSubCategory(name);

      // 닫기 + 입력 리셋
      setSubCatAddOpen(false);
      setNewSubCatName("");
    } finally {
      setIsAddingSubCat(false);
    }
  }

  async function handleSubmit() {
    setError("");
    if (!canSubmit) return;

    const payload: CreateTransactionPayload = {
      date,
      type,
      amount: amountAbs,
      categoryId: category,
      subCategoryId: subCategory,
      description: description.trim() ? description.trim() : null,
      accountId,
    };

    try {
      setIsSaving(true);
      await onSubmit(payload);

      onOpenChange(false);

      // 빠른 입력용 리셋(원하면 유지해도 됨)
      setAmountText("");
      setDescription("");
    } catch (e: any) {
      setError(e?.message || "저장에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  }

  // ----------------------------
  // Render
  // ----------------------------
  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          aria-describedby={description}
          className="w-[calc(100%-2rem)] max-w-xl rounded-2xl px-6"
        >
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
                    <SelectItem value="EXPENSE">지출</SelectItem>
                    <SelectItem value="INCOME">수입</SelectItem>
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
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label
                  className={`ml-1 ${isEtcCategory || currentSubCats.length === 0 ? "text-gray-300" : ""}`}
                >
                  세부 항목
                </Label>
                <Select
                  value={subCategory}
                  onValueChange={setSubCategory}
                  disabled={isEtcCategory || currentSubCats.length === 0}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue
                      placeholder={
                        isEtcCategory
                          ? "기타는 세부 항목이 없습니다"
                          : currentSubCats.length === 0
                            ? "세부 항목이 없습니다"
                            : "세부 항목 선택"
                      }
                    />
                  </SelectTrigger>

                  <SelectContent>
                    {currentSubCats.map((sc) => (
                      <SelectItem key={sc.id} value={sc.id}>
                        {sc.name}
                      </SelectItem>
                    ))}

                    {!isEtcCategory && (
                      <div className="border-t mt-1 pt-1">
                        <Button
                          size={"sm"}
                          type="button"
                          variant="ghost"
                          className="w-full justify-start"
                          onClick={() => {
                            setSubCatError("");
                            setNewSubCatName("");
                            setSubCatAddOpen(true);
                          }}
                        >
                          + 세부 항목 추가
                        </Button>
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 3) 결제수단 + 카드사 (지출일 때만) */}
            {!isIncomeType && (
              <div
                className={`grid grid-cols-1 gap-4 ${isAccountIdCash ? "md:grid-cols-1" : " md:grid-cols-2"}`}
              >
                <div className="space-y-2">
                  <Label className="ml-1">결제수단</Label>
                  {accounts.length === 0 ? (
                    <div className="flex items-center h-9 w-full rounded-md border border-input bg-muted px-3 text-sm text-muted-foreground">
                      등록된 결제수단이 없습니다
                    </div>
                  ) : (
                    <Select value={accountId} onValueChange={setAccountId}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="결제수단 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts.map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* {!isAccountIdCash && (
                  <div className="space-y-2">
                    <Label
                      className={`ml-1 ${accountId === "cash" ? "text-gray-300" : ""}`}
                    >
                      카드사(기능 추가 예정)
                    </Label>
                    <Select
                      value={cardProvider}
                      onValueChange={setCardProvider}
                      disabled={accountId === "cash"}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue
                          placeholder={
                            accountId === "cash"
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

                    {accountId !== "cash" && !cardProvider && (
                      <p className="text-xs text-gray-500 ml-1">
                        카드사를 선택해주세요.
                      </p>
                    )}
                  </div>
                )} */}
              </div>
            )}

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
              {isSaving
                ? mode === "edit"
                  ? "수정 중..."
                  : "저장 중..."
                : mode === "edit"
                  ? "수정"
                  : "저장"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 세부항목 추가 다이얼로그 */}
      <Dialog open={subCatAddOpen} onOpenChange={setSubCatAddOpen}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-md rounded-2xl px-6">
          <DialogHeader>
            <DialogTitle className="text-lg">세부 항목 추가</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="ml-1">이름</Label>
              <Input
                value={newSubCatName}
                onChange={(e) => setNewSubCatName(e.target.value)}
                placeholder="세부 항목 내용"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddSubCategory();
                }}
                className="focus-visible:border-sky-500/50 focus-visible:ring-sky-500/30 focus-visible:ring-[3px]"
              />
            </div>

            {subCatError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {subCatError}
              </div>
            )}
          </div>

          <DialogFooter className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setSubCatAddOpen(false)}
              disabled={isAddingSubCat}
            >
              취소
            </Button>
            <Button
              type="button"
              onClick={handleAddSubCategory}
              disabled={isAddingSubCat}
            >
              {isAddingSubCat ? "추가 중..." : "추가"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
