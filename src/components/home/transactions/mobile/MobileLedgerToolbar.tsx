"use client";

import { ChevronLeft, ChevronRight, Search } from "lucide-react";

export const MOBILE_TOOLBAR_APPBAR_HEIGHT_PX = 48;

type ViewMode = "daily" | "weekly" | "monthly" | "custom";

interface MobileLedgerToolbarProps {
  onOpenSearchFilter: () => void;
  activeFilterCount: number;
  activeFilterChips: { key: string; label: string; onRemove: () => void }[];
  onResetFilters: () => void;
  /** 검색·필터 결과 모드 활성 여부(DECISION_013 "결과 모드", IMPLEMENTATION_BRIEF_013 §5.2) —
   * 검색어/유형/카테고리 조건 개수와 더 이상 같지 않다. 조회 기간만 적용해도(조건이 하나도
   * 없어도) true가 될 수 있다("기간-only 결과 모드"). 이 값이 true일 때만 결과 헤더(조회
   * 범위 칩·조건 칩·"조건 수정"/"검색·필터 종료")를 보여주고, 일반 장부 기간 탭은 숨긴다. */
  isSearchResultMode: boolean;
  /** 결과 모드의 조회 범위 칩 문구(예: "전체 기간", "현재 기간 · 8/17~8/23", "8/1~8/15"). */
  searchRangeLabel: string;
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
  onResetFilters,
  isSearchResultMode,
  searchRangeLabel,
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
        {/* IMPLEMENTATION_BRIEF_017 §4.1 — 공통 MobileTopBar가 이제 이 pathname(/home/
            transactions)의 제목("거래내역")을 그린다. 이 h1은 원래 이 bar의 폭·높이를
            잡아주던 요소라 지우면 검색 버튼 위치와 sticky 높이(MOBILE_TOOLBAR_APPBAR_
            HEIGHT_PX, 잔액 선반·엑셀 헤더 offset 계산의 기준)가 흔들린다. 그래서 DOM·레이아웃
            폭은 그대로 두고 시각적으로만 숨긴다(`invisible`은 자리를 차지하되 안 보이고,
            접근성 트리에서도 빠져 스크린리더가 두 번 읽지 않는다). */}
        <h1 className="invisible text-lg font-black text-ll-ink" aria-hidden="true">거래내역</h1>
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

      {/* 검색·필터 결과 모드 헤더(DECISION_013 "결과 모드", IMPLEMENTATION_BRIEF_013 §5) —
          시트가 같은 화면 state를 직접 갱신하므로 실제로 작동한다. 조건이 하나도 없는
          "기간-only 결과 모드"에서도 이 헤더는 그대로 보여야 한다 — 조회 범위 칩(제거 불가,
          누르면 시트를 열어 범위를 수정) + 조건 칩(있으면 최대 3개, 개별 제거) + "조건 수정"/
          "검색·필터 종료"를 보여준다. */}
      {isSearchResultMode && (
        <div className="flex flex-wrap items-center gap-1.5 px-4 pt-2.5">
          <button
            type="button"
            onClick={onOpenSearchFilter}
            className="inline-flex items-center gap-1 rounded-full border border-ll-ink/30 bg-ll-butter px-2.5 py-1 text-[11px] font-bold text-ll-ink"
          >
            🗓 {searchRangeLabel}
          </button>
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
          <div className="ml-auto flex items-center gap-2.5">
            <button
              type="button"
              onClick={onOpenSearchFilter}
              className="text-[11px] font-bold text-ll-ink underline underline-offset-2"
            >
              조건 수정
            </button>
            <button
              type="button"
              onClick={onResetFilters}
              className="text-[11px] font-bold text-ll-pencil underline underline-offset-2"
            >
              검색·필터 종료
            </button>
          </div>
        </div>
      )}

      <div className={`grid grid-cols-2 gap-0.5 rounded-2xl bg-ll-cream p-0.5 mx-4 mt-3 ${isSearchResultMode ? "mb-3" : ""}`}>
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

      {/* QA_REVIEW_027 P2 — 결과 모드에서는 일반 장부 기간 조작부(일/주/월/기간, 이전/다음)를
          숨긴다. 실제 검색 결과는 `appliedSearchRange`만 참조해 이 버튼들을 눌러도 아무 효과가
          없었고, 클릭 자체가 배경의 일반 장부 viewMode/currentDate를 조용히 바꿔버렸다. 조회
          범위 변경은 위 범위 칩 또는 "조건 수정"으로 필터 시트를 열어서만 하게 한다. */}
      {!isSearchResultMode && (
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
      )}
    </>
  );
}
