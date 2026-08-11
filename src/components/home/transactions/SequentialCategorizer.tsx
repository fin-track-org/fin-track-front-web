"use client";

import { useEffect, useMemo, useState } from "react";
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
  const { confirmDraft, updateDraftInPlace, invalidateAfterClassify } = useDraftClassification();
  const { toast } = useToast();

  const [queue, setQueue] = useState<DraftTransaction[]>([]);
  const [index, setIndex] = useState(0);
  const [finished, setFinished] = useState(false);

  // 모달이 열릴 때만 큐를 스냅샷한다. (열려 있는 동안 목록이 바뀌어도 진행 중인 순서를 유지)
  useEffect(() => {
    if (open) {
      setQueue(drafts);
      setIndex(Math.min(startIndex, Math.max(drafts.length - 1, 0)));
      setFinished(drafts.length === 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const current = queue[index];

  const { suggestion } = useCategorySuggestion(
    current?.description ?? "",
    current?.type ?? "EXPENSE",
    open && !!current && !finished,
  );

  const defaultValues: Partial<CreateTransactionPayload> | undefined = useMemo(() => {
    if (!current) return undefined;
    return {
      date: current.date,
      type: current.type ?? "EXPENSE",
      amount: Math.abs(current.amount),
      categoryId: current.category?.id ?? suggestion.categoryId ?? "",
      subCategoryId: current.subcategory?.id ?? suggestion.subCategoryId ?? "",
      accountId: current.account?.id ?? suggestion.accountId ?? "",
      description: current.description ?? "",
    };
  }, [current, suggestion]);

  if (!open) return null;

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
    await confirmDraft(current.id, payload);
    invalidateAfterClassify();

    if (index + 1 >= queue.length) {
      setFinished(true);
      onAllDone?.();
    } else {
      setIndex((i) => i + 1);
    }
  };

  const handleSaveDraft = async (payload: Partial<CreateTransactionPayload>) => {
    if (!payload.date || payload.amount == null) return;
    await updateDraftInPlace(current.id, payload);
    invalidateAfterClassify();
    toast.info("임시 내역을 저장했어요.");
  };

  const handleSkipRemaining = () => {
    onOpenChange(false);
    toast.info("나머지는 다음에 해도 괜찮아요.");
  };

  return (
    <AddTransactionModal
      open={open}
      onOpenChange={(v) => {
        if (!v) onOpenChange(false);
      }}
      categories={categories}
      accounts={accounts}
      mode="confirm-draft"
      defaultValues={defaultValues}
      onSubmit={handleSubmit}
      onSaveDraft={handleSaveDraft}
      autoCloseOnSubmit={false}
      queueProgress={{ current: index + 1, total: queue.length }}
      onSkipRemaining={handleSkipRemaining}
      transitionKey={current.id}
      suggestionHint={suggestion.hint}
    />
  );
}
