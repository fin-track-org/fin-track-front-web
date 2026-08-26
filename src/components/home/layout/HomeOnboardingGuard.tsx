"use client";

import { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUserSettings } from "@/src/hook/useUserSettings";
import { AuthError } from "@/src/lib/api/authError";
import { AuthStatusPanel } from "@/src/components/auth/AuthStatusPanel";
import { StatePanel } from "@/src/components/ledger/StatePanel";

/**
 * `/home` 이하 모든 페이지의 공통 진입 guard(IMPLEMENTATION_BRIEF_004 §2).
 * 사용자 설정을 확인해 온보딩 미완료 사용자를 `/onboarding`으로 replace한다.
 * 로그인·OAuth callback 등 여러 인증 경로에 분기 로직을 복제하지 않고 이 guard 하나가 담당한다.
 *
 * - 확인 중: 홈 내용(사이드바·콘텐츠 포함) 대신 "첫 설정을 확인하고 있어요" 상태만 표시한다.
 * - 인증 만료(401): `/login`으로 replace.
 * - 일시적 서버 오류: 재시도 가능한 오류 상태를 보여준다(무한 리다이렉트 없음).
 * - 온보딩 미완료: `/onboarding`으로 replace하고, 이동이 끝날 때까지 홈 콘텐츠를 그리지 않는다.
 */
export default function HomeOnboardingGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { userSetting, isLoading, isError, error, refetch } = useUserSettings();

  useEffect(() => {
    if (error instanceof AuthError) {
      router.replace("/login");
    }
  }, [error, router]);

  useEffect(() => {
    if (userSetting && !userSetting.onboardingCompleted) {
      router.replace("/onboarding");
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

  // 온보딩 미완료: 위 effect가 /onboarding으로 이동시키는 동안 홈 콘텐츠가 먼저 그려지지 않도록 유지.
  if (userSetting && !userSetting.onboardingCompleted) {
    return <AuthStatusPanel title="첫 설정을 확인하고 있어요" busy />;
  }

  return <>{children}</>;
}
