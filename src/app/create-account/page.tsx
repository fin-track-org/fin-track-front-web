"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/src/lib/supabase/client";
import { AuthShell } from "@/src/components/auth/AuthShell";
import { AuthStatusPanel } from "@/src/components/auth/AuthStatusPanel";
import { PasswordLengthHint, PasswordMatchHint } from "@/src/components/auth/PasswordRequirement";
import { StatePanel } from "@/src/components/ledger/StatePanel";
import { Label } from "@/src/components/ui/label";
import { useToast } from "@/src/hook/useToast";
import { getSignupErrorMessage, RESEND_SUCCESS_MESSAGE, RESEND_FAILURE_MESSAGE } from "@/src/lib/authErrorMessages";

export default function CreateAccountPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [nickname, setNickname] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [verificationPending, setVerificationPending] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const router = useRouter();
  const supabase = createClient();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    // 비밀번호 길이·일치 여부는 이미 필드 바로 아래 실시간 안내(PasswordLengthHint/PasswordMatchHint)로
    // 표시되고 있으므로, 여기서 같은 내용을 상단에 다시 띄워 중복 낭독을 만들지 않는다(브리프 §6).
    if (password !== passwordConfirm || password.length < 6) {
      return;
    }

    setLoading(true);

    try {
      // DB 트리거가 auth.users → public.profiles로 자동 복사하므로 signUp 한 번으로 충분하다(기존 로직 유지).
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { nickname } },
      });

      if (authError) throw authError;

      if (!authData.session) {
        // 이메일 인증이 필요한 일반적인 경우: 인증 대기 상태로 전환.
        setRegisteredEmail(email);
        setVerificationPending(true);
        return;
      }

      // 이메일 인증이 꺼져 있어 가입과 동시에 세션이 발급된 경우.
      // 기존에는 /login으로 보냈는데, 로그인 페이지의 세션 확인 로직이 어차피 다시 /home으로
      // replace하므로 불필요한 경유 없이 바로 /home으로 이동한다(alert() 제거, 회귀 없음).
      toast.success("회원가입이 완료됐어요. 바로 시작해볼까요?");
      router.replace("/home");
    } catch (err) {
      console.error("[create-account] sign-up failed:", err);
      setError(getSignupErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleResendEmail = async () => {
    setResendLoading(true);
    setResendMessage(null);

    try {
      const { error: resendError } = await supabase.auth.resend({ type: "signup", email: registeredEmail });
      if (resendError) throw resendError;
      setResendMessage({ type: "success", text: RESEND_SUCCESS_MESSAGE });
    } catch (err) {
      console.error("[create-account] resend failed:", err);
      setResendMessage({ type: "error", text: RESEND_FAILURE_MESSAGE });
    } finally {
      setResendLoading(false);
    }
  };

  const handleEditEmail = () => {
    // 가입 폼으로 되돌아가되, 비밀번호는 화면·로그 어디에도 다시 노출하지 않고 새로 입력받는다.
    // 이메일·닉네임은 오타 수정 목적이므로 그대로 유지한다.
    setPassword("");
    setPasswordConfirm("");
    setResendMessage(null);
    setVerificationPending(false);
  };

  if (verificationPending) {
    return (
      <AuthStatusPanel title="메일함을 확인해 주세요">
        <div className="space-y-4 text-left">
          <p className="text-sm leading-relaxed text-ll-pencil break-keep [overflow-wrap:break-word]">
            <span className="font-semibold text-ll-ink">{registeredEmail}</span>(으)로 인증 메일을 보냈어요.
            <br />
            인증 링크를 누르면 가입이 완료돼요.
          </p>
          <p className="text-xs leading-relaxed text-ll-pencil/80 break-keep">
            메일이 보이지 않으면 스팸함도 확인해 주세요.
          </p>

          {resendMessage && <StatePanel tone={resendMessage.type === "success" ? "success" : "warn"} title={resendMessage.text} />}

          <div className="space-y-2 pt-2">
            <button
              type="button"
              onClick={handleResendEmail}
              disabled={resendLoading}
              aria-busy={resendLoading}
              className="flex min-h-[44px] w-full items-center justify-center rounded-xl border border-ll-ink/15 bg-white text-sm font-semibold text-ll-ink transition-colors hover:bg-ll-cream disabled:cursor-not-allowed disabled:opacity-50"
            >
              {resendLoading ? "다시 보내는 중..." : "인증 메일 다시 받기"}
            </button>
            <button
              type="button"
              onClick={handleEditEmail}
              className="flex min-h-[44px] w-full items-center justify-center rounded-xl text-sm font-semibold text-ll-pencil underline underline-offset-2 hover:text-ll-ink"
            >
              이메일 주소 수정
            </button>
            <Link
              href="/login"
              className="flex min-h-[44px] w-full items-center justify-center rounded-xl bg-ll-ink text-sm font-bold text-ll-paper hover:bg-ll-ink/90"
            >
              로그인으로 돌아가기
            </Link>
          </div>
        </div>
      </AuthStatusPanel>
    );
  }

  return (
    <AuthShell brandHeadline="가볍게 시작해볼까요?" brandDescription="가입하고 첫 기록까지 오래 걸리지 않아요.">
      <h1 className="mb-1 text-2xl font-extrabold text-ll-ink break-keep">가볍게 시작해볼까요?</h1>
      <p className="mb-6 text-sm text-ll-pencil break-keep">가입하고 첫 기록까지 오래 걸리지 않아요.</p>

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
            disabled={loading}
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
            autoComplete="new-password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            placeholder="최소 6자 이상"
            className="block w-full rounded-xl border border-ll-ink/15 bg-white px-4 py-3 text-base text-ll-ink placeholder-ll-pencil/40 outline-none transition-colors focus-visible:border-ll-tomato focus-visible:ring-2 focus-visible:ring-ll-tomato/30 disabled:opacity-60"
          />
          <PasswordLengthHint password={password} />
        </div>

        <div>
          <Label htmlFor="password-confirm" className="mb-1.5 block text-xs font-semibold text-ll-pencil">
            비밀번호 확인
          </Label>
          <input
            id="password-confirm"
            name="password-confirm"
            type="password"
            autoComplete="new-password"
            required
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            disabled={loading}
            placeholder="비밀번호를 한 번 더 입력해 주세요"
            className="block w-full rounded-xl border border-ll-ink/15 bg-white px-4 py-3 text-base text-ll-ink placeholder-ll-pencil/40 outline-none transition-colors focus-visible:border-ll-tomato focus-visible:ring-2 focus-visible:ring-ll-tomato/30 disabled:opacity-60"
          />
          <PasswordMatchHint password={password} confirmPassword={passwordConfirm} />
        </div>

        <div>
          <Label htmlFor="nickname" className="mb-1.5 block text-xs font-semibold text-ll-pencil">
            닉네임
          </Label>
          <input
            id="nickname"
            name="nickname"
            type="text"
            // "nickname"은 WHATWG 자동완성 표준 토큰에 없어 브라우저가 대부분 무시한다.
            // 브리프 §6 지시대로 사용 가능 여부를 확인한 뒤 off로 대체했다.
            autoComplete="off"
            required
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            disabled={loading}
            placeholder="똑똑한 소비자"
            className="block w-full rounded-xl border border-ll-ink/15 bg-white px-4 py-3 text-base text-ll-ink placeholder-ll-pencil/40 outline-none transition-colors focus-visible:border-ll-tomato focus-visible:ring-2 focus-visible:ring-ll-tomato/30 disabled:opacity-60"
          />
        </div>

        {error && <StatePanel tone="warn" title={error} />}

        <button
          type="submit"
          disabled={loading}
          aria-busy={loading}
          className="flex min-h-[48px] w-full items-center justify-center rounded-xl bg-ll-ink text-base font-bold text-ll-paper transition-colors hover:bg-ll-ink/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "가입하는 중..." : "가입하기"}
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-ll-pencil">
        이미 계정이 있으신가요?{" "}
        <Link href="/login" className="font-bold text-ll-ink underline underline-offset-2">
          로그인하기
        </Link>
      </p>
    </AuthShell>
  );
}
