"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import AddTransactionModal from "@/src/components/AddTransactionModal";
import { PawStamp } from "@/src/components/ledger/PawStamp";
import { useDraftClassification } from "@/src/hook/useDraftClassification";
import { useCategorySuggestion } from "@/src/hook/useCategorySuggestion";
import { useToast } from "@/src/hook/useToast";
import {
  findNextPendingIndex,
  findPreviousPendingIndex,
  resolveStartIndex,
  sortDraftsOldestFirst,
} from "@/src/lib/draftClassificationQueue";

interface SequentialCategorizerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** "나중에 분류" 대상 임시 거래 목록. 모달이 열리는 시점의 값을 정렬해 큐로 snapshot한다. */
  drafts: DraftTransaction[];
  /**
   * 특정 항목부터 시작하고 싶을 때(예: 포스트잇/행 클릭) draft ID를 지정한다. 정렬 후 큐에서
   * 이 ID를 찾아 시작 위치로 쓴다 — index가 아니라 ID 계약이라 정렬 순서가 바뀌어도 항상
   * 사용자가 실제로 누른 항목부터 시작한다(IMPLEMENTATION_BRIEF_018 §4). 지정하지 않거나
   * 최신 목록에서 사라졌으면 정렬된 큐의 첫 미완료 항목(가장 오래된 항목)부터 시작한다.
   */
  startDraftId?: string;
  categories: Category[];
  accounts: Account[];
  onAllDone?: () => void;
}

/**
 * 홈의 "책상 위 메모"와 내역의 "나중에 분류" 탭, 두 진입점이 공유하는
 * 연속 분류 플로우. 기존 `AddTransactionModal`의 confirm-draft 모드를
 * 큐 컨트롤러로 감싸서 재사용한다 (안전 확장, 로직 중복 없음).
 *
 * IMPLEMENTATION_BRIEF_018 — 큐는 열릴 때 거래일 오래된 순으로 정렬한 snapshot이다(§4).
 * `나중에`(서버 반영 없음) · `기억난 만큼 적고 다음`(draft 유지, 부분 저장) · `분류 완료하고
 * 다음`(즉시 정식 저장) · `← 이전 기록`(서버 호출 없음) 네 행동이 서로 다른 규칙을 가진다
 * (§7). 정식 저장에 성공한 draft ID만 `completedIds`에 기록되고, 앞·뒤 탐색 모두 이 집합을
 * 대칭적으로 건너뛴다(§8, `src/lib/draftClassificationQueue.ts`의 순수 함수로 검증).
 */
export default function SequentialCategorizer({
  open,
  onOpenChange,
  drafts,
  startDraftId,
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

  // 정식 저장("분류 완료하고 다음")에 성공한 draft ID. 앞·뒤 탐색 모두 이 집합을 건너뛴다.
  // 서버 저장 성공 전에는 여기 추가하지 않는다(§5).
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  // "기억난 만큼 적고 다음"으로 서버에 반영된 값 — draft id별로 보관해 이전 탐색으로
  // 돌아왔을 때도 오래된 값이 아니라 방금 저장한 값이 폼에 보이게 한다(§7).
  const [savedOverrides, setSavedOverrides] = useState<Record<string, Partial<CreateTransactionPayload>>>({});

  // 이번 세션에서 하나라도 정식 분류했는지 — 대시보드 무효화를 몰아서
  // 한 번만 하기 위한 플래그다(DESIGN_QA_01.md P2-3).
  const hasClassifiedRef = useRef(false);
  // 이전/나중에/기억난 만큼 적고 다음/분류 완료하고 다음 — 네 행동의 중복 실행을 막는 잠금
  // (§13 "저장·부분 저장 요청 중 네 행동의 중복 실행을 막는다", "빠른 연타로 같은 draft가
  // 두 번 confirm되지 않게 한다"). AddTransactionModal이 저장 중(isSaving)에는 네 버튼을
  // 모두 disabled 처리하지만, 그 상태가 반영되기 전의 아주 빠른 연속 클릭까지 여기서 막는다.
  const actionLockRef = useRef(false);

  async function withActionLock(fn: () => void | Promise<void>) {
    if (actionLockRef.current) return;
    actionLockRef.current = true;
    try {
      await fn();
    } finally {
      actionLockRef.current = false;
    }
  }

  // 모달이 열릴 때만 큐를 정렬해 스냅샷한다. (열려 있는 동안 목록이 바뀌어도 진행 중인
  // 순서를 유지한다 — §13 "query invalidation으로 외부 drafts 배열이 바뀌어도 열린 세션
  // queue를 통째로 재초기화하지 않는다")
  useEffect(() => {
    if (open) {
      const sorted = sortDraftsOldestFirst(drafts);
      setQueue(sorted);
      setIndex(resolveStartIndex(sorted, startDraftId));
      setFinished(sorted.length === 0);
      setCompletedIds(new Set());
      setSavedOverrides({});
      hasClassifiedRef.current = false;
      actionLockRef.current = false;
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

  // 큐 항목(defaultValues)은 draft 자체의 값 + 이번 세션에서 부분 저장한 값(savedOverrides)만
  // 반영한다. suggestion을 여기에 섞으면 늦게 도착한 추천이 폼 전체를 다시 리셋시켜 사용자가
  // 이미 고른 값을 덮어써버린다(DESIGN_QA_01.md P1-1). 추천은 별도 `suggestedValues`로 내려
  // "비어 있고 아직 손대지 않은 필드에만" 채워지도록 한다.
  const defaultValues: Partial<CreateTransactionPayload> | undefined = useMemo(() => {
    if (!current) return undefined;
    const base: Partial<CreateTransactionPayload> = {
      date: current.date,
      type: current.type ?? "EXPENSE",
      amount: Math.abs(current.amount),
      categoryId: current.category?.id ?? "",
      subCategoryId: current.subcategory?.id ?? "",
      accountId: current.account?.id ?? "",
      description: current.description ?? "",
    };
    const override = savedOverrides[current.id];
    return override ? { ...base, ...override } : base;
  }, [current, savedOverrides]);

  const suggestedValues = useMemo(() => {
    if (!suggestion.categoryId && !suggestion.accountId) return undefined;
    return {
      categoryId: suggestion.categoryId,
      subCategoryId: suggestion.subCategoryId,
      accountId: suggestion.accountId,
    };
  }, [suggestion]);

  const canGoPrevious = current ? findPreviousPendingIndex(queue, index, completedIds) !== null : false;

  // §9 "권장: 현재 항목을 제외한 미완료 draft 수" — 진행 중 남은 건수와 완료 요약의
  // "나중에 볼 기록"이 완료 ID 포함 여부 때문에 서로 다른 숫자가 되지 않도록 항상 같은
  // 정의(전체 큐 - 완료 ID 수)를 쓴다.
  const pendingExcludingCurrent = Math.max(0, queue.length - completedIds.size - (current ? 1 : 0));

  if (!open) return null;

  // 진행된 항목이 있으면 대시보드/통계 무효화를 몰아서 한 번만 실행하고 닫는다.
  const finalizeAndClose = () => {
    if (hasClassifiedRef.current) {
      invalidateDashboards();
      hasClassifiedRef.current = false;
    }
    onOpenChange(false);
  };

  // 다음 미완료 항목으로 이동하거나, 없으면 완료 요약으로 전환한다. `나중에` · `기억난 만큼
  // 적고 다음` · `분류 완료하고 다음` 세 행동이 공유하는 종료 판정 — 어느 행동으로 도달했든
  // "다음 미완료 항목이 더 이상 없다"는 같은 규칙으로만 판단한다(§7, §8 비대칭 금지).
  const advance = (nextCompletedIds: Set<string>) => {
    const next = findNextPendingIndex(queue, index, nextCompletedIds);
    if (next === null) {
      if (hasClassifiedRef.current) {
        invalidateDashboards();
        hasClassifiedRef.current = false;
      }
      setFinished(true);
      onAllDone?.();
    } else {
      setIndex(next);
    }
  };

  if (finished) {
    const savedCount = completedIds.size;
    const laterCount = queue.length - savedCount;
    // QA_REVIEW_041 P2-1 — `advance`는 현재 위치보다 뒤쪽만 찾으므로, 뒤쪽에 미완료 항목이
    // 없으면 앞쪽에 "나중에"·부분 저장으로 남겨둔 항목이 있어도 즉시 완료 화면으로 온다.
    // `index`는 완료 화면 전환 시점에도 그대로(마지막으로 있던 위치) 남아 있으므로, 그
    // 위치를 기준으로 "앞쪽 가장 가까운 미완료 항목"을 찾아 명시적으로 돌아갈 수 있게 한다.
    // 자동으로 처음부터 다시 순환시키지 않는다 — 사용자가 직접 눌렀을 때만 이동한다.
    const returnToLaterIndex = findPreviousPendingIndex(queue, index, completedIds);
    const handleReturnToLater = () => {
      if (returnToLaterIndex === null) return;
      setIndex(returnToLaterIndex);
      setFinished(false);
    };
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
            {laterCount > 0 ? "오늘 분류는 여기까지 했어요." : "책상 위 영수증을 모두 정리했어요."}
          </h2>
          <p className="text-sm text-ll-pencil break-keep">
            {laterCount > 0
              ? `${savedCount}건을 정리하고 ${laterCount}건은 다음으로 미뤘어요.`
              : "오늘 할 일은 여기까지. 다음 기록도 대충 남겨주세요."}
          </p>
          {/* 부분 저장은 "정리한 기록"에 세지 않는다(§9) — savedCount는 completedIds(정식
              저장)만 반영하고, laterCount(=전체-완료)가 "나중에"·부분 저장·미방문 draft를
              함께 묶어 "나중에 볼 기록"으로 보여준다. */}
          {queue.length > 0 && (
            <div className="grid w-full grid-cols-2 gap-2" aria-hidden="true">
              <div className="rounded-xl bg-ll-cream px-3 py-3">
                <b className="block text-xl font-black text-ll-ink">{savedCount}</b>
                <span className="text-xs text-ll-pencil">정리한 기록</span>
              </div>
              <div className="rounded-xl bg-ll-cream px-3 py-3">
                <b className="block text-xl font-black text-ll-ink">{laterCount}</b>
                <span className="text-xs text-ll-pencil">나중에 볼 기록</span>
              </div>
            </div>
          )}
          {/* 완전히 저장돼 돌아갈 곳이 없으면(§QA_REVIEW_041 P2-1 완료 기준) 렌더링하지 않는다. */}
          {returnToLaterIndex !== null && (
            <button
              type="button"
              autoFocus
              onClick={handleReturnToLater}
              className="min-h-[44px] w-full rounded-xl border border-ll-ink/20 px-5 text-sm font-bold text-ll-ink hover:bg-ll-cream/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ll-ink focus-visible:ring-offset-2"
            >
              ← 넘긴 기록 다시 보기
            </button>
          )}
          <button
            type="button"
            autoFocus={returnToLaterIndex === null}
            onClick={() => onOpenChange(false)}
            className="min-h-[44px] w-full rounded-xl bg-ll-ink px-5 text-sm font-bold text-ll-paper hover:bg-ll-ink/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ll-ink focus-visible:ring-offset-2"
          >
            내역으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  if (!current) return null;

  const handlePrevious = () =>
    withActionLock(() => {
      const prev = findPreviousPendingIndex(queue, index, completedIds);
      if (prev === null) return;
      setIndex(prev);
      toast.info("이전에 넘긴 기록으로 돌아왔어요.");
    });

  const handleSkip = () =>
    withActionLock(() => {
      // 나중에: 서버 호출 없이 현재 입력 변경을 버리고 다음 미완료 항목으로 이동한다.
      // 원본 draft는 그대로이므로 다음에 다시 열면 오래된 순서 그대로 다시 보인다(§7).
      toast.info("이 기록은 다음에 다시 보여드릴게요.");
      advance(completedIds);
    });

  const handleSubmit = (payload: CreateTransactionPayload) =>
    withActionLock(async () => {
      const result = await confirmDraft(current.id, payload);
      invalidateItemLevel();
      hasClassifiedRef.current = true;

      if (result.warning) {
        // 이체는 이미 등록됐고, 남은 임시 내역 정리만 안내하는 경고이므로 큐는 계속 진행한다.
        // 놓치기 쉬운 안내라 기본(3초)보다 오래 띄운다(DESIGN_QA_02.md §3 권장).
        toast.info(result.warning, 8000);
      }

      const nextCompletedIds = new Set(completedIds);
      nextCompletedIds.add(current.id);
      setCompletedIds(nextCompletedIds);
      advance(nextCompletedIds);
    });

  const handleSaveDraft = (payload: Partial<CreateTransactionPayload>) =>
    withActionLock(async () => {
      if (!payload.date || payload.amount == null) return;
      await updateDraftInPlace(current.id, payload);
      invalidateItemLevel();
      // 세션 snapshot도 성공한 payload로 갱신해, 이전으로 돌아왔을 때 오래된 값이 아니라
      // 방금 저장한 값이 보이게 한다(§7 "세션 snapshot도 성공 응답 또는 payload로 갱신").
      setSavedOverrides((prev) => ({ ...prev, [current.id]: payload }));
      toast.info("적은 내용까지 저장하고 다음 기록을 볼게요.");
      advance(completedIds);
    });

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
      onSkip={handleSkip}
      onPrevious={canGoPrevious ? handlePrevious : undefined}
      autoCloseOnSubmit={false}
      queueProgress={{ current: index + 1, total: queue.length, remaining: pendingExcludingCurrent }}
      onSkipRemaining={handleSkipRemaining}
      transitionKey={current.id}
      suggestionBasis={suggestion.basis}
    />
  );
}
