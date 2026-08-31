"use client";

/**
 * `/home/statistics`의 각 섹션이 공유하는 loading/error 표시(IMPLEMENTATION_BRIEF_019 §12).
 * "부분 오류에는 해당 query만 refetch하는 다시 시도를 연결한다" — 섹션 하나가 실패해도
 * 다른 섹션은 그대로 보이도록, 오류 UI를 섹션 하나 크기로만 감싼다(페이지 전체를 막지 않음).
 */

export function SectionSkeleton({ className = "h-24" }: { className?: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-2xl bg-ll-cream/70 ${className}`} />;
}

export function SectionError({
  message = "이 통계를 불러오지 못했어요.",
  onRetry,
}: {
  message?: string;
  onRetry: () => void;
}) {
  return (
    <div role="alert" className="rounded-2xl border border-ll-tomato/30 bg-ll-tomato/5 p-4">
      <p className="text-xs font-bold text-ll-ink break-keep">{message}</p>
      <p className="mt-1 text-[11px] text-ll-pencil break-keep">다른 통계는 그대로 볼 수 있어요.</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-2 min-h-[36px] text-[11px] font-extrabold text-ll-ink underline underline-offset-2"
      >
        다시 시도
      </button>
    </div>
  );
}

export function SectionHead({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-2 flex items-end justify-between gap-2">
      <h3 className="text-sm font-bold text-ll-ink break-keep">{title}</h3>
      {sub && <span className="text-[10px] text-ll-pencil break-keep">{sub}</span>}
    </div>
  );
}
