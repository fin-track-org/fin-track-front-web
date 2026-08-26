"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/src/lib/supabase/client";
import { PandaHalo } from "@/src/components/welcome/PandaHalo";
import { ReceiptDecoration } from "@/src/components/welcome/ReceiptDecoration";

type WelcomeStatus = "checking" | "guest" | "error";

/**
 * Capacitor 앱 시작 화면(IMPLEMENTATION_BRIEF_008). 일반 웹 브라우저로 직접 열어도 안전하게
 * 동작해야 하지만, 웹 `/` 랜딩이 여기로 자동 이동하지는 않는다(그쪽은 이번 작업에서 손대지 않음).
 *
 * 세션 확인은 화면 이동 최적화일 뿐 권한 판정이 아니다 — 실제 인증·온보딩 분기는 `/home`의 기존
 * guard(`HomeOnboardingGuard`)와 백엔드가 최종 담당한다(§3).
 */
export default function WelcomePage() {
  const [status, setStatus] = useState<WelcomeStatus>("checking");
  const router = useRouter();

  const checkSession = useCallback(async () => {
    setStatus("checking");
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;

      if (data.session) {
        router.replace("/home");
        return; // 로그인 사용자는 웰컴 CTA를 그리지 않고 이동만 진행한다(DECISION_004 §6).
      }
      setStatus("guest"); // 세션 없음은 정상 상태다 — 오류가 아니다.
    } catch (err) {
      console.error("[welcome] 세션 확인 실패:", err);
      setStatus("error");
    }
  }, [router]);

  useEffect(() => {
    checkSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (status === "error") {
    // 공용 StatePanel(h3)을 그대로 쓰면 페이지 h1과 문구가 겹쳐 두 번 낭독된다(QA_REVIEW_016 P2-1).
    // 다른 페이지에 영향을 주지 않도록 StatePanel은 손대지 않고, 같은 시각 톤(warn)만
    // 이 화면 전용으로 재현하면서 제목은 h1 하나로만 제공한다.
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-ll-paper px-4 py-10">
        <div className="w-full max-w-sm">
          <div role="alert" className="rounded-xl border border-t-[3px] border-ll-ink/10 border-t-ll-tomato bg-white p-5">
            <h1 className="text-sm font-bold text-ll-ink break-keep">시작 화면을 불러오지 못했어요</h1>
            <p className="mt-1 text-xs leading-relaxed text-ll-pencil break-keep [overflow-wrap:break-word]">
              잠시 후 다시 시도해 주세요.
            </p>
            <button
              type="button"
              onClick={checkSession}
              className="mt-3 inline-flex min-h-[36px] items-center rounded-full bg-ll-ink px-4 text-xs font-semibold text-ll-paper hover:bg-ll-ink/90"
            >
              다시 시도
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-[420px] flex-col bg-ll-paper px-5 pb-[calc(14px+env(safe-area-inset-bottom))] pt-[22px] min-[380px]:px-6">
      <p className="text-[13px] font-extrabold tracking-tight text-ll-ink">게으른 가계부</p>

      <div className="flex flex-1 flex-col items-center justify-center py-4 text-center">
        <PandaHalo />

        {status === "checking" ? (
          // role="status"/aria-busy를 h1에 직접 주지 않는다 — 명시적 role이 h1의 암묵적
          // heading 의미를 덮어써 스크린리더가 페이지 제목으로 인식하지 못할 수 있다(QA_REVIEW_016 P2-1).
          // 상태 알림은 감싸는 컨테이너가 맡고, h1은 순수 제목 역할만 유지한다.
          <div role="status" aria-busy="true" className="mt-7">
            <h1 className="text-sm text-ll-pencil break-keep">가계부를 불러오는 중이에요</h1>
          </div>
        ) : (
          <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200">
            <h1 className="mt-7 max-w-[310px] text-[25px] font-extrabold leading-[1.2] tracking-tight text-ll-ink break-keep min-[380px]:text-[30px]">
              일단 금액만 적어두세요
            </h1>
            <p className="mt-2.5 text-[13px] leading-relaxed text-ll-pencil break-keep min-[380px]:text-[15px]">
              귀찮은 정리는 나중에 해도 괜찮아요.
            </p>
            <ReceiptDecoration />
          </div>
        )}
      </div>

      {status === "guest" && (
        <div className="grid flex-none gap-2 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200">
          <Link
            href="/create-account"
            className="flex min-h-[52px] w-full items-center justify-center rounded-2xl bg-ll-ink text-base font-extrabold text-ll-paper shadow-[0_5px_0_rgba(32,40,58,0.13)] transition-colors hover:bg-ll-ink/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ll-ink focus-visible:ring-offset-2"
          >
            가볍게 시작하기
          </Link>
          <Link
            href="/login"
            className="flex min-h-[44px] w-full items-center justify-center text-sm font-bold text-ll-ink underline underline-offset-[3px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ll-ink focus-visible:ring-offset-2"
          >
            이미 계정이 있어요
          </Link>
          {/* 저장소에 실제 이용약관·개인정보처리방침 경로가 없어(REPORT_016 "알려진 제약") 하단 법률 문구를 생략했다. */}
        </div>
      )}
    </div>
  );
}
