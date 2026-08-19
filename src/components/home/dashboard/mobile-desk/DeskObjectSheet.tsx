"use client";

import { useEffect, useRef, type ReactNode } from "react";

interface DeskObjectSheetProps {
  open: boolean;
  onClose: () => void;
  /** `aria-labelledby`로 연결할 제목 요소의 id. */
  titleId: string;
  title: ReactNode;
  description?: ReactNode;
  /** 물건 고유의 색(시안의 sticky-sheet/calendar-sheet/budget-sheet/receipt-sheet)을 유지한다. */
  toneClassName: string;
  children: ReactNode;
  /**
   * true면 이 sheet 안에서 `SequentialCategorizer`/`AddTransactionModal`처럼 별도의 중첩
   * dialog가 열려 있다는 뜻이다(예: 포스트잇 sheet 안에서 분류 모달을 연 상태).
   * `AddTransactionModal`도 자체 Escape 리스너를 갖고 있어, 이 sheet의 Escape 처리를
   * 그대로 두면 Escape 한 번에 안쪽 모달과 바깥 sheet가 동시에 닫혀버린다
   * (QA_REVIEW_020 P2-1). 안쪽 dialog가 열려 있는 동안은 이 sheet가 Escape를 양보해
   * "안쪽 모달 먼저 → sheet는 그다음" 순서를 보장한다. backdrop 클릭·focus trap·Android
   * 뒤로가기는 이 값과 무관하게 그대로 동작한다(안쪽 dialog가 자기 z-index 위에서 배경
   * 클릭을 먼저 받고, 뒤로가기는 history 스택이 항상 LIFO라 자연히 안쪽부터 닫힌다).
   */
  hasNestedDialog?: boolean;
  /**
   * sheet가 닫히면서 쌓아뒀던 `deskSheetOpen` history entry가 **실제로** 해소된 뒤(=그
   * entry에서 벗어났다는 진짜 `popstate`를 받은 뒤, 또는 애초에 벗어나 있었던 예외 상태라면
   * 그 자리에서 즉시) 정확히 한 번 호출된다. `setTimeout`으로 완료 시점을 추정하지 않는다 —
   * `history.back()`은 호출 즉시 이동을 끝내는 동기 API가 아니라서, 시간으로 추정하면
   * 기기에 따라 이 sheet의 back 이동이 늦게 끝나 그 뒤에 연 다른 history(예: quick modal의
   * `pushState`)까지 되돌아가는 경쟁 조건이 생길 수 있다(QA_REVIEW_022).
   * "sheet를 먼저 안전하게 닫고 나서 다른 걸 연다"가 필요한 호출부에서만 사용한다.
   */
  onAfterHistoryClose?: () => void;
}

/**
 * 책상 물건 네 개(포스트잇/달력/예산봉투/영수증)가 공유하는 확대 상세 패널.
 * backdrop, focus trap, Escape/Android 뒤로가기, body scroll lock을 한 곳에서 처리한다
 * (IMPLEMENTATION_BRIEF_010 §10). 동시에 하나만 열리도록 하는 책임은 부모
 * (`MobileDeskHome`의 `openObject` state)에 있고, 이 컴포넌트는 `open`이 true인 동안의
 * 다이얼로그 동작만 책임진다.
 */
export default function DeskObjectSheet({
  open,
  onClose,
  titleId,
  title,
  description,
  toneClassName,
  children,
  hasNestedDialog = false,
  onAfterHistoryClose,
}: DeskObjectSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  // 콜백이 리렌더마다 새 함수여도(부모가 메모이즈하지 않아도) history effect를 다시
  // 실행시키지(=history entry를 다시 push하지) 않도록 항상 최신 값만 ref로 들고 있는다.
  const onAfterHistoryCloseRef = useRef(onAfterHistoryClose);
  useEffect(() => {
    onAfterHistoryCloseRef.current = onAfterHistoryClose;
  }, [onAfterHistoryClose]);

  // 뒤로가기 완료를 기다리는 one-shot popstate listener가 있으면 참조를 들고 있다가,
  // 컴포넌트가 그 popstate를 받기 전에 완전히 unmount되는 예외 상황에서도 listener가
  // 남지 않도록 별도로 정리한다(QA_REVIEW_022 "listener가 unmount 후 남지 않는다").
  const pendingBackListenerRef = useRef<((e: PopStateEvent) => void) | null>(null);
  useEffect(() => {
    return () => {
      if (pendingBackListenerRef.current) {
        window.removeEventListener("popstate", pendingBackListenerRef.current);
        pendingBackListenerRef.current = null;
      }
    };
  }, []);

  // 열기 직전 focus를 갖고 있던 요소(=클릭한 물건 버튼)를 기억해뒀다가 닫을 때 복원한다.
  useEffect(() => {
    if (!open) return;
    triggerRef.current = document.activeElement as HTMLElement | null;
    // sheet 진입 모션(180~240ms)이 끝나기를 기다리지 않고 다음 프레임에 focus를 옮긴다 —
    // 모션 자체는 CSS transition이라 focus 이동과 독립적이다.
    const raf = requestAnimationFrame(() => closeButtonRef.current?.focus());
    return () => cancelAnimationFrame(raf);
  }, [open]);

  // 닫힐 때 trigger로 focus를 복원한다.
  useEffect(() => {
    if (open) return;
    triggerRef.current?.focus?.();
    triggerRef.current = null;
  }, [open]);

  // body/document scroll lock — 열려 있는 동안만, 닫으면 정확히 복구한다.
  useEffect(() => {
    if (!open) return;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [open]);

  // Android 뒤로가기 — 기존 MobileTopBar 드로어(profileOpen)/NotificationBell(noticeOpen)
  // 패턴과 동일하되 상태 key(`deskSheetOpen`)를 구분해 충돌하지 않게 한다.
  useEffect(() => {
    if (!open) return;

    const currentState = window.history.state;
    window.history.pushState({ ...currentState, deskSheetOpen: true }, "");

    const handlePopState = (e: PopStateEvent) => {
      if (!e.state?.deskSheetOpen) {
        onClose();
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);

      if (window.history.state?.deskSheetOpen) {
        // 아직 우리가 쌓은 entry 위에 있다 = 실제 브라우저 뒤로가기가 아니라 닫기 버튼/
        // backdrop/Escape 등으로 프로그램적으로 닫힌 경우다. `history.back()`을 요청은
        // 하되, 완료 신호는 그 이동으로 실제 발생하는 다음 popstate로만 판단한다(시간
        // 추정 금지 — QA_REVIEW_022). 이 one-shot listener 하나만 등록해 중복 호출을
        // 막는다.
        if (onAfterHistoryCloseRef.current) {
          const handleBackSettled = () => {
            window.removeEventListener("popstate", handleBackSettled);
            pendingBackListenerRef.current = null;
            onAfterHistoryCloseRef.current?.();
          };
          pendingBackListenerRef.current = handleBackSettled;
          window.addEventListener("popstate", handleBackSettled);
        }
        window.history.back();
      } else {
        // 이미 실제 뒤로가기로 이 entry를 벗어난 상태(=popstate가 이미 왔다 감) — 기다릴
        // 이동이 없으므로 즉시 완료를 알린다.
        onAfterHistoryCloseRef.current?.();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Escape로 닫기 + Tab/Shift+Tab focus trap.
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        // 안쪽에 분류 모달 등 중첩 dialog가 열려 있으면 그쪽이 먼저 Escape를 처리하도록
        // 양보한다(QA_REVIEW_020 P2-1) — 그 모달이 닫히면 hasNestedDialog가 false로
        // 바뀌고, 그다음 Escape에서야 이 sheet가 닫힌다.
        if (hasNestedDialog) return;
        onClose();
        return;
      }
      if (e.key !== "Tab") return;

      const focusables = sheetRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusables || focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose, hasNestedDialog]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] lg:hidden">
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-ll-ink/50 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={[
          "absolute inset-x-0 bottom-0 max-h-[82vh] overflow-y-auto overscroll-contain",
          "rounded-t-[28px] border-2 border-b-0 border-ll-ink p-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]",
          "motion-safe:animate-in motion-safe:slide-in-from-bottom-4 motion-safe:duration-200 motion-safe:ease-out",
          toneClassName,
        ].join(" ")}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 id={titleId} className="text-xl font-extrabold text-ll-ink break-keep">
              {title}
            </h3>
            {description && (
              <p className="mt-1 text-xs text-ll-pencil break-keep [overflow-wrap:break-word]">
                {description}
              </p>
            )}
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-ll-ink bg-ll-paper text-xl font-bold text-ll-ink"
          >
            ×
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}
