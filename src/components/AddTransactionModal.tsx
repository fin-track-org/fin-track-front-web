/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";
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
import { useUserSettings } from "@/src/hook/useUserSettings";
import { AuthError } from "../lib/api/authError";
import { AmountInput } from "@/src/components/ledger/AmountInput";
import { TransactionTypeSegment, type SegmentType } from "@/src/components/ledger/TransactionTypeSegment";

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
    isTutorialMode,
    queueProgress,
    onSkipRemaining,
    autoCloseOnSubmit = true,
    transitionKey,
    suggestionHint,
  } = props;

  const queryClient = useQueryClient();
  const { userSetting } = useUserSettings();
  const isSimpleMode = userSetting?.ledgerMode === "SIMPLE";

  // 큐(연속 분류) 모드나 빠른 기록 모드에서는 브랜드 상태 카피를 그대로 노출한다.
  const useBrandedErrorCopy = mode === "quick" || !!queueProgress;
  const resolveErrorMessage = (e: any, fallback: string): string => {
    if (e instanceof AuthError) return e.message;
    if (useBrandedErrorCopy) {
      return "저장하지 못했어요. 입력 내용은 그대로 보관하고 있어요.";
    }
    return e?.message || fallback;
  };

  // 모달 접근성: 열릴 때 내부로 포커스 이동, 닫히면 트리거로 복귀, Esc로 닫기
  const dialogContentRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);
  const dialogTitleId = "add-transaction-modal-title";

  // ----------------------------
  // 초기값
  // ----------------------------
  const initialDate = defaultValues?.date ?? todayISODateSeoul();
  const initialType = defaultValues?.type ?? "EXPENSE";

  // ----------------------------
  // Form State
  // ----------------------------
  const [date, setDate] = useState<string>(initialDate);
  type FormType = TransactionType | "TRANSFER";
  const [type, setType] = useState<FormType>(initialType as FormType);

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

  // Transfer / Savings State
  const [toAccountId, setToAccountId] = useState<string>(
    defaultValues?.toAccountId ?? "",
  );
  const [isSavings, setIsSavings] = useState<boolean>(
    defaultValues?.isSavings ?? false,
  );

  const selectedFromAccount = useMemo(() => accounts.find(a => a.id === accountId), [accounts, accountId]);
  const selectedToAccount = useMemo(() => accounts.find(a => a.id === toAccountId), [accounts, toAccountId]);
  
  const isSavingsAcc = (a?: { type: string }) => a?.type === "SAVINGS_INVESTMENT";

  const transferAccountType = type === "TRANSFER" 
    ? ((selectedFromAccount ? isSavingsAcc(selectedFromAccount) : selectedToAccount ? isSavingsAcc(selectedToAccount) : null) 
        ? "SAVINGS_INVESTMENT" 
        : (selectedFromAccount || selectedToAccount) ? "REGULAR" : null)
    : null;

  const getFromAccountOptions = () => {
    if (isSavings) return accounts.filter((a) => a.type !== "SAVINGS_INVESTMENT");
    if (type === "TRANSFER") {
      // 출발 계좌는 도착 계좌와 동일한 계좌만 제외하고 모두 보여주어 언제든 성격(일반/저축)을 바꿀 수 있게 합니다.
      return accounts.filter(a => a.id !== toAccountId);
    }
    return accounts;
  };

  const getToAccountOptions = () => {
    if (isSavings) return accounts.filter((a) => a.type === "SAVINGS_INVESTMENT");
    if (type === "TRANSFER") {
      if (selectedFromAccount) {
        // 출발 계좌와 성격(저축 계좌 여부)이 같으면서 자기 자신이 아닌 계좌만 필터링
        const isFromSavings = isSavingsAcc(selectedFromAccount);
        return accounts.filter(a => isSavingsAcc(a) === isFromSavings && a.id !== accountId);
      }
      return accounts.filter(a => a.id !== accountId);
    }
    return accounts;
  };

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
    setToAccountId("");
    setIsSavings(false);
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

  // 임시저장: 날짜, 금액만 있으면 가능 (메모 미입력 시 자동 채움)
  const canSaveDraft =
    Boolean(date) &&
    isAmountValid &&
    !isSaving;

  // 등록(완전한 거래): 카테고리, 결제수단 필수 (세부 항목은 선택)
  // TRANSFER 이거나 isSavings 인 경우 두 계좌 모두 필요. 카테고리는 무시됨.
  const canRegister = (type === "TRANSFER" || isSavings)
    ? Boolean(date) && isAmountValid && Boolean(accountId) && Boolean(toAccountId) && !isSaving
    : Boolean(date) && Boolean(category) && isAmountValid && Boolean(accountId) && !isSaving;

  // 기존 create/edit 모드는 등록 조건 사용
  const canSubmit = mode === "confirm-draft" ? canRegister : canRegister;

  // ----------------------------
  // Effects
  // ----------------------------

  const isPopStateTriggered = useRef(false);
  const onOpenChangeRef = useRef(onOpenChange);
  const isOpenRef = useRef(open);

  useEffect(() => {
    onOpenChangeRef.current = onOpenChange;
  }, [onOpenChange]);

  useEffect(() => {
    isOpenRef.current = open;
  }, [open]);

  useEffect(() => {
    if (open) {
      isPopStateTriggered.current = false;
      
      // 이미 히스토리가 쌓여있지 않은 경우에만 push
      if (window.history.state?.modal !== "AddTransactionModal") {
        window.history.pushState({ modal: "AddTransactionModal" }, "", window.location.href);
      }

      const handlePopState = () => {
        isPopStateTriggered.current = true;
        onOpenChangeRef.current(false);
      };

      window.addEventListener("popstate", handlePopState);

      return () => {
        window.removeEventListener("popstate", handlePopState);
        // 모달이 닫힐 때(unmount 또는 open=false) 히스토리를 정리하되,
        // StrictMode의 빠른 unmount/mount 사이클에서 즉시 뒤로가기가 실행되지 않도록 지연 처리
        if (!isPopStateTriggered.current) {
          setTimeout(() => {
            // 실제로 모달이 닫힌 상태이고 모달 히스토리가 남아있다면 뒤로가기 실행
            if (!isOpenRef.current && window.history.state?.modal === "AddTransactionModal") {
              window.history.back();
            }
          }, 50);
        }
      };
    }
  }, [open]);

  // 접근성: 모달이 열릴 때 내부 첫 입력 요소로 포커스를 옮기고,
  // 닫히면 모달을 연 트리거로 포커스를 되돌린다.
  useEffect(() => {
    if (open) {
      previouslyFocusedElementRef.current = document.activeElement as HTMLElement | null;
      const focusTimer = setTimeout(() => {
        const target = dialogContentRef.current?.querySelector<HTMLElement>(
          "input, select, textarea, button",
        );
        target?.focus();
      }, 0);
      return () => clearTimeout(focusTimer);
    }

    previouslyFocusedElementRef.current?.focus?.();
  }, [open]);

  // 접근성: Esc 키로 닫기 (취소와 동일하게 동작)
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onOpenChange(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

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
      if (type !== "TRANSFER") {
        setCategory("");
        setSubCategory("");
      }
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
    if (category === "") return;
    const validCategoryNames = categoryOptions.map((c) => c.id);

    if (!validCategoryNames.includes(category)) {
      setCategory("");
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
    setToAccountId(defaultValues?.toAccountId ?? "");
    setIsSavings(defaultValues?.isSavings ?? false);
    setDescription(defaultValues?.description ?? "");
    setAmountText(
      defaultValues?.amount != null ? String(defaultValues.amount) : "",
    );
    setError("");
    setSubCatError("");
  }, [open, defaultValues]);

  // 간편모드 & 저축/투자 체크 시 도착 계좌(저축/투자 계좌) 자동 선택 및 고정
  useEffect(() => {
    if (isSimpleMode && isSavings) {
      const systemSavingsAccount = accounts.find((a) => a.type === "SAVINGS_INVESTMENT" && a.isSystem) 
                                || accounts.find((a) => a.type === "SAVINGS_INVESTMENT");
      if (systemSavingsAccount && toAccountId !== systemSavingsAccount.id) {
        setToAccountId(systemSavingsAccount.id);
      }
    }
  }, [isSimpleMode, isSavings, accounts, toAccountId]);

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

    let finalDescription = description.trim();
    if (!finalDescription) {
      const subCatName = currentSubCats.find((sc) => sc.id === subCategory)?.name || "";
      const catName = categoryOptions.find((c) => c.id === category)?.name || "";
      
      if (subCatName) {
        finalDescription = subCatName;
      } else if (catName) {
        finalDescription = catName;
      } else if (type === "TRANSFER") {
        finalDescription = "이체";
      } else if (isSavings) {
        finalDescription = "저축";
      } else {
        finalDescription = "내용 없음";
      }
    }

    const payload: Partial<CreateTransactionPayload> = {
      date,
      type,
      amount: amountAbs,
      categoryId: category || undefined,
      subCategoryId: subCategory || undefined,
      accountId: accountId || undefined,
      description: finalDescription,
    };

    try {
      setIsSaving(true);
      await onSaveDraft(payload);

      if (autoCloseOnSubmit) {
        onOpenChange(false);
        setAmountText("");
        setDescription("");
      }
    } catch (e: any) {
      setError(resolveErrorMessage(e, "임시저장에 실패했습니다."));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSubmit() {
    setError("");
    if (!canSubmit) return;

    let finalDescription = description.trim();
    if (!finalDescription) {
      const subCatName = currentSubCats.find((sc) => sc.id === subCategory)?.name || "";
      const catName = categoryOptions.find((c) => c.id === category)?.name || "";
      
      if (subCatName) {
        finalDescription = subCatName;
      } else if (catName) {
        finalDescription = catName;
      } else if (type === "TRANSFER") {
        finalDescription = "이체";
      } else if (isSavings) {
        finalDescription = "저축";
      } else {
        finalDescription = "내용 없음";
      }
    }

    const payload: CreateTransactionPayload = {
      date,
      type,
      amount: amountAbs,
      categoryId: category,
      subCategoryId: subCategory,
      description: finalDescription,
      accountId,
      toAccountId,
      isSavings,
    };

    try {
      setIsSaving(true);
      await onSubmit(payload);

      if (autoCloseOnSubmit) {
        onOpenChange(false);
        // 빠른 입력용 리셋(원하면 유지해도 됨)
        setAmountText("");
        setDescription("");
      }
    } catch (e: any) {
      setError(resolveErrorMessage(e, "저장에 실패했습니다."));
    } finally {
      setIsSaving(false);
    }
  }

  const handleAccountIdChange = (val: string) => {
    setAccountId(val);
    if (type === "TRANSFER" && toAccountId) {
      const selected = accounts.find((a) => a.id === val);
      const toAcc = accounts.find((a) => a.id === toAccountId);
      if (selected && toAcc && isSavingsAcc(selected) !== isSavingsAcc(toAcc)) {
        setToAccountId(""); // clear mismatched destination
      }
    }
  };

  const handleToAccountIdChange = (val: string) => {
    setToAccountId(val);
    if (type === "TRANSFER" && accountId) {
      const selected = accounts.find((a) => a.id === val);
      const fromAcc = accounts.find((a) => a.id === accountId);
      if (selected && fromAcc && isSavingsAcc(selected) !== isSavingsAcc(fromAcc)) {
        setAccountId(""); // clear mismatched source
      }
    }
  };

  // ----------------------------
  // Render
  // ----------------------------
  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center"
        >
          {/* backdrop */}
          <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-sm" 
            onClick={() => onOpenChange(false)}
          />

          <div
            ref={dialogContentRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={dialogTitleId}
            className="relative w-full sm:max-w-xl mx-auto bg-white rounded-t-[1.75rem] sm:rounded-2xl shadow-[0_-8px_30px_rgba(0,0,0,0.12)] p-5 sm:p-6 pb-2 sm:pb-6 flex flex-col animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:fade-in-0 duration-300 max-h-[92dvh] sm:max-h-[90vh]"
          >

            <div
              key={transitionKey}
              className={`flex-1 overflow-y-auto space-y-6 pb-[calc(1rem+env(safe-area-inset-bottom))] px-1 custom-scrollbar ${
                transitionKey !== undefined ? "motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200" : ""
              }`}
            >
              {/* 모바일 손잡이(핸들) */}
              <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-5 sm:hidden" />

              {/* 헤더 */}
            <div className="flex items-center justify-between pb-1">
              <div className="min-w-0">
                <h2 id={dialogTitleId} className="text-xl font-bold text-gray-800 break-keep">
                  {queueProgress
                    ? `나중에 분류 · ${queueProgress.current}/${queueProgress.total}`
                    : mode === "edit"
                      ? "거래 수정"
                      : mode === "confirm-draft"
                        ? "임시 내역 분류"
                        : mode === "quick"
                          ? "빠른 기록"
                          : "거래 추가"}
                </h2>
                {queueProgress && (
                  <div className="mt-2 flex items-center gap-1" aria-hidden="true">
                    {Array.from({ length: queueProgress.total }).map((_, i) => (
                      <span
                        key={i}
                        className={`h-1.5 w-5 rounded-full ${
                          i < queueProgress.current - 1
                            ? "bg-ll-tomato"
                            : i === queueProgress.current - 1
                              ? "bg-ll-tomato/60"
                              : "bg-ll-cream"
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>
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
                    disabled={isTutorialMode}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-gray-700 transition-colors max-w-[140px] ${
                      isTutorialMode 
                        ? "bg-gray-100 opacity-50 cursor-not-allowed" 
                        : "bg-gray-50 hover:bg-gray-100 border border-gray-200"
                    }`}
                    title={isTutorialMode ? "튜토리얼 중에는 비활성화됩니다" : ""}
                  >
                    <span className="text-[10px] flex-shrink-0">{template.type === 'EXPENSE' ? '📉' : '📈'}</span>
                    <span className="truncate">{template.title}</span>
                  </button>
                ))}
                {transactionTemplates.length > 5 && (
                  <button
                    type="button"
                    onClick={() => setShowAllTemplates(!showAllTemplates)}
                    disabled={isTutorialMode}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      isTutorialMode
                        ? "bg-gray-100 opacity-50 cursor-not-allowed text-gray-400"
                        : showAllTemplates 
                          ? 'bg-gray-100 hover:bg-gray-200 text-gray-700' 
                          : 'bg-sky-50 hover:bg-sky-100 border border-sky-100 text-sky-700'
                    }`}
                    title={isTutorialMode ? "튜토리얼 중에는 비활성화됩니다" : ""}
                  >
                    <Bookmark size={12} /> {showAllTemplates ? '접기' : '더보기'}
                  </button>
                )}
              </div>
            )}

            <div className="space-y-5">
              {/* 1) 거래유형 (항상 표시, Segmented Control) */}
              <div className="space-y-2">
                {isQuickExpanded && <Label className="ml-1">거래유형</Label>}
                <TransactionTypeSegment
                  value={type as SegmentType}
                  onChange={(v) => setType(v)}
                  options={
                    !isSimpleMode && mode !== "quick" && mode !== "confirm-draft"
                      ? ["EXPENSE", "INCOME", "TRANSFER"]
                      : ["EXPENSE", "INCOME"]
                  }
                  labels={mode === "quick" ? { EXPENSE: "쓴 돈", INCOME: "들어온 돈" } : { TRANSFER: "이체/충전" }}
                  aria-label="거래유형"
                />
              </div>

              {/* 2) 금액 (빠른 등록 시 거대한 입력창) */}
              <div className={`space-y-2 transition-all duration-300 ${!isQuickExpanded ? 'py-4' : ''}`}>
                {type !== "TRANSFER" && (
                  <div className="flex items-center gap-2 px-1 mb-2">
                    <input
                      type="checkbox"
                      id="isSavings"
                      checked={isSavings}
                      onChange={(e) => setIsSavings(e.target.checked)}
                      className="w-4.5 h-4.5 text-sky-600 rounded border-gray-300 focus:ring-sky-600 cursor-pointer"
                    />
                    <Label htmlFor="isSavings" className="text-[15px] font-semibold cursor-pointer select-none text-sky-700">
                      이 거래를 저축/투자로 기록합니다
                    </Label>
                  </div>
                )}
                {mode === "quick" && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setIsQuickExpanded(!isQuickExpanded)}
                      disabled={isTutorialMode}
                      className={`text-xs transition-colors font-medium ${
                        isTutorialMode
                          ? "text-gray-400 cursor-not-allowed"
                          : "text-sky-600 hover:text-sky-700 hover:underline"
                      }`}
                      title={isTutorialMode ? "튜토리얼 중에는 비활성화됩니다" : ""}
                    >
                      {isTutorialMode ? "튜토리얼 중 비활성화" : (isQuickExpanded ? "빠른 등록으로 전환" : "상세 폼 열기")}
                    </button>
                  </div>
                )}

                <AmountInput
                  id="amount"
                  hideLabel={!isQuickExpanded}
                  size={!isQuickExpanded ? "hero" : "field"}
                  placeholder={!isQuickExpanded ? "얼마인가요?" : "예: 18,000"}
                  value={amountText ? amountAbs : null}
                  onChange={(v) => setAmountText(v != null ? v.toLocaleString() : "")}
                  quickAmounts={!isQuickExpanded ? [10000, 50000, 100000] : []}
                  error={!isAmountValid && amountText.length > 0 ? "금액은 0보다 커야 합니다." : undefined}
                />
              </div>

              {/* 2) 카테고리 + 세부항목 (애니메이션 래퍼) */}
              <div
                className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${
                  isQuickExpanded && type !== "TRANSFER" && !isSavings
                    ? "grid-rows-[1fr] opacity-100" 
                    : "grid-rows-[0fr] opacity-0"
                }`}
              >
                <div className="overflow-hidden space-y-5">
                  <div className="space-y-4 pt-1">
                    <div className="space-y-2.5">
                      {suggestionHint && (
                        <p className="ml-1 -mt-1 mb-1 text-xs font-medium text-ll-pencil">
                          💡 {suggestionHint}
                        </p>
                      )}
                      <Label className="ml-1 text-sm font-semibold text-gray-700">카테고리</Label>
                      <div className="flex flex-wrap gap-2">
                        {categoryOptions.map((c) => {
                          const isSelected = category === c.id;
                          return (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => {
                                setCategory(isSelected ? "" : c.id);
                                if (isSelected) setSubCategory(""); // 카테고리 취소 시 세부항목도 초기화
                              }}
                              className={`px-3 py-1.5 rounded-[10px] text-[13px] font-bold transition-all duration-200 ease-in-out whitespace-nowrap ${
                                category && !isSelected
                                  ? "bg-white text-gray-400 border border-gray-100 opacity-50 scale-[0.98] hover:opacity-80"
                                  : isSelected 
                                    ? "bg-gray-800 text-white shadow-md scale-100 border border-gray-800" 
                                    : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200 scale-100"
                              }`}
                            >
                              {c.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className={`space-y-2.5 transition-all duration-300 ${!category ? "hidden" : "block"}`}>
                      <Label className="ml-1 text-sm font-semibold text-gray-700">세부 항목</Label>
                      <div className="flex flex-wrap gap-2">
                        {currentSubCats.map((sc) => {
                          const isSelected = subCategory === sc.id;
                          return (
                            <button
                              key={sc.id}
                              type="button"
                              onClick={() => setSubCategory(isSelected ? "" : sc.id)}
                              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                                isSelected 
                                  ? "bg-sky-50 text-sky-700 border-sky-300 shadow-sm" 
                                  : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
                              }`}
                            >
                              {sc.name}
                            </button>
                          );
                        })}
                        {category && (
                          <button
                            type="button"
                            onClick={() => {
                              setSubCatError("");
                              setNewSubCatName("");
                              setSubCatAddOpen(true);
                            }}
                            className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-gray-50 text-gray-400 border border-dashed border-gray-300 hover:bg-gray-100 hover:text-gray-600 transition-all"
                          >
                            + 추가
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3) 결제수단 / 계좌 선택 (애니메이션 래퍼) */}
              <div
                className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${
                  isQuickExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                }`}
              >
                <div className="overflow-hidden space-y-4">
                  {type === "TRANSFER" && transferAccountType && (
                    <div className="text-sm font-medium text-purple-700 bg-purple-50 px-3 py-2 rounded-lg text-center mx-1 mt-1 border border-purple-100">
                      {transferAccountType === "SAVINGS_INVESTMENT" ? "저축 계좌 간 이체" : "일반 계좌 간 이체"}
                    </div>
                  )}
                  <div
                    className={`grid grid-cols-1 gap-4 pt-1 ${(isAccountIdCash && type !== "TRANSFER" && !isSavings) ? "md:grid-cols-1" : "md:grid-cols-2"}`}
                  >
                    <div className="space-y-2">
                      <Label className="ml-1">
                        {type === "TRANSFER" 
                          ? "출발 계좌 (출금)" 
                          : isIncomeType 
                            ? "입금 계좌" 
                            : (isSavings ? "결제수단 (출금)" : "결제수단")}
                      </Label>
                      {getFromAccountOptions().length === 0 ? (
                        <div className="flex items-center h-9 w-full rounded-md border border-input bg-muted px-3 text-sm text-muted-foreground">
                          {accounts.length === 0 ? (isIncomeType ? "등록된 계좌가 없습니다" : "등록된 결제수단이 없습니다") : "선택 가능한 계좌가 없습니다"}
                        </div>
                      ) : (
                        <Select value={accountId} onValueChange={handleAccountIdChange}>
                          <SelectTrigger className="w-full h-12 sm:h-10 text-base sm:text-sm rounded-xl">
                            <SelectValue placeholder="선택" />
                          </SelectTrigger>
                          <SelectContent>
                            {getFromAccountOptions().map((a) => (
                              <SelectItem key={a.id} value={a.id}>
                                {a.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                    
                    {(type === "TRANSFER" || isSavings) && (
                      <div className="space-y-2">
                        <Label className="ml-1">
                          {type === "TRANSFER" 
                            ? "도착 계좌 (입금)" 
                            : type === "INCOME" 
                              ? "출발 계좌 (저축계좌)" 
                              : "도착 계좌 (저축계좌)"}
                        </Label>
                        {getToAccountOptions().length === 0 ? (
                          <div className="flex items-center h-9 w-full rounded-md border border-input bg-muted px-3 text-sm text-muted-foreground">
                            {accounts.length === 0 ? "등록된 계좌가 없습니다" : "선택 가능한 도착 계좌가 없습니다"}
                          </div>
                        ) : (
                          <Select value={toAccountId} onValueChange={handleToAccountIdChange} disabled={isSimpleMode && isSavings}>
                            <SelectTrigger className="w-full h-12 sm:h-10 text-base sm:text-sm rounded-xl">
                              <SelectValue placeholder="선택" />
                            </SelectTrigger>
                            <SelectContent>
                              {getToAccountOptions().map((a) => (
                                <SelectItem key={a.id} value={a.id}>
                                  {a.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    )}
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
                  className="h-12 sm:h-10 text-base sm:text-sm focus-visible:border-sky-500/50 focus-visible:ring-sky-500/30 focus-visible:ring-[3px] rounded-xl"
                />
              </div>

              {/* 5) 메모 (마지막) */}
              <div className="space-y-2">
                <Label htmlFor="description" className="ml-1">
                  메모
                </Label>
                <Textarea
                  id="description"
                  placeholder="예: 스타벅스 (미입력 시 세부 항목/카테고리로 자동 입력)"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-[100px] text-base sm:text-sm focus-visible:border-sky-500/50 focus-visible:ring-sky-500/30 focus-visible:ring-[3px] rounded-xl resize-none"
                />
              </div>

              {error && (
                <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}
            </div>

            </div>

            <div className="sticky bottom-0 bg-gradient-to-t from-white via-white to-white/90 pt-4 pb-[env(safe-area-inset-bottom)] mt-auto z-10">
              {queueProgress ? (
                // "나중에 분류" 연속 처리 전용 푸터: 나머지는 다음에 / (임시저장) / 저장하고 다음
                <div className="flex flex-wrap items-center justify-between gap-2.5 w-full">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => (onSkipRemaining ? onSkipRemaining() : onOpenChange(false))}
                    disabled={isSaving}
                    className="h-11 text-sm font-bold rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700"
                  >
                    나머지는 다음에
                  </Button>
                  <div className="flex items-center gap-3 ml-auto">
                    {onSaveDraft && (
                      <button
                        type="button"
                        onClick={handleSaveDraft}
                        disabled={!canSaveDraft}
                        className="min-h-[44px] px-2 text-xs font-semibold text-gray-500 underline underline-offset-2 hover:text-gray-700 disabled:opacity-40"
                      >
                        {isSaving ? "저장 중..." : "임시저장"}
                      </button>
                    )}
                    <Button
                      type="button"
                      onClick={handleSubmit}
                      disabled={!canSubmit}
                      className="h-11 text-sm font-bold rounded-xl bg-ll-tomato hover:bg-ll-tomato/90"
                    >
                      {isSaving ? "저장 중..." : "저장하고 다음 →"}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2.5 sm:gap-2 justify-end w-full">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => onOpenChange(false)}
                    disabled={isSaving}
                    className="h-14 sm:h-11 text-base sm:text-sm font-bold flex-1 sm:flex-none rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700"
                  >
                    취소
                  </Button>

                  {mode === "quick" && !isQuickExpanded ? (
                    <Button type="button" onClick={handleSaveDraft} disabled={!canSaveDraft} className="h-14 sm:h-11 text-base sm:text-sm font-bold flex-1 sm:flex-none rounded-xl bg-ll-tomato hover:bg-ll-tomato/90">
                      {isSaving ? "기록하는 중..." : "일단 기록해두기 →"}
                    </Button>
                  ) : (
                    <>
                      {(mode === "confirm-draft" || mode === "quick") && onSaveDraft && (
                        <Button
                          type="button"
                          onClick={handleSaveDraft}
                          disabled={!canSaveDraft}
                          className="h-14 sm:h-11 text-base sm:text-sm font-bold flex-1 sm:flex-none rounded-xl bg-amber-100 text-amber-800 hover:bg-amber-200 border border-amber-200 hover:border-amber-300"
                        >
                          {isSaving ? "저장 중..." : "임시저장"}
                        </Button>
                      )}
                      <Button type="button" onClick={handleSubmit} disabled={!canSubmit} className="h-14 sm:h-11 text-base sm:text-sm font-bold flex-[2] sm:flex-none rounded-xl bg-sky-600 hover:bg-sky-700">
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
              )}
            </div>
          </div>
        </div>
      )}

      {/* 세부항목 추가 다이얼로그 */}
      <Dialog open={subCatAddOpen} onOpenChange={setSubCatAddOpen}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-md rounded-2xl px-6 z-[200]">
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
              <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
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
