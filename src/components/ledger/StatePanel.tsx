"use client";

import { ReactNode } from "react";
import { Loader2 } from "lucide-react";

export type StatePanelTone = "neutral" | "info" | "warn" | "success";

const TONE_BORDER: Record<StatePanelTone, string> = {
  neutral: "border-t-ll-pencil/40",
  info: "border-t-ll-periwinkle",
  warn: "border-t-ll-tomato",
  success: "border-t-ll-mint",
};

interface StatePanelProps {
  tone?: StatePanelTone;
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  loading?: boolean;
  className?: string;
}

/**
 * 로딩/빈 상태/오류/완료를 화면 구조를 유지한 채 보여주는 공용 패널.
 * (핵심화면 시안 "공통 상태" 참고 — 카드 반복 대신 구분선/여백 위주.)
 */
export function StatePanel({
  tone = "neutral",
  icon,
  title,
  description,
  action,
  loading,
  className = "",
}: StatePanelProps) {
  return (
    <div
      role={tone === "warn" ? "alert" : "status"}
      className={[
        "rounded-xl border border-ll-ink/10 bg-white p-5",
        "border-t-[3px]",
        TONE_BORDER[tone],
        className,
      ].join(" ")}
    >
      <div className="flex items-start gap-3">
        {loading ? (
          <Loader2 className="mt-0.5 h-4 w-4 flex-shrink-0 animate-spin text-ll-pencil" aria-hidden="true" />
        ) : (
          icon
        )}
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-ll-ink break-keep">{title}</h3>
          {description && (
            <p className="mt-1 text-xs leading-relaxed text-ll-pencil break-keep [overflow-wrap:break-word]">
              {description}
            </p>
          )}
          {action && (
            <button
              type="button"
              onClick={action.onClick}
              className="mt-3 inline-flex min-h-[36px] items-center rounded-full bg-ll-ink px-4 text-xs font-semibold text-ll-paper hover:bg-ll-ink/90"
            >
              {action.label}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default StatePanel;
