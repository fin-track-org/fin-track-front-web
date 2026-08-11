"use client";

import { ReactNode, forwardRef, type CSSProperties, type KeyboardEvent } from "react";

/**
 * 영수증 형태의 거래 목록 프레젠테이션 컴포넌트.
 * DESIGN_SYSTEM.md §5, §7 Transaction receipt 규칙:
 * 흰 배경 · 점선 구분 · 찢어진 하단, 첫 줄 설명/금액 · 둘째 줄 분류·결제수단.
 *
 * 드래그 정렬, 무한 스크롤, 수정/삭제 등 기존 로직은 그대로 두고
 * 시각적 껍데기만 담당한다 (LedgerTable.tsx의 모바일 카드에서 사용).
 */
interface ReceiptCardProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

export const ReceiptCard = forwardRef<HTMLDivElement, ReceiptCardProps>(function ReceiptCard(
  { children, className = "", style },
  ref,
) {
  return (
    <div
      ref={ref}
      style={style}
      className={[
        "relative overflow-hidden rounded-md bg-white",
        "shadow-[3px_5px_0_rgba(32,40,58,0.07)]",
        className,
      ].join(" ")}
    >
      {children}
      {/* 찢어진 하단 장식 (순수 장식, 정보 전달에 사용하지 않음) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 left-0 right-0 h-2"
        style={{
          backgroundImage:
            "linear-gradient(135deg, transparent 5px, white 0) 0 0 / 10px 10px repeat-x",
        }}
      />
    </div>
  );
});

interface ReceiptRowProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** 지정하면 행 전체가 클릭/키보드로 상세를 열 수 있다. 내부에 실제 버튼(수정/삭제 등)이
   *  함께 있을 수 있으므로 시맨틱상 <button> 중첩을 피하기 위해 div + role="button"으로 렌더링한다. */
  onClick?: () => void;
  "aria-label"?: string;
}

export const ReceiptRow = forwardRef<HTMLDivElement, ReceiptRowProps>(function ReceiptRow(
  { children, className = "", style, onClick, ...rest },
  ref,
) {
  const interactive = !!onClick;

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!interactive) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick?.();
    }
  };

  return (
    <div
      ref={ref}
      style={style}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={interactive ? () => onClick?.() : undefined}
      onKeyDown={interactive ? handleKeyDown : undefined}
      className={[
        "flex w-full items-start justify-between gap-3 border-b border-dotted border-ll-ink/25 px-3.5 py-3 text-left last:border-b-0",
        interactive
          ? "min-h-[44px] cursor-pointer transition-colors hover:bg-ll-cream/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ll-ink"
          : "",
        className,
      ].join(" ")}
      {...rest}
    >
      {children}
    </div>
  );
});

interface DateTapeProps {
  label: string;
  meta?: string;
  className?: string;
}

/** 날짜 그룹 헤더 (예: "AUG 06 / WED · 지출 42,500"). */
export function DateTape({ label, meta, className = "" }: DateTapeProps) {
  return (
    <div
      className={`flex items-center justify-between rounded-full bg-ll-ink px-3.5 py-1.5 text-ll-paper ${className}`}
    >
      <span className="text-xs font-bold tracking-wide">{label}</span>
      {meta && <span className="text-[11px] font-medium text-ll-paper/80">{meta}</span>}
    </div>
  );
}

export default ReceiptCard;
