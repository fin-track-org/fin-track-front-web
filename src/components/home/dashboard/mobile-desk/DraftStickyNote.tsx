"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getDrafts } from "@/src/lib/api/transaction/transactions";
import { getCategories } from "@/src/lib/api/categoryApi";
import { getAccounts } from "@/src/lib/api/accountApi";
import SequentialCategorizer from "@/src/components/home/transactions/SequentialCategorizer";
import DeskObjectSheet from "./DeskObjectSheet";
import { useAuthErrorRedirect } from "@/src/hook/useAuthErrorRedirect";

const PREVIEW_MAX = 3;

interface DraftStickyNoteProps {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
}

/**
 * 책상 위 "포스트잇" — 미분류(임시) 거래. `["drafts"]` query와 `SequentialCategorizer`를
 * 데스크톱 `UnclassifiedNotes`와 그대로 공유한다(같은 query key라 캐시도 공유된다).
 * IMPLEMENTATION_BRIEF_010 §6.
 */
export default function DraftStickyNote({ isOpen, onOpen, onClose }: DraftStickyNoteProps) {
  const [flowOpen, setFlowOpen] = useState(false);
  const [startDraftId, setStartDraftId] = useState<string | undefined>(undefined);

  const { data: drafts = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ["drafts"],
    queryFn: getDrafts,
  });
  useAuthErrorRedirect(error);

  // 분류 flow가 실제로 열릴 때만 조회한다(기존 UnclassifiedNotes의 지연 조회 원칙 유지).
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: () => getCategories(),
    enabled: flowOpen,
  });
  const { data: accounts = [] } = useQuery({
    queryKey: ["accounts"],
    queryFn: getAccounts,
    enabled: flowOpen,
  });

  const preview = useMemo(() => drafts.slice(0, PREVIEW_MAX), [drafts]);
  const count = drafts.length;
  const first = drafts[0];

  // draft ID로 시작 항목을 지정한다(IMPLEMENTATION_BRIEF_018 §4) — 큐가 열릴 때 오래된
  // 순으로 정렬되므로 index가 아니라 ID라야 사용자가 실제로 누른 항목부터 시작한다.
  const openFlow = (id?: string) => {
    setStartDraftId(id);
    setFlowOpen(true);
  };

  const cardClassName =
    "object relative min-h-[166px] rounded-md border-0 bg-ll-butter p-4 pb-5 text-left shadow-[4px_5px_0_rgba(32,40,58,0.3)] [transform:rotate(-1.8deg)]";
  const cardStyle = { clipPath: "polygon(0 0,100% 0,100% 89%,89% 100%,0 100%)" } as const;

  return (
    <>
      {isError ? (
        // 재시도 버튼이 있는 오류 상태는 내부에 실제 <button>이 하나 더 필요해
        // 바깥을 버튼으로 만들면 버튼 중첩이 된다. div로 감싸고 재시도만 버튼으로 둔다.
        <div className={cardClassName} style={cardStyle}>
          <span className="absolute right-3.5 top-2.5 h-3.5 w-3.5 rounded-full border-2 border-ll-ink bg-ll-tomato" aria-hidden="true" />
          <span className="text-[11px] font-bold text-ll-ink/70">책상 위 메모</span>
          <strong className="mt-4 block text-lg font-black leading-tight text-ll-ink break-keep">
            메모를 확인하지 못했어요
          </strong>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-1.5 min-h-[32px] text-xs font-bold underline"
          >
            다시 시도
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={onOpen}
          aria-haspopup="dialog"
          className={`${cardClassName} transition-transform active:translate-y-0.5 focus-visible:outline focus-visible:outline-3 focus-visible:outline-ll-periwinkle focus-visible:outline-offset-4`}
          style={cardStyle}
        >
          <span className="absolute right-3.5 top-2.5 h-3.5 w-3.5 rounded-full border-2 border-ll-ink bg-ll-tomato" aria-hidden="true" />
          <span className="text-[11px] font-bold text-ll-ink/70">책상 위 메모</span>

          {isLoading ? (
            <div className="mt-4 space-y-2" aria-hidden="true">
              <div className="h-5 w-24 animate-pulse rounded bg-ll-ink/10" />
              <div className="h-3 w-32 animate-pulse rounded bg-ll-ink/10" />
            </div>
          ) : count === 0 ? (
            <>
              <strong className="mt-4 block text-lg font-black leading-tight text-ll-ink break-keep">
                책상 위가 깨끗해요
              </strong>
              <p className="mt-1.5 text-xs leading-relaxed text-ll-ink/70 break-keep">
                아직 정리할 메모가 없어요.
              </p>
            </>
          ) : (
            <>
              <strong className="mt-4 block text-xl font-black leading-tight text-ll-ink break-keep">
                미분류
                <br />
                {count}건
              </strong>
              <p className="mt-1.5 text-xs leading-snug text-ll-ink/80 break-keep [overflow-wrap:break-word]">
                {Math.abs(first.amount).toLocaleString()}원 · {first.description || "메모 없음"}
                {count > 1 && <br />}
                {count > 1 && `외 ${count - 1}건`}
              </p>
              <span className="absolute bottom-3 left-4 text-[10px] font-extrabold text-ll-ink">
                눌러서 정리하기 →
              </span>
            </>
          )}
        </button>
      )}

      <DeskObjectSheet
        open={isOpen}
        onClose={onClose}
        titleId="desk-sheet-draft-title"
        title={count > 0 ? `책상 위 메모 ${count}건` : "책상 위 메모"}
        description={
          count > 0 ? "금액만 적어둔 메모예요. 하나씩 분류해볼까요?" : "책상 위가 깨끗해요."
        }
        toneClassName="bg-[#f9d86e]"
        // QA_REVIEW_020 P2-1: 분류 모달(SequentialCategorizer → AddTransactionModal)이 이
        // sheet 위에 열려 있는 동안은 Escape를 그쪽에 양보한다.
        hasNestedDialog={flowOpen}
      >
        {isError ? (
          <div className="py-6 text-center">
            <p className="text-sm text-ll-ink/70">메모를 확인하지 못했어요.</p>
            <button
              type="button"
              onClick={() => refetch()}
              className="mt-3 min-h-[44px] rounded-full border-2 border-ll-ink px-4 text-sm font-bold"
            >
              다시 시도
            </button>
          </div>
        ) : count === 0 ? (
          <p className="py-6 text-center text-sm text-ll-ink/70">
            책상 위가 깨끗해요. 정리할 메모가 없어요.
          </p>
        ) : (
          <>
            <div className="border-t-2 border-ll-ink">
              {preview.map((draft) => (
                <button
                  key={draft.id}
                  type="button"
                  onClick={() => openFlow(draft.id)}
                  className="grid min-h-[58px] w-full grid-cols-[1fr_auto] items-center gap-3 border-b border-ll-ink/20 py-2 text-left"
                >
                  <div className="min-w-0">
                    <strong className="block text-sm font-semibold text-ll-ink truncate">
                      {draft.description || "메모 없음"}
                    </strong>
                    <small className="mt-0.5 block text-[11px] text-ll-pencil">
                      {draft.date} · {draft.type === "EXPENSE" ? "지출" : "수입"}
                    </small>
                  </div>
                  <b className="text-[13px] font-extrabold tabular-nums text-ll-ink">
                    {Math.abs(draft.amount).toLocaleString()}원
                  </b>
                </button>
              ))}
            </div>
            <button
              type="button"
              // "N건 정리하기"는 항상 정렬된 큐의 첫 항목(가장 오래된 미완료 항목)부터 연다
              // (IMPLEMENTATION_BRIEF_010 §6/§19, IMPLEMENTATION_BRIEF_018 §4).
              onClick={() => openFlow()}
              className="mt-4 min-h-[50px] w-full rounded-2xl bg-ll-ink text-sm font-extrabold text-ll-paper"
            >
              {count}건 정리하기
            </button>
          </>
        )}
      </DeskObjectSheet>

      <SequentialCategorizer
        open={flowOpen}
        onOpenChange={setFlowOpen}
        drafts={drafts}
        startDraftId={startDraftId}
        categories={categories}
        accounts={accounts}
      />
    </>
  );
}
