"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUserSettings } from "@/src/hook/useUserSettings";
import { AuthError } from "@/src/lib/api/authError";
import { AuthStatusPanel } from "@/src/components/auth/AuthStatusPanel";
import { StatePanel } from "@/src/components/ledger/StatePanel";
import OnboardingFlow from "@/src/components/onboarding/OnboardingFlow";

/**
 * `/onboarding` 진입 guard(IMPLEMENTATION_BRIEF_004 §2).
 * - 인증 없음 → `/login`
 * - 인증 있음 + 완료 → `/home`
 * - 인증 있음 + 미완료 → 온보딩 위저드 렌더링
 * `/home` guard(HomeOnboardingGuard)와 같은 `useUserSettings` 쿼리 캐시를 공유해
 * 두 경로에 판단 로직을 복제하지 않는다.
 */
export default function OnboardingPage() {
  const router = useRouter();
  const { userSetting, isLoading, isError, error, refetch } = useUserSettings();

  useEffect(() => {
    if (error instanceof AuthError) {
      router.replace("/login");
    }
  }, [error, router]);

  useEffect(() => {
    if (userSetting?.onboardingCompleted) {
      router.replace("/home");
    }
  }, [userSetting, router]);

  if (isLoading || error instanceof AuthError) {
    return <AuthStatusPanel title="첫 설정을 확인하고 있어요" busy />;
  }

  if (isError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ll-paper px-4 py-10">
        <div className="w-full max-w-sm">
          <StatePanel
            tone="warn"
            title="설정을 불러오지 못했어요"
            description="네트워크 상태를 확인한 뒤 다시 시도해 주세요."
            action={{ label: "다시 시도", onClick: () => refetch() }}
          />
        </div>
      </div>
    );
  }

  if (!userSetting || userSetting.onboardingCompleted) {
    // 완료 사용자는 위 effect가 /home으로 옮기는 동안 빈 화면 대신 확인 상태를 유지한다.
    return <AuthStatusPanel title="홈으로 이동하고 있어요" busy />;
  }

  return <OnboardingFlow initialLedgerMode={userSetting.ledgerMode} />;
}
