"use client";

import { ReactNode, type ElementType } from "react";

export type StickyTone = "mint" | "coral" | "periwinkle" | "neutral";

const TONE_CLASS: Record<StickyTone, string> = {
  // Mint: 추천·성공
  mint: "bg-ll-mint text-ll-ink",
  // Coral tint: 주의 또는 아직 분류되지 않은 항목 (톤은 tomato 토큰의 옅은 음영으로 표현)
  coral: "bg-ll-tomato/15 text-ll-ink border border-ll-tomato/25",
  // Periwinkle tint: 정보(이체/분석 등)
  periwinkle: "bg-ll-periwinkle/15 text-ll-ink border border-ll-periwinkle/25",
  neutral: "bg-ll-cream text-ll-ink",
};

interface StickyNoteProps {
  tone?: StickyTone;
  /** 회전 각도(도). 시안 규칙상 ±2도 이내 권장 */
  rotate?: number;
  title?: ReactNode;
  children?: ReactNode;
  action?: { label: string; onClick: () => void };
  onClick?: () => void;
  className?: string;
  /** true면 버튼처럼 클릭 가능한 카드로 렌더링 */
  as?: "div" | "button";
  "aria-label"?: string;
}

/**
 * 게으른 가계부 디자인 시스템의 "포스트잇" 컴포넌트.
 * 미분류 거래 안내, 짧은 인사이트(StickyInsight) 등에 공용으로 사용한다.
 * 문장 한 개와 행동 한 개만 담는 것을 권장한다(DESIGN_SYSTEM.md §7 Sticky insight).
 */
export function StickyNote({
  tone = "neutral",
  rotate = -1,
  title,
  children,
  action,
  onClick,
  className = "",
  as = "div",
  ...rest
}: StickyNoteProps) {
  const Comp: ElementType = as;
  const interactive = as === "button" || !!onClick;

  return (
    <Comp
      type={as === "button" ? "button" : undefined}
      onClick={onClick}
      style={{ transform: `rotate(${rotate}deg)` }}
      className={[
        "w-full rounded-md p-3.5 shadow-[4px_5px_0_rgba(32,40,58,0.08)] text-left",
        "transition-transform duration-200 motion-reduce:transition-none",
        interactive ? "cursor-pointer hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ll-ink focus-visible:ring-offset-2" : "",
        TONE_CLASS[tone],
        className,
      ].join(" ")}
      {...rest}
    >
      {title && <p className="text-sm font-bold leading-snug break-keep">{title}</p>}
      {children && (
        <div className="mt-1 text-xs leading-relaxed break-keep [overflow-wrap:break-word]">
          {children}
        </div>
      )}
      {/* action은 카드 자체가 버튼(as="button")이 아닐 때만 별도의 인터랙티브 요소로 렌더링한다.
          (버튼 안에 버튼이 중첩되는 접근성 위반을 피하기 위함) */}
      {action && as !== "button" && (
        <button
          type="button"
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation();
            action.onClick();
          }}
          className="mt-2 inline-flex items-center rounded-full bg-ll-ink/90 px-2.5 py-1 text-[11px] font-semibold text-ll-paper hover:bg-ll-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ll-ink focus-visible:ring-offset-2"
        >
          {action.label}
        </button>
      )}
    </Comp>
  );
}

export default StickyNote;
