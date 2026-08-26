"use client";

import { useEffect, useRef } from "react";

interface SkipAllConfirmProps {
  open: boolean;
  pending?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * 상단 "첫 설정 건너뛰기" 확인 단계(§8). `window.confirm()` 대신 화면 안에서
 * role="alertdialog"로 제공해 스타일과 접근성(포커스 이동·트랩·복원, Escape)을 직접 관리한다.
 * (QA_REVIEW_011 P2-1: Tab 트랩과 닫힌 뒤 초점 복원 보강.)
 */
export function SkipAllConfirm({ open, pending, onCancel, onConfirm }: SkipAllConfirmProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  // 열릴 때: 직전 활성 요소(= "첫 설정 건너뛰기" 버튼)를 기억해두고 취소 버튼으로 초점을 옮긴다.
  // 닫힐 때: 기억해둔 요소로 초점을 되돌린다.
  useEffect(() => {
    if (open) {
      previouslyFocusedRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      cancelRef.current?.focus();
    } else if (previouslyFocusedRef.current) {
      previouslyFocusedRef.current.focus();
      previouslyFocusedRef.current = null;
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (!pending) onCancel();
        return;
      }

      if (e.key !== "Tab") return;

      // 패널 안에 포커스 가능한 요소가 이 두 버튼뿐이라, Tab/Shift+Tab이 배경 페이지로 새 나가지
      // 않도록 양 끝에서 서로에게로 순환시킨다.
      const first = confirmRef.current;
      const last = cancelRef.current;
      if (!first || !last) return;

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, pending, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/30 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 sm:items-center motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="skip-all-confirm-title"
        className="w-full max-w-sm rounded-2xl border border-ll-ink/10 bg-white p-6 shadow-[4px_5px_0_rgba(32,40,58,0.08)]"
      >
        <h2 id="skip-all-confirm-title" className="text-base font-bold text-ll-ink break-keep">
          기본 설정으로 홈을 열까요?
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ll-pencil break-keep">
          간편 모드로 시작하고, 결제수단과 첫 기록은 나중에 언제든 추가할 수 있어요.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            disabled={pending}
            aria-busy={pending}
            className="flex min-h-[44px] w-full items-center justify-center rounded-xl bg-ll-ink text-sm font-bold text-ll-paper transition-colors hover:bg-ll-ink/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? "여는 중..." : "기본 설정으로 열기"}
          </button>
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="flex min-h-[44px] w-full items-center justify-center rounded-xl border border-ll-ink/15 bg-white text-sm font-semibold text-ll-ink transition-colors hover:bg-ll-cream disabled:cursor-not-allowed disabled:opacity-50"
          >
            계속 설정할게요
          </button>
        </div>
      </div>
    </div>
  );
}

export default SkipAllConfirm;
