"use client";

import { useMemo } from "react";
import PandaBrandArt from "@/src/components/auth/PandaBrandArt";
import { formatKoreanDateWithWeekday } from "@/src/utils/date";

interface DeskHeroProps {
  onQuickRecord: () => void;
}

/**
 * 책상형 모바일 홈의 인사 영역 — 짧은 인사 한 줄 + 판다(40~48px, 1회만) + 빠른 기록 CTA.
 * IMPLEMENTATION_BRIEF_010 §5 "인사 영역"/"빠른 기록 CTA", DECISION_010 §3.
 */
export default function DeskHero({ onQuickRecord }: DeskHeroProps) {
  const today = useMemo(() => new Date(), []);

  return (
    <section className="grid grid-cols-[1fr_auto] gap-2.5 bg-ll-paper px-4 pb-3.5 pt-4">
      <div className="min-w-0">
        <p className="mb-1 text-[11px] text-ll-pencil">{formatKoreanDateWithWeekday(today)}</p>
        <h2 className="text-[22px] font-black leading-[1.24] tracking-tight text-ll-ink break-keep">
          오늘 쓴 돈,
          <br />
          생각날 때만 적어요.
        </h2>
      </div>
      {/* 판다는 인사 영역에 1회만 사용한다(DECISION_010 §2). 새 이미지를 만들지 않고
          로그인 화면과 동일한 panda-face-transparent.png를 재사용한다. */}
      <div className="flex h-[47px] w-[47px] items-center justify-center rounded-[17px] bg-ll-butter p-[3px]">
        <PandaBrandArt size={41} />
      </div>

      <button
        type="button"
        onClick={onQuickRecord}
        className="col-span-2 mt-1 min-h-[52px] rounded-[15px] border-2 border-ll-ink bg-ll-tomato text-[15px] font-extrabold text-white shadow-[3px_3px_0_var(--color-ll-ink)] transition-transform active:translate-y-0.5"
      >
        빠르게 기록하기
      </button>
    </section>
  );
}
