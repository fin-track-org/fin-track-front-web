/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { X, Bookmark, ChevronLeft, RotateCcw } from "lucide-react";

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
import { createSubCategory, getSubCategories } from "../lib/api/categoryApi";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getTransactionTemplates } from "../lib/api/transaction/templateApi";

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
    onSaveDraft,
    defaultValues,
    mode,
  } = props;

  const queryClient = useQueryClient();

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
  // Template & Quick Mode State
  // ----------------------------
  const [showAllTemplates, setShowAllTemplates] = useState(false);
  const [isQuickExpanded, setIsQuickExpanded] = useState(mode !== "quick");

  const { data: transactionTemplates = [] } = useQuery({
    queryKey: ["transactionTemplates"],
    queryFn: getTransactionTemplates,
    enabled: open && (mode === "create" || mode === "quick"),
  });

  const handleApplyTemplate = (template: any) => {
    setType(template.type);
    setAmountText(String(template.amount));
    setCategory(template.categoryId || "");
    setSubCategory(template.subcategoryId || "");
    setAccountId(template.accountId || "");
    setDescription(template.description || "");
    setShowAllTemplates(false);
    if (mode === "quick") {
      setIsQuickExpanded(true);
    }
  };

  const handleClearForm = () => {
    setType("EXPENSE");
    setAmountText("");
    setCategory("");
    setSubCategory("");
    setAccountId("");
    setDescription("");
    if (mode === "quick") {
      setIsQuickExpanded(false);
    }
  };

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

  // 임시저장: 날짜, 금액, 메모만 필요
  const canSaveDraft =
    Boolean(date) &&
    isAmountValid &&
    Boolean(description) &&
    !isSaving;

  // 등록(완전한 거래): 카테고리, 결제수단 필수 (세부 항목은 선택)
  const canRegister =
    Boolean(date) &&
    Boolean(category) &&
    isAmountValid &&
    Boolean(accountId) &&
    Boolean(description) &&
    !isSaving;

  // 기존 create/edit 모드는 등록 조건 사용
  const canSubmit = mode === "confirm-draft" ? canRegister : canRegister;

  // ----------------------------
  // Effects
  // ----------------------------

  // open될 때 type 기본값 리셋/반영
  useEffect(() => {
    if (!open) {
      setShowAllTemplates(false);
      return;
    }

    setIsQuickExpanded(mode !== "quick");

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

  // 수입일 때도 결제수단(입금 계좌)을 선택할 수 있도록 자동 설정 제거
  // useEffect(() => {
  //   if (type === "INCOME") {
  //     setAccountId("cash");
  //   }
  // }, [type]);

  useEffect(() => {
    const validCategoryNames = categoryOptions.map((c) => c.id);

    if (!validCategoryNames.includes(category)) {
      setCategory(categoryOptions[0]?.id ?? "");
      setSubCategory("");
    }
  }, [categoryOptions, category]);

  useEffect(() => {
    const list = mergedSubCategories;
    const exists = subCategory === "" || list.some((x) => x.id === subCategory);

    if (!exists) {
      setSubCategory("");
    }
  }, [mergedSubCategories, subCategory]);

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

      const created = await createSubCategory(selectedCategoryId, name);

      // 쿼리 캐시 갱신
      await queryClient.invalidateQueries({
        queryKey: ["subCategories", selectedCategoryId],
      });

      // 추가된 항목 즉시 선택
      setSubCategory(created.id);

      // 닫기 + 입력 리셋
      setSubCatAddOpen(false);
      setNewSubCatName("");
    } catch (e: any) {
      setSubCatError(e?.message || "세부 항목 추가에 실패했습니다.");
    } finally {
      setIsAddingSubCat(false);
    }
  }

  async function handleSaveDraft() {
    setError("");
    if (!canSaveDraft || !onSaveDraft) return;

    const payload: Partial<CreateTransactionPayload> = {
      date,
      type,
      amount: amountAbs,
      categoryId: category || undefined,
      subCategoryId: subCategory || undefined,
      accountId: accountId || undefined,
      description: description.trim() ? description.trim() : null,
    };

    try {
      setIsSaving(true);
      await onSaveDraft(payload);

      onOpenChange(false);

      setAmountText("");
      setDescription("");
    } catch (e: any) {
      setError(e?.message || "임시저장에 실패했습니다.");
    } finally {
      setIsSaving(false);
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
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
        >
          {/* backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

          <div className="relative w-full sm:max-w-xl mx-auto bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl p-6 space-y-5 animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:fade-in-0 duration-200 max-h-[90vh] overflow-y-auto">
            {/* 헤더 */}
            <div className="flex items-center justify-between pb-1">
              <h2 className="text-xl font-bold text-gray-800">
                {mode === "edit" ? "거래 수정" : mode === "confirm-draft" ? "임시 내역 분류" : mode === "quick" ? "빠른 거래 추가" : "거래 추가"}
              </h2>
              <button
                onClick={() => onOpenChange(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="닫기"
              >
                <X size={24} />
              </button>
            </div>

            {(mode === "create" || mode === "quick") && (
              <div className="flex flex-wrap items-center gap-2 pb-1 transition-all duration-200">
                <button
                  type="button"
                  onClick={handleClearForm}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full text-xs font-medium transition-colors"
                >
                  <RotateCcw size={12} /> 비우기
                </button>

                {transactionTemplates.slice(0, showAllTemplates ? undefined : 5).map(template => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => handleApplyTemplate(template)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-full text-xs font-medium text-gray-700 transition-colors max-w-[140px]"
                  >
                    <span className="text-[10px] flex-shrink-0">{template.type === 'EXPENSE' ? '📉' : '📈'}</span>
                    <span className="truncate">{template.title}</span>
                  </button>
                ))}
                {transactionTemplates.length > 5 && (
                  <button
                    type="button"
                    onClick={() => setShowAllTemplates(!showAllTemplates)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${showAllTemplates ? 'bg-gray-100 hover:bg-gray-200 text-gray-700' : 'bg-sky-50 hover:bg-sky-100 border border-sky-100 text-sky-700'}`}
                  >
                    <Bookmark size={12} /> {showAllTemplates ? '접기' : '더보기'}
                  </button>
                )}
              </div>
            )}

            <div className="space-y-5">
              {/* 1) 거래유형 + 금액 (가장 먼저) */}
              <div className={`grid grid-cols-1 gap-4 transition-all duration-300 ${isQuickExpanded ? 'md:grid-cols-2' : ''}`}>
                <div className={`space-y-2 transition-all duration-300 overflow-hidden ${isQuickExpanded ? 'max-h-[100px] opacity-100' : 'max-h-0 opacity-0 !m-0'}`}>
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
                  <div className="flex justify-between items-center ml-1">
                    <Label htmlFor="amount">금액</Label>
                    {(mode === "quick" || mode === "create") && (
                      <button
                        type="button"
                        onClick={() => setIsQuickExpanded(!isQuickExpanded)}
                        className="text-xs text-sky-600 hover:underline transition-colors"
                      >
                        {isQuickExpanded ? "빠른 등록으로 전환" : "상세 등록으로 전환"}
                      </button>
                    )}
                  </div>
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

              {/* 2) 카테고리 + 세부항목 (애니메이션 래퍼) */}
              <div
                className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${isQuickExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                  }`}
              >
                <div className="overflow-hidden space-y-5">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 pt-1">
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
                        className={`ml-1 ${currentSubCats.length === 0 ? "text-gray-300" : ""}`}
                      >
                        세부 항목
                      </Label>
                      <Select
                        value={subCategory}
                        onValueChange={(v) => setSubCategory(v === "__none__" ? "" : v)}
                        disabled={currentSubCats.length === 0}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="-" />
                        </SelectTrigger>

                        <SelectContent>
                          <SelectItem value="__none__">-</SelectItem>
                          {currentSubCats.map((sc) => (
                            <SelectItem key={sc.id} value={sc.id}>
                              {sc.name}
                            </SelectItem>
                          ))}

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
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* 3) 결제수단 / 입금 계좌 */}
                  <div
                    className={`grid grid-cols-1 gap-4 ${isAccountIdCash ? "md:grid-cols-1" : " md:grid-cols-2"}`}
                  >
                    <div className="space-y-2">
                      <Label className="ml-1">
                        {isIncomeType ? "입금 계좌" : "결제수단"}
                      </Label>
                      {accounts.length === 0 ? (
                        <div className="flex items-center h-9 w-full rounded-md border border-input bg-muted px-3 text-sm text-muted-foreground">
                          {isIncomeType ? "등록된 계좌가 없습니다" : "등록된 결제수단이 없습니다"}
                        </div>
                      ) : (
                        <Select value={accountId} onValueChange={setAccountId}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder={isIncomeType ? "입금 계좌 선택" : "결제수단 선택"} />
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
                  </div>
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
                  placeholder="예: 스타벅스 - 아이스 아메리카노"
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

            <div className="flex gap-2 justify-end mt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => onOpenChange(false)}
                disabled={isSaving}
              >
                취소
              </Button>

              {mode === "quick" && !isQuickExpanded ? (
                <Button type="button" onClick={handleSaveDraft} disabled={!canSaveDraft}>
                  {isSaving ? "저장 중..." : "임시 저장"}
                </Button>
              ) : (
                <>
                  {(mode === "confirm-draft" || mode === "quick") && onSaveDraft && (
                    <Button
                      type="button"
                      onClick={handleSaveDraft}
                      disabled={!canSaveDraft}
                      className="bg-amber-100 text-amber-800 hover:bg-amber-200 border border-amber-200 hover:border-amber-300"
                    >
                      {isSaving ? "저장 중..." : "임시저장"}
                    </Button>
                  )}
                  <Button type="button" onClick={handleSubmit} disabled={!canSubmit}>
                    {isSaving
                      ? mode === "edit"
                        ? "수정 중..."
                        : "등록 중..."
                      : mode === "edit"
                        ? "수정"
                        : "등록"}
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

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
