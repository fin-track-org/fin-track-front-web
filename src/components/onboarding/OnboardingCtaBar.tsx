"use client";

import { ReactNode } from "react";

/**
 * 각 단계 하단 CTA 묶음. 320px 폭과 홈 인디케이터 safe area를 함께 고려해
 * 화면 하단에 붙이고 버튼은 항상 전체 폭을 쓴다(§9 "하단 CTA는 320px과 safe area 대응").
 */
export function OnboardingCtaBar({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-0 left-0 right-0 -mx-4 mt-6 border-t border-ll-ink/10 bg-ll-paper/95 px-4 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] backdrop-blur sm:-mx-6 sm:px-6">
      <div className="mx-auto flex w-full max-w-[640px] flex-col gap-2">{children}</div>
    </div>
  );
}

export default OnboardingCtaBar;
