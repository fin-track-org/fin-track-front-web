"use client";

import { ChevronLeft, ChevronRight, Search } from "lucide-react";

export const MOBILE_TOOLBAR_APPBAR_HEIGHT_PX = 48;

type ViewMode = "daily" | "weekly" | "monthly" | "custom";

interface MobileLedgerToolbarProps {
  onOpenSearchFilter: () => void;
  activeFilterCount: number;
  activeFilterChips: { key: string; label: string; onRemove: () => void }[];
  hasActiveFilters: boolean;
  onResetFilters: () => void;
  isExcelView: boolean;
  onChangeIsExcelView: (isExcel: boolean) => void;
  viewMode: ViewMode;
  onChangeViewMode: (mode: ViewMode) => void;
  dateDisplayString: string;
  onPrev: () => void;
  onNext: () => void;
}

const RANGE_TABS: { mode: ViewMode; label: string }[] = [
  { mode: "daily", label: "일" },
  { mode: "weekly", label: "주" },
  { mode: "monthly", label: "월" },
  { mode: "custom", label: "기간" },
];

/**
 * 모바일 상단 구성(IMPLEMENTATION_BRIEF_011 §5) 1~4번 — 앱 바, 보기 전환, 기간 단위,
 * 이전·다음 기간. 결제수단 selector는 여기 없다 — `AccountBalanceShelf`가 그 역할을
 * 대체한다(§6, 구현 금지 사항 "선반과 별도 결제수단 셀렉트를 중복 배치하는 방식").
 */
export default function MobileLedgerToolbar({
  onOpenSearchFilter,
  activeFilterCount,
  activeFilterChips,
  hasActiveFilters,
  onResetFilters,
  isExcelView,
  onChangeIsExcelView,
  viewMode,
  onChangeViewMode,
  dateDisplayString,
  onPrev,
  onNext,
}: MobileLedgerToolbarProps) {
  return (
    <>
      <div
        className="sticky top-0 z-[8] flex items-center justify-between border-b border-ll-ink/12 bg-ll-paper/97 px-4 backdrop-blur-sm"
        style={{ height: MOBILE_TOOLBAR_APPBAR_HEIGHT_PX }}
      >
        <h1 className="text-lg font-black text-ll-ink">거래내역</h1>
        <button
          type="button"
          onClick={onOpenSearchFilter}
          className="flex min-h-[36px] items-center gap-1.5 rounded-full bg-ll-cream px-3 text-xs font-bold text-ll-ink"
        >
          <Search className="h-3.5 w-3.5" aria-hidden="true" />
          검색·필터
          {activeFilterCount > 0 && (
            <span className="inline-grid min-w-[18px] place-items-center rounded-full bg-ll-tomato px-1 text-[10px] font-bold text-white">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* 활성 필터 칩(QA_REVIEW_024 §4) — 시트가 같은 화면 state를 직접 갱신하므로 실제로
          작동한다. 최대 3개까지만 노출하고, 전체 해제는 "초기화" 링크로 한다. */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-1.5 px-4 pt-2.5">
          {activeFilterChips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={chip.onRemove}
              className="inline-flex items-center gap-1 rounded-full border border-ll-ink/16 bg-ll-paper px-2.5 py-1 text-[11px] font-bold text-ll-ink"
            >
              {chip.label}
              <span aria-hidden="true" className="text-ll-pencil">×</span>
            </button>
          ))}
          <button
            type="button"
            onClick={onResetFilters}
            className="ml-auto text-[11px] font-bold text-ll-pencil underline underline-offset-2"
          >
            필터 초기화
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-0.5 rounded-2xl bg-ll-cream p-0.5 mx-4 mt-3">
        <button
          type="button"
          onClick={() => onChangeIsExcelView(false)}
          aria-pressed={!isExcelView}
          className={`min-h-[38px] rounded-xl text-xs font-black ${!isExcelView ? "bg-ll-paper shadow-[0_1px_5px_rgba(32,40,58,0.12)]" : "text-ll-ink/60"}`}
        >
          편하게 보기
        </button>
        <button
          type="button"
          onClick={() => onChangeIsExcelView(true)}
          aria-pressed={isExcelView}
          className={`min-h-[38px] rounded-xl text-xs font-black ${isExcelView ? "bg-ll-paper shadow-[0_1px_5px_rgba(32,40,58,0.12)]" : "text-ll-ink/60"}`}
        >
          엑셀 장부
        </button>
      </div>

      <div className="px-4 pb-2.5 pt-2.5">
        <div className="grid grid-cols-4 gap-1">
          {RANGE_TABS.map(({ mode, label }) => (
            <button
              key={mode}
              type="button"
              onClick={() => onChangeViewMode(mode)}
              aria-pressed={viewMode === mode}
              className={`min-h-[32px] rounded-md border text-[11px] font-bold ${
                viewMode === mode ? "border-ll-ink bg-ll-ink text-ll-paper" : "border-ll-ink/16 bg-ll-paper text-ll-ink"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="mt-1.5 grid grid-cols-[40px_1fr_40px] items-center text-center">
          <button
            type="button"
            onClick={onPrev}
            disabled={viewMode === "custom"}
            aria-label="이전 기간"
            className="flex min-h-[40px] items-center justify-center rounded-full text-ll-ink disabled:opacity-30"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <strong className="truncate text-sm font-bold text-ll-ink">{dateDisplayString}</strong>
          <button
            type="button"
            onClick={onNext}
            disabled={viewMode === "custom"}
            aria-label="다음 기간"
            className="flex min-h-[40px] items-center justify-center rounded-full text-ll-ink disabled:opacity-30"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </>
  );
}
