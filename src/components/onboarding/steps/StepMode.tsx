"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { updateLedgerMode } from "@/src/lib/api/userSettingApi";
import { StatePanel } from "@/src/components/ledger/StatePanel";
import { OnboardingCtaBar } from "../OnboardingCtaBar";
import { ONBOARDING_STEP_HEADING_ID } from "../constants";

interface ModeOption {
  value: LedgerMode;
  title: string;
  description: string;
  badge?: string;
}

const OPTIONS: ModeOption[] = [
  {
    value: "SIMPLE",
    title: "간편하게 기록",
    description: "이번 달에 들어오고 나간 돈만 가볍게 볼게요.",
    badge: "처음이라면 추천",
  },
  {
    value: "ASSET_MANAGEMENT",
    title: "계좌 잔액까지 관리",
    description: "계좌별 잔액, 이체와 저축까지 함께 맞춰볼게요.",
  },
];

interface StepModeProps {
  initialMode: LedgerMode;
  onSaved: (mode: LedgerMode) => void;
}

/** 1단계 — 사용 방식(가계부 모드) 선택(§4). */
export default function StepMode({ initialMode, onSaved }: StepModeProps) {
  const [selected, setSelected] = useState<LedgerMode>(initialMode);

  const { mutate, isPending, error } = useMutation({
    mutationFn: updateLedgerMode,
    onSuccess: (res) => onSaved(res.ledgerMode),
  });

  return (
    <div className="flex flex-1 flex-col motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200">
      <h1 id={ONBOARDING_STEP_HEADING_ID} tabIndex={-1} className="text-xl font-extrabold text-ll-ink break-keep outline-none">
        어떤 방식이 더 편한가요?
      </h1>

      <div role="radiogroup" aria-labelledby={ONBOARDING_STEP_HEADING_ID} className="mt-6 flex flex-col gap-3">
        {OPTIONS.map((option) => {
          const isSelected = selected === option.value;
          return (
            <label
              key={option.value}
              className={[
                "relative flex cursor-pointer flex-col gap-1 rounded-2xl border-2 bg-white p-4 transition-colors",
                isSelected ? "border-ll-tomato bg-ll-cream/40" : "border-ll-ink/10 hover:border-ll-ink/20",
              ].join(" ")}
            >
              <input
                type="radio"
                name="onboarding-ledger-mode"
                value={option.value}
                checked={isSelected}
                onChange={() => setSelected(option.value)}
                disabled={isPending}
                className="sr-only"
              />
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-bold text-ll-ink break-keep">{option.title}</span>
                <span
                  aria-hidden="true"
                  className={[
                    "flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2",
                    isSelected ? "border-ll-tomato bg-ll-tomato text-white" : "border-ll-ink/20 bg-white",
                  ].join(" ")}
                >
                  {isSelected && <Check size={12} strokeWidth={3} />}
                </span>
              </div>
              <p className="text-xs leading-relaxed text-ll-pencil break-keep">{option.description}</p>
              {option.badge && (
                <span className="mt-1 inline-flex w-fit items-center rounded-full bg-ll-butter/60 px-2 py-0.5 text-[11px] font-semibold text-ll-ink">
                  {option.badge}
                </span>
              )}
            </label>
          );
        })}
      </div>

      {error && (
        <StatePanel
          tone="warn"
          title="저장하지 못했어요"
          description={error instanceof Error ? error.message : "잠시 후 다시 시도해 주세요."}
          className="mt-4"
        />
      )}

      <OnboardingCtaBar>
        <button
          type="button"
          onClick={() => mutate({ ledgerMode: selected })}
          disabled={isPending}
          aria-busy={isPending}
          className="flex min-h-[48px] w-full items-center justify-center rounded-xl bg-ll-ink text-base font-bold text-ll-paper transition-colors hover:bg-ll-ink/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? "저장하는 중..." : "이 방식으로 시작"}
        </button>
        <button
          type="button"
          onClick={() => mutate({ ledgerMode: "SIMPLE" })}
          disabled={isPending}
          className="flex min-h-[44px] w-full items-center justify-center rounded-xl text-sm font-semibold text-ll-pencil underline underline-offset-2 hover:text-ll-ink disabled:cursor-not-allowed disabled:opacity-50"
        >
          일단 기본 설정으로 시작
        </button>
      </OnboardingCtaBar>
    </div>
  );
}
