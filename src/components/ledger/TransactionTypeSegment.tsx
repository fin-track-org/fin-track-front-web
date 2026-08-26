"use client";

export type SegmentType = "EXPENSE" | "INCOME" | "MOVE";

interface TransactionTypeSegmentProps {
  value: SegmentType;
  onChange: (value: SegmentType) => void;
  /** 표시할 옵션들 (기본: 지출/수입) */
  options?: SegmentType[];
  /** 라벨 오버라이드 (예: 빠른 기록에서는 "쓴 돈"/"들어온 돈") */
  labels?: Partial<Record<SegmentType, string>>;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
}

const DEFAULT_LABELS: Record<SegmentType, string> = {
  EXPENSE: "지출",
  INCOME: "수입",
  MOVE: "계좌 이동",
};

/**
 * 지출/수입(/계좌 이동) 토글. DESIGN_SYSTEM.md 형태 언어의 세그먼트 컨트롤.
 * `TRANSFER`(일반 이체 하나만 지칭하던 옛 옵션)는 IMPLEMENTATION_BRIEF_016로
 * `MOVE`(계좌 이동 전체 — 일반 이체·저축·투자를 포괄)로 대체됐다.
 */
export function TransactionTypeSegment({
  value,
  onChange,
  options = ["EXPENSE", "INCOME"],
  labels,
  disabled,
  className = "",
  ...rest
}: TransactionTypeSegmentProps) {
  return (
    <div
      role="group"
      className={`flex gap-1 rounded-xl bg-ll-cream p-1 ${className}`}
      {...rest}
    >
      {options.map((opt) => {
        const isOn = value === opt;
        return (
          <button
            key={opt}
            type="button"
            disabled={disabled}
            aria-pressed={isOn}
            onClick={() => onChange(opt)}
            className={[
              // break-keep: 320px에서도 "계좌 이동" 같은 라벨이 음절 단위로 찢기지 않게 한다(§11).
              "min-h-[44px] flex-1 rounded-lg px-1 text-sm font-bold break-keep transition-all",
              isOn ? "bg-ll-paper text-ll-ink shadow-sm" : "text-ll-pencil hover:text-ll-ink",
              disabled ? "opacity-50" : "",
            ].join(" ")}
          >
            {labels?.[opt] ?? DEFAULT_LABELS[opt]}
          </button>
        );
      })}
    </div>
  );
}

export default TransactionTypeSegment;
