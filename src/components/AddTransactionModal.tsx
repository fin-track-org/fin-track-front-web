/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";
import { X, Bookmark, RotateCcw } from "lucide-react";

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
import {
  buildMoveEntryKind,
  deriveEntryKind,
  entryKindToPayloadDirection,
  fromPayloadAccountFields,
  getFromAccountOptions,
  getToAccountOptions,
  isDraftSaveAllowed,
  isMoveKind,
  isSavingsKind,
  moveSubKindOf,
  resolveAccountAutoFill,
  savingsDirectionOf,
  toPayloadAccountFields,
  validateAccountSelection,
  type EntryKind,
  type MoveSubKind,
} from "@/src/lib/transactionEntry";

/**
 * 카테고리 자동 선택 안내 문구. 추천 근거별로 구분한다
 * (design-package/../DECISION_001, QA_REVIEW_004 후속 작업지시).
 */
function getAutoSelectBannerText(
  basis?: "memo-history" | "recent-choice" | "frequency" | "none",
): string {
  if (basis === "frequency") return "최근 자주 쓴 분류로 자동 선택했어요";
  if (basis === "recent-choice") return "최근에 고른 분류로 자동 선택했어요";
  return "지난 기록을 참고해 자동 선택했어요"; // memo-history
}

/**
 * 칩/선택 옆에 붙는 작은 "자동 선택" 배지.
 * 강한 팝업 대신 150~200ms 정도의 가벼운 fade만 사용하고(motion-reduce에서는 생략),
 * transform 없이 opacity만 바꿔 레이아웃 이동을 최소화한다(QA_REVIEW_004).
 */
function AutoSelectBadge({ label = "자동 선택" }: { label?: string }) {
  return (
    <span className="ml-1.5 inline-flex items-center rounded-full bg-ll-mint px-1.5 py-0.5 text-[10px] font-bold text-ll-ink align-middle motion-safe:animate-in motion-safe:fade-in motion-safe:duration-[175ms]">
      ✦ {label}
    </span>
  );
}

/**
 * 거래 종류별 CTA 색(DECISION_014 "시각 규칙" — 지출 Tomato, 수입 Mint, 일반 이체
 * Periwinkle, 저축·투자 Butter). 색과 함께 항상 텍스트 라벨을 쓰므로 색상만으로
 * 구분하지 않는다는 §11 요구도 함께 지킨다.
 */
function submitButtonClasses(kind: EntryKind): string {
  switch (kind) {
    case "INCOME":
      return "bg-ll-mint text-ll-ink hover:bg-ll-mint/85";
    case "TRANSFER":
      return "bg-ll-periwinkle text-white hover:bg-ll-periwinkle/90";
    case "SAVINGS_DEPOSIT":
    case "SAVINGS_WITHDRAWAL":
      return "bg-ll-butter text-ll-ink hover:bg-ll-butter/85";
    default:
      return "bg-ll-tomato text-white hover:bg-ll-tomato/90";
  }
}

/** §5.5 — 필드 이름을 출금/입금으로 고정하지 않고 선택한 흐름에 맞춰 의미를 보조한다. */
function getAccountFieldLabels(kind: EntryKind): { fromLabel: string; toLabel: string } {
  switch (kind) {
    case "TRANSFER":
      return { fromLabel: "출발 계좌 (출금)", toLabel: "도착 계좌 (입금)" };
    case "SAVINGS_DEPOSIT":
      return { fromLabel: "저축할 일반 계좌", toLabel: "들어갈 저축·투자 계좌" };
    case "SAVINGS_WITHDRAWAL":
      return { fromLabel: "가져올 저축·투자 계좌", toLabel: "받을 일반 계좌" };
    case "INCOME":
      return { fromLabel: "입금 계좌", toLabel: "" };
    default:
      return { fromLabel: "결제수단", toLabel: "" };
  }
}

/**
 * DECISION_014 §5 "계좌 흐름의 문장화" — 두 계좌를 고르면 최종 흐름을 문장으로 다시 보여준다.
 * "계좌"를 항상 이름 뒤에 붙여서 반환해, 계좌 이름의 받침 유무와 상관없이 "…계좌로"가
 * 항상 자연스럽게 이어지도록 한다(받침 판별 로직 없이 조사 문제를 피하는 방법).
 */
function buildFlowSummary(kind: EntryKind, fromName: string, toName: string): string | null {
  if (!fromName || !toName) return null;
  if (kind === "TRANSFER") return `${fromName} 계좌에서 ${toName} 계좌로 이체해요.`;
  if (kind === "SAVINGS_DEPOSIT") return `${fromName} 계좌에서 ${toName} 계좌로 저축해요.`;
  if (kind === "SAVINGS_WITHDRAWAL") return `${fromName} 계좌에서 ${toName} 계좌로 가져와요.`;
  return null;
}

const moveSubKindOptions: { value: MoveSubKind; title: string; hint: string }[] = [
  { value: "TRANSFER", title: "일반 이체", hint: "같은 종류의 계좌끼리" },
  { value: "SAVINGS", title: "저축·투자", hint: "일반 계좌와 저축 계좌 사이" },
];

const savingsDirectionOptions: { value: "DEPOSIT" | "WITHDRAWAL"; title: string; hint: string }[] = [
  { value: "DEPOSIT", title: "저축하기", hint: "일반 → 저축·투자" },
  { value: "WITHDRAWAL", title: "가져오기", hint: "저축·투자 → 일반" },
];

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
    onSkip,
    onPrevious,
    onSkipRemaining,
    autoCloseOnSubmit = true,
    transitionKey,
    suggestedValues,
    suggestionBasis,
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
  // "나중에 분류" 큐 안에서 항목이 바뀔 때 포커스를 옮길 제목(IMPLEMENTATION_BRIEF_018 §12).
  // 입력 요소가 아니라 제목으로 옮겨서 모바일 키보드가 불필요하게 열리지 않게 한다.
  const queueTitleRef = useRef<HTMLHeadingElement>(null);
  const isFirstQueueTransitionRef = useRef(true);

  // 상세 등록(신규/수정)에서는 "일반 이체"를 선택할 수 있지만, 빠른 기록·"나중에 분류"·
  // 간편모드에서는 기존과 동일하게 일반 이체를 제공하지 않는다(계좌 이동을 선택하면
  // 저축·투자 방향 선택으로 바로 들어간다). 기존 조건(`!isSimpleMode && mode !== "quick" &&
  // mode !== "confirm-draft"`)을 그대로 옮긴 것 — 회귀 없음.
  const canUseTransfer = !isSimpleMode && mode !== "quick" && mode !== "confirm-draft";

  // ----------------------------
  // 초기값
  // ----------------------------
  const initialDate = defaultValues?.date ?? todayISODateSeoul();
  const initialEntryKind = deriveEntryKind({
    type: defaultValues?.type,
    isSavings: defaultValues?.isSavings,
  });
  const initialAccounts = fromPayloadAccountFields(initialEntryKind, {
    accountId: defaultValues?.accountId,
    toAccountId: defaultValues?.toAccountId,
  });

  // ----------------------------
  // Form State
  // ----------------------------
  const [date, setDate] = useState<string>(initialDate);

  // §3 "거래 종류 UI 모델" — type + isSavings + 계좌 조합을 흩어진 boolean으로 관리하지
  // 않고, 화면 의미를 그대로 담은 EntryKind 하나로 관리한다. 제출 시에만 기존 payload
  // 방향(type/isSavings)으로 변환한다(src/lib/transactionEntry.ts).
  const [entryKind, setEntryKindRaw] = useState<EntryKind>(initialEntryKind);

  const [category, setCategory] = useState<string>(
    defaultValues?.categoryId ?? "",
  );
  const [subCategory, setSubCategory] = useState<string>(
    defaultValues?.subCategoryId ?? "",
  );

  // "출발"/"도착" — 문자 그대로의 방향. 기존 payload의 accountId/toAccountId(저축 인출만
  // 관례상 뒤집힘)와는 toPayloadAccountFields/fromPayloadAccountFields로만 변환한다.
  const [fromAccountId, setFromAccountId] = useState<string>(initialAccounts.fromAccountId);
  const [toAccountId, setToAccountId] = useState<string>(initialAccounts.toAccountId);
  // §5.2 "출발 계좌가 바뀌어 기존 도착 계좌가 유효하지 않으면 도착 계좌를 즉시 초기화하고
  // 이유를 안내한다" — 그 안내 문구.
  const [accountResetNotice, setAccountResetNotice] = useState<string | null>(null);

  // 카테고리/세부항목/결제수단이 "추천으로 자동 채워졌는지(auto)", "사용자가 직접 골랐는지(user)",
  // "아직 아무 일도 없었는지(none)"를 필드별로 추적한다.
  //  - auto: 추천 배지("자동 선택" 등)를 노출하고, 다음 추천이 이 필드를 다시 덮어써도 된다.
  //  - user: 사용자가 이미 손댔으므로 배지를 숨기고, 이후 어떤 추천도 이 필드에 적용하지 않는다.
  //    (같은 값을 다시 골라도 배지는 복구하지 않는다 — 사용자 요청사항)
  //  - none: 추천 대상이 아니었거나 draft가 바뀌어 아직 아무것도 적용되지 않은 초기 상태.
  // defaultValues가 바뀌어 폼이 리셋될 때 전부 "none"으로 초기화된다.
  type RecommendationFieldState = "auto" | "user" | "none";
  const [recommendationState, setRecommendationState] = useState<{
    category: RecommendationFieldState;
    subCategory: RecommendationFieldState;
    account: RecommendationFieldState;
  }>({ category: "none", subCategory: "none", account: "none" });

  // 결제수단 자동 선택의 근거(§6.1) — "기본 결제수단이에요"와 "최근에 고른 결제수단으로
  // 자동 선택했어요"는 같은 문자열로 합치지 않는다.
  const [accountAutoSource, setAccountAutoSource] = useState<"default" | "recent" | null>(null);

  const markFieldAsUser = (field: "category" | "subCategory" | "account") => {
    setRecommendationState((prev) => ({ ...prev, [field]: "user" }));
  };

  const [description, setDescription] = useState<string>(
    defaultValues?.description ?? "",
  );

  const [amountText, setAmountText] = useState<string>(
    defaultValues?.amount != null ? String(defaultValues.amount) : "",
  );

  // 제출 직전 계좌 조합 검증(§10) 실패 시 필드별 오류.
  const [fieldErrors, setFieldErrors] = useState<{ from?: string; to?: string }>({});

  /**
   * 거래 종류를 바꿀 때 숨겨진 상태가 payload에 남지 않도록 한다(§7).
   *  - EXPENSE ↔ INCOME처럼 둘 다 "계좌 이동이 아님"이면 결제수단은 그대로 유지한다
   *    (기존에도 유지되던 동작).
   *  - 이동 종류(일반 이체/저축·투자)나 저축 방향이 바뀌면 두 계좌를 모두 비운다 —
   *    기존 계좌를 반대 필드로 암묵적으로 재사용하지 않기 위해서다(§7 "저축하기 ↔ 가져오기").
   *  - 카테고리는 categoryOptions가 계좌 이동일 때 빈 배열이 되므로, 아래 별도 effect가
   *    자동으로 비운다(중복 구현 없음).
   */
  const changeEntryKind = (next: EntryKind) => {
    if (entryKind === next) return;
    const directionChanged =
      moveSubKindOf(entryKind) !== moveSubKindOf(next) || savingsDirectionOf(entryKind) !== savingsDirectionOf(next);
    setEntryKindRaw(next);
    if (directionChanged) {
      setFromAccountId("");
      setToAccountId("");
    }
    setAccountResetNotice(null);
    setFieldErrors({});
  };

  const selectedFromAccount = useMemo(
    () => accounts.find((a) => a.id === fromAccountId),
    [accounts, fromAccountId],
  );
  const selectedToAccount = useMemo(
    () => accounts.find((a) => a.id === toAccountId),
    [accounts, toAccountId],
  );

  const fromAccountOptions = useMemo(
    () => getFromAccountOptions(entryKind, accounts, toAccountId),
    [entryKind, accounts, toAccountId],
  );
  const toAccountOptions = useMemo(
    () => getToAccountOptions(entryKind, accounts, fromAccountId),
    [entryKind, accounts, fromAccountId],
  );

  const accountFieldLabels = getAccountFieldLabels(entryKind);
  const flowSummary = isMoveKind(entryKind)
    ? buildFlowSummary(entryKind, selectedFromAccount?.name ?? "", selectedToAccount?.name ?? "")
    : null;

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

  const { data: rawTransactionTemplates = [] } = useQuery({
    queryKey: ["transactionTemplates"],
    queryFn: getTransactionTemplates,
    enabled: open && (mode === "create" || mode === "quick"),
  });

  // §9 "자주 사용하는 거래 정책" — 템플릿은 일반 수입·지출만 공식 지원한다. 서버가
  // INCOME/EXPENSE만 내려주는 게 정상이지만, 기존 데이터에 예상 밖의 타입이 있어도
  // 목록에서부터 안전하게 걸러내 이체 템플릿을 적용할 수 있는 죽은 분기를 없앤다.
  const transactionTemplates = useMemo(
    () => rawTransactionTemplates.filter((t) => t.type === "EXPENSE" || t.type === "INCOME"),
    [rawTransactionTemplates],
  );

  const handleApplyTemplate = (template: any) => {
    if (template.type !== "EXPENSE" && template.type !== "INCOME") {
      // 목록에서 이미 걸러내지만, 혹시 모를 경합·캐시 상태에 대비한 방어 코드.
      setError("지원하지 않는 템플릿이에요.");
      return;
    }
    changeEntryKind(template.type);
    setAmountText(String(template.amount));
    setCategory(template.categoryId || "");
    setSubCategory(template.subcategoryId || "");
    setFromAccountId(template.accountId || "");
    setDescription(template.description || "");
    setShowAllTemplates(false);
    if (mode === "quick") {
      setIsQuickExpanded(true);
    }
  };

  const handleClearForm = () => {
    changeEntryKind("EXPENSE");
    setAmountText("");
    setCategory("");
    setSubCategory("");
    setFromAccountId("");
    setToAccountId("");
    setDescription("");
    setRecommendationState({ category: "none", subCategory: "none", account: "none" });
    setAccountAutoSource(null);
    if (mode === "quick") {
      setIsQuickExpanded(false);
    }
  };

  // ----------------------------
  // Derived
  // ----------------------------
  const payloadDirection = entryKindToPayloadDirection(entryKind);

  // 계좌 이동(일반 이체·저축·투자)에는 카테고리 개념이 없다 — 계좌 이동으로 전환하면
  // 아래 categoryOptions가 빈 배열이 되고, 그 아래 invalidation effect가 숨은 category
  // 상태를 자동으로 비운다(§7, 별도 초기화 코드 중복 없음).
  const categoryOptions = useMemo(() => {
    if (isMoveKind(entryKind)) return [];
    return categories.filter((c) => c.type === payloadDirection.type);
  }, [categories, entryKind, payloadDirection.type]);

  const isIncomeType = entryKind === "INCOME";

  const isFromAccountCash = fromAccountId === "cash";

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

  // 임시저장(§8): 계좌 이동(일반 이체·저축·투자)의 축약/상세 임시저장은 모두 지원하지
  // 않는다. quickAddTransaction(빠른 축약)과 updateDraftInPlace(상세) 둘 다 서버로
  // date/amount/description/type(INCOME|EXPENSE)만 보낼 수 있고 계좌·저축 방향을 실을
  // 필드가 아예 없어(ftapi QuickTransactionReq·TransactionUpdateReq 계약), 계좌 이동
  // 정보가 누락된 채 일반 거래처럼 저장되는 걸 프론트에서 막는다(§8 정책 1번 채택).
  const canSaveDraft =
    Boolean(date) &&
    isAmountValid &&
    !isSaving &&
    isDraftSaveAllowed(entryKind);

  // 등록(완전한 거래): 카테고리, 결제수단 필수 (세부 항목은 선택)
  // 계좌 이동이면 두 계좌 모두 필요. 카테고리는 무시됨.
  const canRegister = isMoveKind(entryKind)
    ? Boolean(date) && isAmountValid && Boolean(fromAccountId) && Boolean(toAccountId) && !isSaving
    : Boolean(date) && Boolean(category) && isAmountValid && Boolean(fromAccountId) && !isSaving;

  const canSubmit = canRegister;

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
      // 이번에 새로 열린 세션의 "첫" 항목이다 — 아래 큐 전환 effect가 이 항목까지
      // 제목으로 다시 포커스를 옮기지 않도록(이미 위에서 첫 입력 요소로 옮겼으므로) 초기화한다.
      isFirstQueueTransitionRef.current = true;
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

  // 접근성(IMPLEMENTATION_BRIEF_018 §12): "나중에 분류" 큐 안에서 항목이 바뀔 때마다
  // (이전/나중에/기억난 만큼 적고 다음/분류 완료하고 다음 어느 쪽이든) 제목으로 포커스를
  // 옮긴다. 세션을 새로 여는 첫 항목은 위 effect가 이미 첫 입력 요소로 포커스를 옮겼으므로
  // 건너뛴다. 입력 요소가 아니라 제목으로 옮겨서 모바일 키보드를 불필요하게 열지 않는다.
  useEffect(() => {
    if (!open || !queueProgress) return;
    if (isFirstQueueTransitionRef.current) {
      isFirstQueueTransitionRef.current = false;
      return;
    }
    queueTitleRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transitionKey]);

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

  // open될 때 템플릿 더보기 상태만 정리 (본 상태 리셋은 defaultValues effect가 전담)
  useEffect(() => {
    if (!open) {
      setShowAllTemplates(false);
      return;
    }
    setIsQuickExpanded(mode !== "quick");
  }, [open, mode]);

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

  // defaultValues(수정 대상·임시저장 복원·"나중에 분류" 큐 항목)가 바뀔 때마다 폼 전체를
  // 새 값으로 리셋한다. 큐의 다음 항목으로 넘어갈 때도 defaultValues 참조가 바뀌므로,
  // 이전 항목의 숨은 저축 상태·도착 계좌·추천 배지가 여기서 함께 정리된다.
  useEffect(() => {
    if (!open) return;

    const kind = deriveEntryKind({ type: defaultValues?.type, isSavings: defaultValues?.isSavings });
    const restoredAccounts = fromPayloadAccountFields(kind, {
      accountId: defaultValues?.accountId,
      toAccountId: defaultValues?.toAccountId,
    });

    setDate(defaultValues?.date ?? todayISODateSeoul());
    setEntryKindRaw(kind);
    setCategory(defaultValues?.categoryId ?? "");
    setSubCategory(defaultValues?.subCategoryId ?? "");
    setFromAccountId(restoredAccounts.fromAccountId);
    setToAccountId(restoredAccounts.toAccountId);
    setDescription(defaultValues?.description ?? "");
    setAmountText(
      defaultValues?.amount != null ? String(defaultValues.amount) : "",
    );
    setError("");
    setSubCatError("");
    setFieldErrors({});
    setAccountResetNotice(null);
    setAccountAutoSource(null);
    // 새 항목(defaultValues)으로 폼이 리셋됐으니, 사용자가 이 항목에서
    // 아직 아무것도 고르지 않은 상태로 되돌린다.
    setRecommendationState({ category: "none", subCategory: "none", account: "none" });
  }, [open, defaultValues]);

  // 늦게 도착하는 추천값(suggestedValues) 적용: 폼을 통째로 리셋하지 않고
  // 지금 비어 있고 사용자가 아직 건드리지 않은("user"가 아닌) 필드에만 채워 넣고,
  // 그 필드를 "auto"로 표시해 자동 선택 배지가 뜨도록 한다.
  // (DESIGN_QA_01.md P1-1, 사용자 요청: 자동 선택 필드 시각화)
  useEffect(() => {
    if (!open || !suggestedValues) return;

    if (suggestedValues.categoryId && recommendationState.category !== "user" && !category) {
      setCategory(suggestedValues.categoryId);
      setRecommendationState((prev) => ({ ...prev, category: "auto" }));
    }
    // 소분류 추천은 "지금 적용된 대분류가 추천 대분류와 같을 때만" 적용한다.
    // category가 suggestedValues와 다르면(사용자가 직접 다른 대분류를 골랐거나 아직
    // 추천 대분류가 반영되기 전이면) 엉뚱한 대분류에 남의 소분류가 섞이는 걸 막는다
    // (DESIGN_QA_02.md P1-1R). category를 deps에 넣어 대분류가 늦게 채워진 뒤에도
    // 이 effect가 다시 평가되도록 한다.
    if (
      suggestedValues.subCategoryId &&
      recommendationState.subCategory !== "user" &&
      !subCategory &&
      category === suggestedValues.categoryId
    ) {
      setSubCategory(suggestedValues.subCategoryId);
      setRecommendationState((prev) => ({ ...prev, subCategory: "auto" }));
    }
  }, [open, suggestedValues, category, subCategory, recommendationState]);

  // 기본 결제수단 자동 선택(§6) — 신규 일반 수입·지출에만 적용한다. 우선순위 규칙
  // (1~3순위 "이미 값이 있으면 절대 덮지 않는다" + 4순위 기본 결제수단 + 5순위 최근 추천,
  // 이체·저축 제외, 존재하지 않거나 비활성인 추천 계좌는 무시)은
  // `resolveAccountAutoFill`(src/lib/transactionEntry.ts) 순수 함수 하나로 계산하고,
  // 여기서는 그 결과를 그대로 적용만 한다(QA_REVIEW_037 P2 — 실제 사용하는 로직을
  // scripts/verify-transaction-entry.ts에서 함께 검증한다).
  useEffect(() => {
    if (!open) return;

    const result = resolveAccountAutoFill({
      kind: entryKind,
      hasCurrentValue: Boolean(fromAccountId),
      isUserModified: recommendationState.account === "user",
      accounts,
      suggestedAccountId: suggestedValues?.accountId,
    });
    if (!result) return;

    setFromAccountId(result.accountId);
    setRecommendationState((prev) => ({ ...prev, account: "auto" }));
    setAccountAutoSource(result.source);
  }, [open, entryKind, accounts, fromAccountId, recommendationState.account, suggestedValues]);

  // 간편모드에서 저축·투자를 선택하면 저축 계좌 쪽 슬롯을 시스템 저축 계좌로 자동 선택하고
  // 고정한다. 기존에는 항상 "두 번째 필드"(toAccountId)가 저축 계좌였지만, 이제 방향에
  // 따라 저축 계좌 슬롯이 fromAccountId(가져오기)일 수도 있어 방향별로 잠그는 필드를 바꾼다.
  useEffect(() => {
    if (!isSimpleMode) return;
    if (!isSavingsKind(entryKind)) return;

    const systemSavingsAccount =
      accounts.find((a) => a.type === "SAVINGS_INVESTMENT" && a.isSystem) ||
      accounts.find((a) => a.type === "SAVINGS_INVESTMENT");
    if (!systemSavingsAccount) return;

    if (entryKind === "SAVINGS_DEPOSIT" && toAccountId !== systemSavingsAccount.id) {
      setToAccountId(systemSavingsAccount.id);
    }
    if (entryKind === "SAVINGS_WITHDRAWAL" && fromAccountId !== systemSavingsAccount.id) {
      setFromAccountId(systemSavingsAccount.id);
    }
  }, [isSimpleMode, entryKind, accounts, toAccountId, fromAccountId]);

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
      markFieldAsUser("subCategory");
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

  function buildFinalDescription(): string {
    let finalDescription = description.trim();
    if (!finalDescription) {
      const subCatName = currentSubCats.find((sc) => sc.id === subCategory)?.name || "";
      const catName = categoryOptions.find((c) => c.id === category)?.name || "";

      if (subCatName) {
        finalDescription = subCatName;
      } else if (catName) {
        finalDescription = catName;
      } else if (entryKind === "TRANSFER") {
        finalDescription = "이체";
      } else if (isSavingsKind(entryKind)) {
        finalDescription = "저축";
      } else {
        finalDescription = "내용 없음";
      }
    }
    return finalDescription;
  }

  async function handleSaveDraft() {
    setError("");
    if (!canSaveDraft || !onSaveDraft) return;

    const payload: Partial<CreateTransactionPayload> = {
      date,
      type: payloadDirection.type,
      amount: amountAbs,
      categoryId: category || undefined,
      subCategoryId: subCategory || undefined,
      accountId: fromAccountId || undefined,
      description: buildFinalDescription(),
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

  /** 제출 직전 계좌 조합 검증(§10) 실패 시, 문제 필드 가까이 안내하고 그 필드로 포커스를 옮긴다. */
  function focusAccountField(field: "from" | "to") {
    const targetId = field === "from" ? "fromAccountSelect" : "toAccountSelect";
    requestAnimationFrame(() => {
      dialogContentRef.current?.querySelector<HTMLElement>(`#${targetId}`)?.focus();
    });
  }

  async function handleSubmit() {
    setError("");
    setFieldErrors({});
    if (!canSubmit) return;

    const validationError = validateAccountSelection(entryKind, fromAccountId, toAccountId, accounts);
    if (validationError) {
      setFieldErrors({ [validationError.field]: validationError.message });
      setError(validationError.message);
      focusAccountField(validationError.field);
      return;
    }

    const finalDescription = buildFinalDescription();
    const outAccounts = toPayloadAccountFields(entryKind, fromAccountId, toAccountId);

    const payload: CreateTransactionPayload = {
      date,
      type: payloadDirection.type,
      amount: amountAbs,
      categoryId: isMoveKind(entryKind) ? "" : category,
      subCategoryId: isMoveKind(entryKind) ? "" : subCategory,
      description: finalDescription,
      accountId: outAccounts.accountId,
      toAccountId: outAccounts.toAccountId,
      isSavings: payloadDirection.isSavings,
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

  const handleFromAccountChange = (val: string) => {
    markFieldAsUser("account");
    setAccountAutoSource(null);
    setFieldErrors((prev) => ({ ...prev, from: undefined }));
    setFromAccountId(val);

    if (entryKind === "TRANSFER" && toAccountId) {
      const stillValid = getToAccountOptions(entryKind, accounts, val).some((a) => a.id === toAccountId);
      if (!stillValid) {
        setToAccountId("");
        setAccountResetNotice("출발 계좌가 바뀌어 도착 계좌를 다시 선택해야 해요.");
        return;
      }
    }
    setAccountResetNotice(null);
  };

  const handleToAccountChange = (val: string) => {
    setFieldErrors((prev) => ({ ...prev, to: undefined }));
    setToAccountId(val);

    if (entryKind === "TRANSFER" && fromAccountId) {
      const stillValid = getFromAccountOptions(entryKind, accounts, val).some((a) => a.id === fromAccountId);
      if (!stillValid) {
        setFromAccountId("");
        setAccountResetNotice("도착 계좌가 바뀌어 출발 계좌를 다시 선택해야 해요.");
        return;
      }
    }
    setAccountResetNotice(null);
  };

  const moveSubKind = moveSubKindOf(entryKind);
  const savingsDirection = savingsDirectionOf(entryKind);

  const handleTopLevelChange = (v: SegmentType) => {
    if (v !== "MOVE") {
      changeEntryKind(v);
      return;
    }
    // "계좌 이동" 진입 — 이 세그먼트는 mode === "quick"(빠른 등록)에서는 애초에 노출되지
    // 않는다(DECISION_014 §0, IMPLEMENTATION_BRIEF_016 §3.0·§4.2 — 계좌 이동 draft
    // 백엔드 계약이 없어 빠른 등록에서는 계좌 이동을 아예 제공하지 않는다). 상세 등록·
    // 나중에 분류에서만 도달한다. 일반 이체를 쓸 수 있으면(자산관리 모드의 상세 등록)
    // 시안(mobile-transaction-entry-v1.html)의 기본값과 동일하게 일반 이체로 먼저
    // 진입하고, 일반 이체를 못 쓰는 맥락(나중에 분류·빠른 장부 모드)에서는 항상
    // 저축·투자로 들어간다.
    if (!canUseTransfer) {
      changeEntryKind(savingsDirection === "WITHDRAWAL" ? "SAVINGS_WITHDRAWAL" : "SAVINGS_DEPOSIT");
      return;
    }
    if (!isMoveKind(entryKind)) {
      changeEntryKind("TRANSFER");
    }
  };

  const handleMoveSubKindChange = (sub: MoveSubKind) => {
    if (sub === "TRANSFER") {
      changeEntryKind("TRANSFER");
    } else {
      changeEntryKind(savingsDirection === "WITHDRAWAL" ? "SAVINGS_WITHDRAWAL" : "SAVINGS_DEPOSIT");
    }
  };

  const handleSavingsDirectionChange = (direction: "DEPOSIT" | "WITHDRAWAL") => {
    changeEntryKind(buildMoveEntryKind("SAVINGS", direction));
  };

  const topLevelValue: SegmentType = isMoveKind(entryKind) ? "MOVE" : (entryKind as SegmentType);
  // DECISION_014 §0 / IMPLEMENTATION_BRIEF_016 §3.0·§4.2·§8.1(QA_REVIEW_037 P1) —
  // 빠른 등록 UI(mode === "quick")는 축약 상태든 상세로 펼친 상태든 계좌 이동을 전혀
  // 제공하지 않는다. 계좌 이동 draft 백엔드 계약이 없어 같은 화면에서 "일반 지출·수입은
  // 임시저장되는데 계좌 이동만 즉시 등록을 요구"하는 불일치가 생기기 때문이다. 계좌
  // 이동은 자산관리 모드의 정식 상세 등록(그리고 기존 정책을 유지하는 "나중에 분류")에서만
  // 제공한다.
  const showMoveInTopSegment = mode !== "quick";

  // 간편모드에서는 저축 계좌 슬롯을 시스템 저축 계좌로 고정한다(위 effect가 값을 채워 넣음).
  // 저축 계좌 슬롯은 방향에 따라 fromAccountId(가져오기)/toAccountId(저축하기)로 달라진다.
  const isFromAccountLocked = isSimpleMode && entryKind === "SAVINGS_WITHDRAWAL";
  const isToAccountLocked = isSimpleMode && entryKind === "SAVINGS_DEPOSIT";

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
                <h2
                  id={dialogTitleId}
                  ref={queueTitleRef}
                  tabIndex={-1}
                  className="text-xl font-bold text-gray-800 break-keep rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-ll-tomato focus-visible:outline-offset-2"
                >
                  {queueProgress
                    ? `나중에 분류 · ${queueProgress.current}/${queueProgress.total}`
                    : mode === "edit"
                      ? "거래 수정"
                      : mode === "confirm-draft"
                        ? "임시 내역 분류"
                        : mode === "quick"
                          ? "빠른 기록" // 빠른 등록에는 계좌 이동이 없어 제목이 바뀔 일이 없다(QA_REVIEW_037 P1).
                          : "거래 추가"}
                </h2>
                {queueProgress && (
                  // 10건까지는 점/막대로, 그 이상은 단일 progress bar로 축약한다.
                  // (DESIGN_QA_01.md P2-4: 항목이 많으면 모바일에서 가로로 넘치던 문제 수정)
                  <div className="mt-2" aria-hidden="true">
                    {queueProgress.total <= 10 ? (
                      <div className="flex items-center gap-1">
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
                    ) : (
                      <div className="h-1.5 w-full max-w-[220px] overflow-hidden rounded-full bg-ll-cream">
                        <div
                          className="h-full rounded-full bg-ll-tomato transition-all duration-200"
                          style={{ width: `${(queueProgress.current / queueProgress.total) * 100}%` }}
                        />
                      </div>
                    )}
                  </div>
                )}
                {queueProgress && (
                  <>
                    {/* IMPLEMENTATION_BRIEF_018 §9, §12 — 진행 안내는 이 영역 하나만 aria-live로
                        낭독한다(점/막대는 위에서 이미 장식용으로 aria-hidden 처리). */}
                    <p aria-live="polite" className="mt-1 text-xs text-ll-pencil break-keep">
                      {queueProgress.remaining != null ? `${queueProgress.remaining}건 남았어요` : " "}
                    </p>
                    {onPrevious && (
                      <button
                        type="button"
                        onClick={onPrevious}
                        disabled={isSaving}
                        className="-ml-1 mt-0.5 min-h-[44px] rounded-md px-1 text-xs font-extrabold text-ll-ink hover:underline disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        ← 이전 기록
                      </button>
                    )}
                  </>
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
                  value={topLevelValue}
                  onChange={handleTopLevelChange}
                  options={
                    showMoveInTopSegment
                      ? ["EXPENSE", "INCOME", "MOVE"]
                      : ["EXPENSE", "INCOME"]
                  }
                  labels={mode === "quick" ? { EXPENSE: "쓴 돈", INCOME: "들어온 돈" } : undefined}
                  aria-label="거래유형"
                />
                {/* QA_REVIEW_037 P1 — 빠른 등록(mode === "quick")에는 계좌 이동 진입점을
                    두지 않는다(§8.1). 계좌 이동 draft 백엔드 계약이 구현된 뒤 별도
                    브리프로 재검토한다. */}
              </div>

              {/* 계좌 이동 2단계 선택: 일반 이체 vs 저축·투자, 그리고 저축·투자의 방향 */}
              {isMoveKind(entryKind) && (
                <div className="space-y-3 rounded-2xl border border-ll-ink/10 bg-ll-paper/60 p-3.5">
                  {canUseTransfer && (
                    <div role="radiogroup" aria-label="계좌 이동 종류" className="grid grid-cols-2 gap-2">
                      {moveSubKindOptions.map((opt) => {
                        const isSelected = moveSubKind === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            role="radio"
                            aria-checked={isSelected}
                            onClick={() => handleMoveSubKindChange(opt.value)}
                            className={`min-h-[56px] rounded-xl border px-3 py-2 text-left transition-all ${
                              isSelected
                                ? "border-ll-ink bg-white shadow-[2px_2px_0_var(--color-ll-ink)]"
                                : "border-ll-ink/15 bg-white/70 hover:bg-white"
                            }`}
                          >
                            <span className="block text-[13px] font-bold text-ll-ink break-keep">{opt.title}</span>
                            <span className="mt-0.5 block text-[11px] text-ll-pencil break-keep">{opt.hint}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {isSavingsKind(entryKind) && (
                    <div role="radiogroup" aria-label="저축·투자 방향" className="grid grid-cols-2 gap-2">
                      {savingsDirectionOptions.map((opt) => {
                        const isSelected = savingsDirection === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            role="radio"
                            aria-checked={isSelected}
                            onClick={() => handleSavingsDirectionChange(opt.value)}
                            className={`min-h-[56px] rounded-xl border px-3 py-2 text-left transition-all ${
                              isSelected
                                ? "border-ll-ink bg-ll-butter/25 shadow-[2px_2px_0_var(--color-ll-ink)]"
                                : "border-ll-ink/15 bg-white/70 hover:bg-white"
                            }`}
                          >
                            <span className="block text-[13px] font-bold text-ll-ink break-keep">{opt.title}</span>
                            <span className="mt-0.5 block text-[11px] text-ll-pencil break-keep">{opt.hint}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* 2) 금액 (빠른 등록 시 거대한 입력창) */}
              <div className={`space-y-2 transition-all duration-300 ${!isQuickExpanded ? 'py-4' : ''}`}>
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
                  isQuickExpanded && !isMoveKind(entryKind)
                    ? "grid-rows-[1fr] opacity-100"
                    : "grid-rows-[0fr] opacity-0"
                }`}
              >
                <div className="overflow-hidden space-y-5">
                  <div className="space-y-4 pt-1">
                    <div className="space-y-2.5">
                      {recommendationState.category === "auto" && (
                        <p className="ml-1 -mt-1 mb-1 text-xs font-medium text-ll-pencil motion-safe:animate-in motion-safe:fade-in motion-safe:duration-[175ms]">
                          ✦ {getAutoSelectBannerText(suggestionBasis)}
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
                                // 대분류를 직접 바꾸면(선택/해제 모두) 세부항목은 항상 비우고,
                                // 이후 늦게 도착하는 추천 소분류도 더 이상 자동 적용하지 않는다.
                                // 다른 대분류를 골랐는데 추천 대분류의 소분류가 섞여 들어가는 걸 막기 위함
                                // (DESIGN_QA_02.md P1-1R). 자동 선택 배지도 이 순간 함께 사라진다.
                                markFieldAsUser("category");
                                markFieldAsUser("subCategory");
                                setCategory(isSelected ? "" : c.id);
                                setSubCategory("");
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
                              {isSelected && recommendationState.category === "auto" && <AutoSelectBadge />}
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
                              onClick={() => {
                                markFieldAsUser("subCategory");
                                setSubCategory(isSelected ? "" : sc.id);
                              }}
                              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                                isSelected
                                  ? "bg-sky-50 text-sky-700 border-sky-300 shadow-sm"
                                  : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
                              }`}
                            >
                              {/* 세부항목 칩에는 배지를 반복하지 않는다 — 대분류 배지·상단 안내로 충분하고,
                                  모바일에서 칩이 길어지는 걸 막는다(QA_REVIEW_004 "세부항목 배지 제거"). */}
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
                  <div
                    className={`grid grid-cols-1 gap-4 pt-1 ${(isFromAccountCash && !isMoveKind(entryKind)) ? "md:grid-cols-1" : "md:grid-cols-2"}`}
                  >
                    <div className="space-y-2">
                      <Label className="ml-1" htmlFor="fromAccountSelect">
                        {accountFieldLabels.fromLabel}
                      </Label>
                      {fromAccountOptions.length === 0 ? (
                        <div className="flex items-center h-9 w-full rounded-md border border-input bg-muted px-3 text-sm text-muted-foreground">
                          {accounts.length === 0 ? (isIncomeType ? "등록된 계좌가 없습니다" : "등록된 결제수단이 없습니다") : "선택 가능한 계좌가 없습니다"}
                        </div>
                      ) : (
                        <Select value={fromAccountId} onValueChange={handleFromAccountChange} disabled={isFromAccountLocked}>
                          <SelectTrigger
                            id="fromAccountSelect"
                            className="w-full h-12 sm:h-10 text-base sm:text-sm rounded-xl"
                            aria-describedby={fieldErrors.from ? "fromAccountError" : undefined}
                            aria-invalid={!!fieldErrors.from}
                          >
                            <SelectValue placeholder="선택" />
                          </SelectTrigger>
                          <SelectContent>
                            {fromAccountOptions.map((a) => (
                              <SelectItem key={a.id} value={a.id}>
                                {a.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      {recommendationState.account === "auto" && !fieldErrors.from && (
                        <p className="ml-1 text-[11px] font-medium text-ll-pencil motion-safe:animate-in motion-safe:fade-in motion-safe:duration-[175ms]">
                          ✦ {accountAutoSource === "default" ? "기본 결제수단이에요" : "최근에 고른 결제수단으로 자동 선택했어요"}
                        </p>
                      )}
                      {fieldErrors.from && (
                        <p id="fromAccountError" role="alert" className="ml-1 text-[11px] font-semibold text-ll-tomato">
                          {fieldErrors.from}
                        </p>
                      )}
                    </div>

                    {isMoveKind(entryKind) && (
                      <div className="space-y-2">
                        <Label className="ml-1" htmlFor="toAccountSelect">
                          {accountFieldLabels.toLabel}
                        </Label>
                        {toAccountOptions.length === 0 ? (
                          <div className="flex items-center h-9 w-full rounded-md border border-input bg-muted px-3 text-sm text-muted-foreground">
                            {accounts.length === 0 ? "등록된 계좌가 없습니다" : "선택 가능한 도착 계좌가 없습니다"}
                          </div>
                        ) : (
                          <Select
                            value={toAccountId}
                            onValueChange={handleToAccountChange}
                            disabled={isToAccountLocked}
                          >
                            <SelectTrigger
                              id="toAccountSelect"
                              className="w-full h-12 sm:h-10 text-base sm:text-sm rounded-xl"
                              aria-describedby={fieldErrors.to ? "toAccountError" : undefined}
                              aria-invalid={!!fieldErrors.to}
                            >
                              <SelectValue placeholder="선택" />
                            </SelectTrigger>
                            <SelectContent>
                              {toAccountOptions.map((a) => (
                                <SelectItem key={a.id} value={a.id}>
                                  {a.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                        {fieldErrors.to && (
                          <p id="toAccountError" role="alert" className="ml-1 text-[11px] font-semibold text-ll-tomato">
                            {fieldErrors.to}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {accountResetNotice && (
                    <p role="status" className="ml-1 text-[11px] font-medium text-ll-tomato">
                      {accountResetNotice}
                    </p>
                  )}

                  {flowSummary && (
                    <p className="rounded-xl bg-ll-cream px-3 py-2.5 text-[13px] leading-relaxed text-ll-ink">
                      {flowSummary}
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

              {/* 빠른 등록(mode === "quick")은 계좌 이동을 아예 노출하지 않으므로 이 안내에
                  도달하지 않는다. "나중에 분류"(confirm-draft)에서 계좌 이동으로 재분류할 때만
                  보인다 — onSaveDraft(임시저장)가 있는 화면에서만 의미가 있는 안내다. */}
              {isMoveKind(entryKind) && onSaveDraft && (
                <div role="status" className="rounded-xl border border-ll-periwinkle/30 bg-ll-periwinkle/10 px-4 py-3 text-sm text-ll-ink">
                  계좌 이동은 상세 정보와 함께 저장해요. 출발·도착 계좌가 빠지지 않도록 임시저장 대신 등록으로 저장해 주세요.
                </div>
              )}

              {error && (
                <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}
            </div>

            </div>

            <div className="sticky bottom-0 bg-gradient-to-t from-white via-white to-white/90 pt-4 pb-[env(safe-area-inset-bottom)] mt-auto z-10">
              {queueProgress ? (
                // "나중에 분류" 연속 처리 전용 푸터(IMPLEMENTATION_BRIEF_018 §10 위계):
                // 주 CTA(분류 완료하고 다음) + 보조 CTA(나중에) 한 줄, 그 아래 텍스트 행동
                // (기억난 만큼 적고 다음), 맨 아래 가장 약한 전체 종료(남은 분류는 다음에 할게요).
                // 같은 크기 버튼 4개를 한 줄에 두지 않는다.
                <div className="flex flex-col gap-2 w-full">
                  <div className="flex gap-2.5">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => onSkip?.()}
                      disabled={isSaving}
                      className="h-11 w-24 flex-shrink-0 text-sm font-bold rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700"
                    >
                      나중에
                    </Button>
                    <Button
                      type="button"
                      onClick={handleSubmit}
                      disabled={!canSubmit}
                      className={`h-11 flex-1 text-sm font-bold rounded-xl ${submitButtonClasses(entryKind)}`}
                    >
                      {isSaving ? "저장 중..." : "분류 완료하고 다음"}
                    </Button>
                  </div>
                  {onSaveDraft && canSaveDraft && (
                    <button
                      type="button"
                      onClick={handleSaveDraft}
                      disabled={!canSaveDraft}
                      className="min-h-[44px] w-full text-xs font-bold text-gray-500 underline underline-offset-2 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {isSaving ? "저장 중..." : "기억난 만큼 적고 다음"}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => (onSkipRemaining ? onSkipRemaining() : onOpenChange(false))}
                    disabled={isSaving}
                    className="min-h-[36px] w-full text-[11px] font-semibold text-gray-400 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    남은 분류는 다음에 할게요
                  </button>
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
                    <Button
                      type="button"
                      onClick={handleSaveDraft}
                      disabled={!canSaveDraft}
                      className={`h-14 sm:h-11 text-base sm:text-sm font-bold flex-1 sm:flex-none rounded-xl ${submitButtonClasses(entryKind)}`}
                    >
                      {isSaving ? "기록하는 중..." : "일단 기록해두기 →"}
                    </Button>
                  ) : (
                    <>
                      {(mode === "confirm-draft" || mode === "quick") && onSaveDraft && canSaveDraft && (
                        <Button
                          type="button"
                          onClick={handleSaveDraft}
                          disabled={!canSaveDraft}
                          className="h-14 sm:h-11 text-base sm:text-sm font-bold flex-1 sm:flex-none rounded-xl bg-amber-100 text-amber-800 hover:bg-amber-200 border border-amber-200 hover:border-amber-300"
                        >
                          {isSaving ? "저장 중..." : "임시저장"}
                        </Button>
                      )}
                      <Button
                        type="button"
                        onClick={handleSubmit}
                        disabled={!canSubmit}
                        className={`h-14 sm:h-11 text-base sm:text-sm font-bold flex-[2] sm:flex-none rounded-xl ${submitButtonClasses(entryKind)}`}
                      >
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
