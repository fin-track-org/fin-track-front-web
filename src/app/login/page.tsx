"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/src/lib/supabase/client";
import { AuthShell } from "@/src/components/auth/AuthShell";
import { AuthStatusPanel } from "@/src/components/auth/AuthStatusPanel";
import { SocialLoginButtons } from "@/src/components/auth/SocialLoginButtons";
import { StatePanel } from "@/src/components/ledger/StatePanel";
import { Label } from "@/src/components/ui/label";
import { getLoginErrorMessage, getOAuthCallbackReasonMessage } from "@/src/lib/authErrorMessages";

export default function LoginPage() {
  // 초기 세션 확인이 끝나기 전에는 폼을 보여주지 않는다(브리프 §5 "이미 로그인된 사용자").
  const [initializing, setInitializing] = useState(true);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [emailLoading, setEmailLoading] = useState(false);
  const [kakaoLoading, setKakaoLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const router = useRouter();
  const supabase = createClient();

  // 이미 로그인되어 있으면 홈으로 보내고, 아니면 폼을 노출한다.
  useEffect(() => {
    let active = true;

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!active) return;

      if (user) {
        router.replace("/home");
        return; // 이동이 끝날 때까지 폼을 보여주지 않는다.
      }
      setInitializing(false);
    })();

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // `/auth/callback`이 실패 시 전달하는 안전한 reason 코드만 해석한다(원문 오류·토큰 노출 없음).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reason = params.get("reason");
    if (!reason) return;

    const message = getOAuthCallbackReasonMessage(reason);
    if (message) setError(message);

    // 새로고침 시 같은 오류가 다시 뜨지 않도록 주소창만 정리한다(라우팅 이벤트 없이).
    window.history.replaceState(null, "", "/login");
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setEmailLoading(true);

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) throw authError;

      router.replace("/home");
    } catch (err) {
      console.error("[login] email sign-in failed:", err);
      setError(getLoginErrorMessage(err));
      setEmailLoading(false);
    }
    // 성공 시에는 라우팅이 끝날 때까지 버튼을 계속 잠가둔다(setEmailLoading(false) 생략).
  };

  const handleKakaoLogin = async () => {
    setError(null);
    setKakaoLoading(true);

    try {
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: "kakao",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (authError) throw authError;
    } catch (err) {
      console.error("[login] kakao oauth start failed:", err);
      setError(getLoginErrorMessage(err));
      setKakaoLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setGoogleLoading(true);

    try {
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (authError) throw authError;
    } catch (err) {
      console.error("[login] google oauth start failed:", err);
      setError(getLoginErrorMessage(err));
      setGoogleLoading(false);
    }
  };

  if (initializing) {
    return <AuthStatusPanel title="가계부를 불러오는 중이에요" busy />;
  }

  const formLocked = emailLoading || kakaoLoading || googleLoading;

  return (
    <AuthShell
      brandHeadline="다시 만나서 반가워요"
      brandDescription="기록해둔 내역부터 이어서 정리해볼까요?"
      benefits={["미분류는 나중에, 지금은 가볍게 기록", "기록할수록 선명해지는 이번 달 흐름"]}
    >
      <h1 className="mb-1 text-2xl font-extrabold text-ll-ink break-keep">다시 만나서 반가워요</h1>
      <p className="mb-6 text-sm text-ll-pencil break-keep">기록해둔 내역부터 이어서 정리해볼까요?</p>

      <SocialLoginButtons
        onKakao={handleKakaoLogin}
        onGoogle={handleGoogleLogin}
        kakaoLoading={kakaoLoading}
        googleLoading={googleLoading}
        disabled={emailLoading}
      />

      <div className="my-6 flex items-center" aria-hidden="true">
        <div className="h-px flex-grow bg-ll-ink/10" />
        <span className="mx-4 text-xs font-medium text-ll-pencil">또는</span>
        <div className="h-px flex-grow bg-ll-ink/10" />
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <Label htmlFor="email" className="mb-1.5 block text-xs font-semibold text-ll-pencil">
            이메일
          </Label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={formLocked}
            placeholder="you@example.com"
            className="block w-full rounded-xl border border-ll-ink/15 bg-white px-4 py-3 text-base text-ll-ink placeholder-ll-pencil/40 outline-none transition-colors focus-visible:border-ll-tomato focus-visible:ring-2 focus-visible:ring-ll-tomato/30 disabled:opacity-60"
          />
        </div>

        <div>
          <Label htmlFor="password" className="mb-1.5 block text-xs font-semibold text-ll-pencil">
            비밀번호
          </Label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={formLocked}
            placeholder="비밀번호"
            className="block w-full rounded-xl border border-ll-ink/15 bg-white px-4 py-3 text-base text-ll-ink placeholder-ll-pencil/40 outline-none transition-colors focus-visible:border-ll-tomato focus-visible:ring-2 focus-visible:ring-ll-tomato/30 disabled:opacity-60"
          />
        </div>

        {error && <StatePanel tone="warn" title={error} />}

        <button
          type="submit"
          disabled={formLocked}
          aria-busy={emailLoading}
          className="flex min-h-[48px] w-full items-center justify-center rounded-xl bg-ll-ink text-base font-bold text-ll-paper transition-colors hover:bg-ll-ink/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {emailLoading ? "로그인하는 중..." : "이메일로 로그인"}
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-ll-pencil">
        아직 계정이 없으신가요?{" "}
        <Link href="/create-account" className="font-bold text-ll-ink underline underline-offset-2">
          무료로 가입하기
        </Link>
      </p>
    </AuthShell>
  );
}
