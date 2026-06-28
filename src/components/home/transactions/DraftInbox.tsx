import React from "react";
import { Trash2 } from "lucide-react";

export default function DraftInbox({ drafts, isLoading, onOpenDraft, onDeleteDraft }: {
  drafts: any[];
  isLoading: boolean;
  onOpenDraft: (draft: any) => void;
  onDeleteDraft: (id: string) => void;
}) {
  if (isLoading) {
    return <div className="py-12 text-center text-sm text-gray-500">임시 보관함 불러오는 중...</div>;
  }

  if (drafts.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-400 text-sm">임시 보관함이 비어 있습니다.</p>
        <p className="text-gray-300 text-xs mt-1">빠른 추가로 등록한 내역이 여기에 쌓입니다.</p>
      </div>
    );
  }

  return (
    <div id="tutorial-draft-content" className="space-y-3">
      {drafts.map((draft) => (
        <div
          key={draft.id}
          className="w-full flex items-center justify-between px-5 py-4 bg-white border border-amber-100 rounded-xl shadow-sm hover:border-amber-300 transition-colors"
        >
          <div 
            className="flex-1 flex items-center justify-between cursor-pointer group pr-4"
            onClick={() => onOpenDraft(draft)}
          >
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium text-gray-800">
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
              <span className="text-xs text-amber-400 group-hover:text-amber-600 transition-colors whitespace-nowrap hidden sm:inline">
                탭하여 분류하기 →
              </span>
            </div>
          </div>
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
