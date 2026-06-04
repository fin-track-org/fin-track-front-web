/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";

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
import { toNumberOrNaN } from "../hook/useTransaction";
import { createSubCategory, getSubCategories } from "../lib/api/categoryApi";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { TransactionTemplatePayload } from "../lib/api/transaction/templateApi";

interface AddTemplateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: any[];
  accounts: any[];
  onSubmit: (payload: TransactionTemplatePayload) => Promise<void>;
  defaultValues?: Partial<TransactionTemplatePayload>;
}

export default function AddTemplateModal(props: AddTemplateModalProps) {
  const {
    open,
    onOpenChange,
    categories,
    accounts,
    onSubmit,
    defaultValues,
  } = props;

  const queryClient = useQueryClient();

  // ----------------------------
  // Form State
  // ----------------------------
  const [title, setTitle] = useState<string>(defaultValues?.title ?? "");
  const [type, setType] = useState<"EXPENSE" | "INCOME" | "TRANSFER">(
    defaultValues?.type ?? "EXPENSE"
  );

  const [category, setCategory] = useState<string>(
    defaultValues?.categoryId ?? ""
  );
  const [subCategory, setSubCategory] = useState<string>(
    defaultValues?.subcategoryId ?? ""
  );

  const [accountId, setAccountId] = useState<string>(
    defaultValues?.accountId ?? ""
  );

  const [description, setDescription] = useState<string>(
    defaultValues?.description ?? ""
  );

  const [amountText, setAmountText] = useState<string>(
    defaultValues?.amount != null ? String(defaultValues.amount) : ""
  );

  // ----------------------------
  // SubCategory (Custom Add)
  // ----------------------------
  const [customSubCategories, setCustomSubCategories] = useState<
    Record<string, any[]>
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

  const amountAbs = useMemo(() => toNumberOrNaN(amountText), [amountText]);
  const isAmountValid = Number.isFinite(amountAbs) && amountAbs > 0;

  const canSubmit =
    Boolean(title.trim()) &&
    Boolean(category) &&
    isAmountValid &&
    Boolean(accountId) &&
    !isSaving;

  // ----------------------------
  // Effects
  // ----------------------------
  useEffect(() => {
    if (!open) return;

    if (!defaultValues) {
      setType("EXPENSE");
      return;
    }

    if (defaultValues.type) {
      setType(defaultValues.type);
    }
  }, [open, defaultValues]);

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
    } catch {
      // ignore
    }
  }, [open, defaultValues, type, categories]);

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

    setTitle(defaultValues?.title ?? "");
    setType(defaultValues?.type ?? "EXPENSE");
    setCategory(defaultValues?.categoryId ?? "");
    setSubCategory(defaultValues?.subcategoryId ?? "");
    setAccountId(defaultValues?.accountId ?? "");
    setDescription(defaultValues?.description ?? "");
    setAmountText(
      defaultValues?.amount != null ? String(defaultValues.amount) : ""
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

    const normalized = name.replace(/\s+/g, "").toLowerCase();
    const dup = currentSubCats.some(
      (x) => x.name.replace(/\s+/g, "").toLowerCase() === normalized
    );
    if (dup) {
      setSubCatError("이미 존재하는 세부 항목입니다.");
      return;
    }

    try {
      setIsAddingSubCat(true);
      const created = await createSubCategory(selectedCategoryId, name);

      await queryClient.invalidateQueries({
        queryKey: ["subCategories", selectedCategoryId],
      });

      setSubCategory(created.id);
      setSubCatAddOpen(false);
      setNewSubCatName("");
    } catch (e: any) {
      setSubCatError(e?.message || "세부 항목 추가에 실패했습니다.");
    } finally {
      setIsAddingSubCat(false);
    }
  }

  async function handleSubmit() {
    setError("");
    if (!canSubmit) return;

    const payload: TransactionTemplatePayload = {
      title: title.trim(),
      type,
      amount: amountAbs,
      categoryId: category,
      subcategoryId: subCategory,
      accountId,
      description: description.trim() ? description.trim() : null,
    };

    try {
      setIsSaving(true);
      await onSubmit(payload);
      onOpenChange(false);

      setTitle("");
      setAmountText("");
      setDescription("");
    } catch (e: any) {
      setError(e?.message || "템플릿 저장에 실패했습니다.");
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
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-800">
                자주 사용하는 거래 추가
              </h2>
              <button
                onClick={() => onOpenChange(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="닫기"
              >
                <X size={24} />
              </button>
            </div>

          <div className="space-y-5">
            {/* 템플릿 이름 */}
            <div className="space-y-2">
              <Label htmlFor="title" className="ml-1">
                템플릿 이름 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                placeholder="예: 스타벅스 아메리카노 (최대 15자)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={15}
                className="focus-visible:border-sky-500/50 focus-visible:ring-sky-500/30 focus-visible:ring-[3px]"
              />
            </div>

            {/* 거래유형 + 금액 */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="ml-1">거래유형</Label>
                <Select
                  value={type}
                  onValueChange={(v) => setType(v as "EXPENSE" | "INCOME")}
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
                  금액 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="amount"
                  inputMode="numeric"
                  placeholder="예: 4500"
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

            {/* 카테고리 + 세부항목 */}
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
                  className={`ml-1 ${currentSubCats.length === 0 ? "text-gray-300" : ""}`}
                >
                  세부 항목
                </Label>
                <Select
                  value={subCategory}
                  onValueChange={(v) =>
                    setSubCategory(v === "__none__" ? "" : v)
                  }
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

            {/* 결제수단 */}
            <div className="space-y-2">
              <Label className="ml-1">
                {isIncomeType ? "입금 계좌" : "결제수단"} <span className="text-red-500">*</span>
              </Label>
              {accounts.length === 0 ? (
                <div className="flex items-center h-9 w-full rounded-md border border-input bg-muted px-3 text-sm text-muted-foreground">
                  {isIncomeType
                    ? "등록된 계좌가 없습니다"
                    : "등록된 결제수단이 없습니다"}
                </div>
              ) : (
                <Select value={accountId} onValueChange={setAccountId}>
                  <SelectTrigger className="w-full">
                    <SelectValue
                      placeholder={
                        isIncomeType ? "입금 계좌 선택" : "결제수단 선택"
                      }
                    />
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

            {/* 메모 */}
            <div className="space-y-2">
              <Label htmlFor="description" className="ml-1">
                메모 (선택)
              </Label>
              <Textarea
                id="description"
                placeholder="예: 출근길 커피"
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
            <Button type="button" onClick={handleSubmit} disabled={!canSubmit}>
              {isSaving ? "저장 중..." : "저장"}
            </Button>
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
