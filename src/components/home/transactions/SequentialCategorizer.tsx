"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import AddTransactionModal from "@/src/components/AddTransactionModal";
import { PawStamp } from "@/src/components/ledger/PawStamp";
import { useDraftClassification } from "@/src/hook/useDraftClassification";
import { useCategorySuggestion } from "@/src/hook/useCategorySuggestion";
import { useToast } from "@/src/hook/useToast";

interface SequentialCategorizerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** "나중에 분류" 대상 임시 거래 목록. 모달이 열리는 시점의 값을 큐로 스냅샷한다. */
  drafts: DraftTransaction[];
  /** 특정 항목부터 시작하고 싶을 때(예: 포스트잇/행 클릭) 인덱스를 지정한다. */
  startIndex?: number;
  categories: Category[];
  accounts: Account[];
  onAllDone?: () => void;
}

/**
 * 홈의 "책상 위 메모"와 내역의 "나중에 분류" 탭, 두 진입점이 공유하는
 * 연속 분류 플로우. 기존 `AddTransactionModal`의 confirm-draft 모드를
 * 큐 컨트롤러로 감싸서 재사용한다 (안전 확장, 로직 중복 없음).
 */
export default function SequentialCategorizer({
  open,
  onOpenChange,
  drafts,
  startIndex = 0,
  categories,
  accounts,
  onAllDone,
}: SequentialCategorizerProps) {
  const { confirmDraft, updateDraftInPlace, invalidateItemLevel, invalidateDashboards } =
    useDraftClassification();
  const { toast } = useToast();

  const [queue, setQueue] = useState<DraftTransaction[]>([]);
  const [index, setIndex] = useState(0);
  const [finished, setFinished] = useState(false);

  // 이번 세션에서 하나라도 성공적으로 분류했는지 — 대시보드 무효화를 몰아서
  // 한 번만 하기 위한 플래그다(DESIGN_QA_01.md P2-3).
  const hasClassifiedRef = useRef(false);

  // 모달이 열릴 때만 큐를 스냅샷한다. (열려 있는 동안 목록이 바뀌어도 진행 중인 순서를 유지)
  useEffect(() => {
    if (open) {
      setQueue(drafts);
      setIndex(Math.min(startIndex, Math.max(drafts.length - 1, 0)));
      setFinished(drafts.length === 0);
      hasClassifiedRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const current = queue[index];

  const { suggestion } = useCategorySuggestion(
    current?.description ?? "",
    current?.type ?? "EXPENSE",
    open && !!current && !finished,
    categories,
    accounts,
  );

  // 큐 항목(defaultValues)은 draft 자체의 값에서만 계산한다. suggestion을 여기에 섞으면
  // 늦게 도착한 추천이 폼 전체를 다시 리셋시켜 사용자가 이미 고른 값을 덮어써버린다
  // (DESIGN_QA_01.md P1-1). 추천은 별도 `suggestedValues`로 내려 보내
  // "비어 있고 아직 손대지 않은 필드에만" 채워지도록 한다.
  const defaultValues: Partial<CreateTransactionPayload> | undefined = useMemo(() => {
    if (!current) return undefined;
    return {
      date: current.date,
      type: current.type ?? "EXPENSE",
      amount: Math.abs(current.amount),
      categoryId: current.category?.id ?? "",
      subCategoryId: current.subcategory?.id ?? "",
      accountId: current.account?.id ?? "",
      description: current.description ?? "",
    };
  }, [current]);

  const suggestedValues = useMemo(() => {
    if (!suggestion.categoryId && !suggestion.accountId) return undefined;
    return {
      categoryId: suggestion.categoryId,
      subCategoryId: suggestion.subCategoryId,
      accountId: suggestion.accountId,
    };
  }, [suggestion]);

  if (!open) return null;

  // 진행된 항목이 있으면 대시보드/통계 무효화를 몰아서 한 번만 실행하고 닫는다.
  const finalizeAndClose = () => {
    if (hasClassifiedRef.current) {
      invalidateDashboards();
      hasClassifiedRef.current = false;
    }
    onOpenChange(false);
  };

  if (finished) {
    return (
      <div className="fixed inset-0 z-[150] flex items-center justify-center">
        <div
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          onClick={() => onOpenChange(false)}
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-label="분류 완료"
          className="relative mx-4 flex w-full flex-col items-center gap-4 rounded-2xl bg-white p-8 text-center shadow-xl motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-200 sm:max-w-sm"
        >
          <PawStamp />
          <h2 className="text-lg font-bold text-ll-ink break-keep">
            책상 위 영수증을 모두 정리했어요.
          </h2>
          <p className="text-sm text-ll-pencil break-keep">
            오늘 할 일은 여기까지. 다음 기록도 대충 남겨주세요.
          </p>
          <button
            type="button"
            autoFocus
            onClick={() => onOpenChange(false)}
            className="mt-2 min-h-[44px] w-full rounded-xl bg-ll-ink px-5 text-sm font-bold text-ll-paper hover:bg-ll-ink/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ll-ink focus-visible:ring-offset-2"
          >
            내역으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  if (!current) return null;

  const handleSubmit = async (payload: CreateTransactionPayload) => {
    const result = await confirmDraft(current.id, payload);
    invalidateItemLevel();
    hasClassifiedRef.current = true;

    if (result.warning) {
      // 이체는 이미 등록됐고, 남은 임시 내역 정리만 안내하는 경고이므로 큐는 계속 진행한다.
      // 놓치기 쉬운 안내라 기본(3초)보다 오래 띄운다(DESIGN_QA_02.md §3 권장).
      toast.info(result.warning, 8000);
    }

    if (index + 1 >= queue.length) {
      invalidateDashboards();
      hasClassifiedRef.current = false;
      setFinished(true);
      onAllDone?.();
    } else {
      setIndex((i) => i + 1);
    }
  };

  const handleSaveDraft = async (payload: Partial<CreateTransactionPayload>) => {
    if (!payload.date || payload.amount == null) return;
    await updateDraftInPlace(current.id, payload);
    invalidateItemLevel();
    toast.info("임시 내역을 저장했어요.");
  };

  const handleSkipRemaining = () => {
    finalizeAndClose();
    toast.info("나머지는 다음에 해도 괜찮아요.");
  };

  return (
    <AddTransactionModal
      open={open}
      onOpenChange={(v) => {
        if (!v) finalizeAndClose();
      }}
      categories={categories}
      accounts={accounts}
      mode="confirm-draft"
      defaultValues={defaultValues}
      suggestedValues={suggestedValues}
      onSubmit={handleSubmit}
      onSaveDraft={handleSaveDraft}
      autoCloseOnSubmit={false}
      queueProgress={{ current: index + 1, total: queue.length }}
      onSkipRemaining={handleSkipRemaining}
      transitionKey={current.id}
      suggestionBasis={suggestion.basis}
    />
  );
}
