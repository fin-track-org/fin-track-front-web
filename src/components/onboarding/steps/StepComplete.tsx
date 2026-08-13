"use client";

import { PandaBrandArt } from "@/src/components/auth/PandaBrandArt";

interface StepCompleteProps {
  onOpenHome: () => void;
}

/**
 * 완료 상태(§7). 판다 얼굴을 이 화면에서만 1회 사용하고, Shell의 진행률/건너뛰기는 쓰지 않는다.
 * 완료 직후 Joyride를 자동으로 시작하지 않는다(여기서 useQuestStore를 건드리지 않음).
 */
export default function StepComplete({ onOpenHome }: StepCompleteProps) {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-ll-paper px-4 py-10 text-center motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200">
      <PandaBrandArt size={112} className="mb-6" />
      <h1 className="text-2xl font-extrabold text-ll-ink break-keep">준비됐어요</h1>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-ll-pencil break-keep">
        앞으로는 금액만 먼저 적어도 괜찮아요.
      </p>
      <button
        type="button"
        onClick={onOpenHome}
        className="mt-8 flex min-h-[48px] w-full max-w-xs items-center justify-center rounded-xl bg-ll-ink px-6 text-base font-bold text-ll-paper transition-colors hover:bg-ll-ink/90"
      >
        내 가계부 열기
      </button>
    </div>
  );
}
