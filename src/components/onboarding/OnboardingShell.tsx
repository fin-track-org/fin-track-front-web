"use client";

import Image from "next/image";
import { ReactNode } from "react";
import logoImg from "@/public/images/logo.jpg";

interface OnboardingShellProps {
  step: 1 | 2 | 3;
  onSkipAll: () => void;
  skipDisabled?: boolean;
  children: ReactNode;
}

const STEP_LABEL: Record<1 | 2 | 3, string> = {
  1: "사용 방식 선택",
  2: "기본 결제수단 등록",
  3: "첫 기록",
};

/**
 * 온보딩 1~3단계가 공유하는 뼈대(IMPLEMENTATION_BRIEF_004 §9).
 * 상단 로고 + 진행률 + "첫 설정 건너뛰기", 본문 최대 640px, 모바일 1열.
 * 완료 상태(StepComplete)는 이 Shell을 쓰지 않고 독립된 전체 화면으로 그린다(§7 — 판다는 완료 상태 전용).
 */
export function OnboardingShell({ step, onSkipAll, skipDisabled, children }: OnboardingShellProps) {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-ll-paper">
      <header className="flex items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <Image
          src={logoImg}
          alt="게으른 가계부 로고"
          width={152}
          height={41}
          className="h-auto w-24 rounded-md sm:w-28"
          priority
        />
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-ll-pencil" aria-hidden="true">
            {step}/3
          </span>
          <button
            type="button"
            onClick={onSkipAll}
            disabled={skipDisabled}
            className="flex min-h-[44px] items-center rounded-full px-2 text-xs font-semibold text-ll-pencil underline underline-offset-2 transition-colors hover:text-ll-ink disabled:cursor-not-allowed disabled:opacity-50"
          >
            첫 설정 건너뛰기
          </button>
        </div>
      </header>

      {/* 화면낭독 전용 — 시각적 진행률("n/3")과 별개로 현재 단계 제목을 알린다(§10). */}
      <p className="sr-only" aria-live="polite">
        {`${step}/3단계: ${STEP_LABEL[step]} 진행 중이에요.`}
      </p>

      <main className="mx-auto flex w-full max-w-[640px] flex-1 flex-col px-4 pb-8 sm:px-6">
        {children}
      </main>
    </div>
  );
}

export default OnboardingShell;
