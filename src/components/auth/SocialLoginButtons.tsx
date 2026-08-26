"use client";

interface SocialLoginButtonsProps {
  onKakao: () => void;
  onGoogle: () => void;
  kakaoLoading: boolean;
  googleLoading: boolean;
  /** 이메일 폼 제출 등 다른 진행 중 작업이 있을 때 함께 잠근다 */
  disabled?: boolean;
}

/**
 * 카카오·Google 로그인 버튼.
 * IMPLEMENTATION_BRIEF_002 §5 "소셜 로그인" — 추천 bounce 배지·"3초" 시간 약속 문구 제거,
 * provider별로 독립된 loading 상태를 버튼 문구로 구분한다(공용 loading 한 개로 뭉뚱그리지 않음).
 */
export function SocialLoginButtons({
  onKakao,
  onGoogle,
  kakaoLoading,
  googleLoading,
  disabled = false,
}: SocialLoginButtonsProps) {
  const anyLoading = kakaoLoading || googleLoading || disabled;

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={onKakao}
        disabled={anyLoading}
        aria-busy={kakaoLoading}
        className="flex min-h-[48px] w-full items-center justify-center gap-3 rounded-xl bg-[#FEE500] px-4 text-base font-bold text-black/90 transition-colors hover:bg-[#FCD81B] active:bg-[#F0C900] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ll-ink focus-visible:ring-offset-2"
      >
        <svg className="h-5 w-5 text-black/90" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 3c-4.97 0-9 3.185-9 7.115 0 2.558 1.712 4.8 4.32 6.04-.173.579-.623 2.098-.713 2.42-.113.407.135.402.285.302.119-.079 1.907-1.282 2.662-1.79.79.117 1.606.18 2.446.18 4.97 0 9-3.186 9-7.116C21 6.185 16.97 3 12 3z" />
        </svg>
        {kakaoLoading ? "카카오로 연결하는 중..." : "카카오로 계속하기"}
      </button>

      <button
        type="button"
        onClick={onGoogle}
        disabled={anyLoading}
        aria-busy={googleLoading}
        className="flex min-h-[48px] w-full items-center justify-center gap-3 rounded-xl border border-ll-ink/15 bg-white px-4 text-base font-bold text-ll-ink transition-colors hover:bg-ll-cream/60 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ll-ink focus-visible:ring-offset-2"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#EA4335"
          />
        </svg>
        {googleLoading ? "Google로 연결하는 중..." : "Google로 계속하기"}
      </button>
    </div>
  );
}

export default SocialLoginButtons;
