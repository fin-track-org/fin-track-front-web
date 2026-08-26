"use client";

import { useId } from "react";

interface AmountInputProps {
  id?: string;
  label?: string;
  /** 숨김 라벨 여부 (hero 사이즈에서는 시각적으로 숨기되 label은 유지) */
  hideLabel?: boolean;
  value: number | null;
  onChange: (value: number | null) => void;
  placeholder?: string;
  error?: string;
  size?: "hero" | "field";
  quickAmounts?: number[];
  onClear?: () => void;
  autoFocus?: boolean;
  disabled?: boolean;
}

/**
 * 자릿수에 따라 폰트 크기를 단계적으로 축소해 레이아웃 넘침을 막는다.
 * 6자리 이하(~99만원대, 실제 대부분의 거래 금액)일 때가 기존 빠른 등록 입력창과
 * 같은 최대 크기(모바일 text-4xl / sm 이상 text-5xl)가 되도록 맞췄다 — 리팩터 과정에서
 * 한 단계 더 커져 있던 것을 원래 크기로 되돌림.
 */
function heroFontClass(digitLength: number) {
  if (digitLength <= 6) return "text-4xl sm:text-5xl";
  if (digitLength <= 9) return "text-3xl sm:text-4xl";
  if (digitLength <= 12) return "text-2xl sm:text-3xl";
  return "text-xl sm:text-2xl";
}

/**
 * 빠른 기록/거래 등록에서 쓰는 금액 입력.
 * DESIGN_SYSTEM.md §7 Input — "빠른 기록 금액: 테두리 없는 대형 입력 + 굵은 하단선".
 */
export function AmountInput({
  id,
  label = "금액",
  hideLabel = false,
  value,
  onChange,
  placeholder = "0",
  error,
  size = "field",
  quickAmounts = [10000, 50000, 100000],
  onClear,
  autoFocus,
  disabled,
}: AmountInputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;

  const display = value != null ? value.toLocaleString("ko-KR") : "";
  const digitLength = value != null ? String(value).length : 0;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/[^0-9]/g, "");
    if (!digits) {
      onChange(null);
      return;
    }
    onChange(Number(digits));
  };

  const addAmount = (delta: number) => {
    onChange((value ?? 0) + delta);
  };

  const isHero = size === "hero";

  return (
    <div>
      <label
        htmlFor={inputId}
        className={hideLabel ? "sr-only" : "mb-1.5 block text-xs font-semibold text-ll-pencil"}
      >
        {label}
      </label>

      <div className={isHero ? "text-center" : "relative"}>
        <div className={isHero ? "inline-flex items-baseline justify-center gap-1" : "flex items-baseline gap-1"}>
          <input
            id={inputId}
            inputMode="numeric"
            pattern="\d*"
            autoFocus={autoFocus}
            disabled={disabled}
            aria-invalid={!!error}
            aria-describedby={error ? errorId : undefined}
            placeholder={placeholder}
            value={display}
            onChange={handleChange}
            className={[
              "bg-transparent text-ll-ink font-extrabold tabular-nums outline-none placeholder:text-ll-pencil/40",
              "transition-[font-size] duration-150",
              isHero
                ? `w-auto max-w-full border-0 border-b-4 border-ll-ink/80 pb-1 text-center focus-visible:border-ll-tomato ${heroFontClass(digitLength)}`
                : "w-full rounded-xl border border-ll-ink/15 bg-white px-4 py-3 text-xl focus-visible:border-ll-tomato focus-visible:ring-2 focus-visible:ring-ll-tomato/30",
              error ? "border-ll-tomato" : "",
            ].join(" ")}
          />
          <span className={isHero ? "text-lg font-semibold text-ll-pencil" : "text-sm font-medium text-ll-pencil"}>
            원
          </span>
        </div>
      </div>

      {quickAmounts.length > 0 && (
        <div className={`mt-3 flex flex-wrap gap-2 ${isHero ? "justify-center" : ""}`}>
          {quickAmounts.map((amt) => (
            <button
              key={amt}
              type="button"
              disabled={disabled}
              onClick={() => addAmount(amt)}
              className="min-h-[44px] rounded-full bg-ll-cream px-4 text-sm font-semibold text-ll-ink transition-colors hover:bg-ll-butter/60 disabled:opacity-50"
            >
              + {amt >= 10000 ? `${amt / 10000}만` : amt.toLocaleString()}
            </button>
          ))}
          <button
            type="button"
            disabled={disabled}
            onClick={() => (onClear ? onClear() : onChange(null))}
            className="min-h-[44px] rounded-full border border-ll-ink/20 px-4 text-sm font-semibold text-ll-pencil transition-colors hover:bg-ll-cream disabled:opacity-50"
          >
            정정
          </button>
        </div>
      )}

      {error && (
        <p id={errorId} role="alert" className="mt-2 text-xs font-medium text-ll-tomato">
          {error}
        </p>
      )}
    </div>
  );
}

export default AmountInput;
