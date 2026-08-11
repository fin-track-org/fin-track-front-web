import React from "react";
import { Trash2 } from "lucide-react";
import { StatePanel } from "@/src/components/ledger/StatePanel";
import { PawStamp } from "@/src/components/ledger/PawStamp";

export default function DraftInbox({ drafts, isLoading, onOpenDraft, onDeleteDraft }: {
  drafts: any[];
  isLoading: boolean;
  onOpenDraft: (draft: any) => void;
  onDeleteDraft: (id: string) => void;
}) {
  if (isLoading) {
    return <StatePanel loading title="다음 건 준비하는 중..." />;
  }

  if (drafts.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-12 text-center">
        <PawStamp size="sm" />
        <div>
          <p className="text-sm font-bold text-ll-ink break-keep">책상 위 영수증을 모두 정리했어요.</p>
          <p className="mt-1 text-xs text-ll-pencil break-keep">일단 기록으로 등록한 내역이 여기에 쌓여요.</p>
        </div>
      </div>
    );
  }

  return (
    <div id="tutorial-draft-content" className="space-y-3">
      {drafts.map((draft) => (
        <div
          key={draft.id}
          className="w-full flex items-center justify-between px-5 py-4 bg-white border border-ll-tomato/20 rounded-xl shadow-sm hover:border-ll-tomato/50 transition-colors"
        >
          <button
            type="button"
            className="min-h-[44px] flex-1 flex items-center justify-between cursor-pointer group pr-4 text-left"
            onClick={() => onOpenDraft(draft)}
          >
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium text-gray-800 break-keep">
                {draft.description || "(설명 없음)"}
              </span>
              <span className="text-xs text-gray-400">{draft.date}</span>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`text-sm font-semibold ${
                  draft.type !== "INCOME" ? "text-red-500" : "text-blue-500"
                }`}
              >
                {draft.type !== "INCOME" ? "-" : "+"}
                {Math.abs(draft.amount).toLocaleString()}원
              </span>
              <span className="text-xs text-ll-tomato group-hover:underline transition-colors whitespace-nowrap hidden sm:inline">
                탭하여 분류하기 →
              </span>
            </div>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDeleteDraft(draft.id);
            }}
            className="p-2 -mr-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            aria-label="삭제"
          >
            <Trash2 size={18} />
          </button>
        </div>
      ))}
    </div>
  );
}
