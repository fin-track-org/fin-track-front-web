/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import Link from "next/link";
import Image from "next/image";
import logoImg from "@/public/images/logo.jpg";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/src/lib/supabase/client";

export default function CreateAccountPage() {
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEmailVerificationPending, setIsEmailVerificationPending] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (password !== passwordConfirm) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }
    if (password.length < 6) {
      setError("비밀번호는 최소 6자리 이상이어야 합니다.");
      return;
    }

    setLoading(true);

    try {
      // [1단계] Supabase Auth로 "모든" 정보 전송
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          // 닉네임 정보를 options.data에 담아 보냅니다.
          // (DB 트리거가 new.raw_user_meta_data->>'nickname' 코드로 이 데이터를 사용합니다)
          data: {
            nickname: nickname,
          },
        },
      });

      // [2단계] Supabase가 에러를 반환했는지 확인
      if (authError) {
        throw new Error(`Supabase Auth 에러: ${authError.message}`);
      }

      // [3단계] Spring Boot API 호출이 "필요 없어졌습니다."
      // DB 트리거가 1단계가 성공하는 순간,
      // auth.users -> public.profiles로 데이터를 자동으로 복사(INSERT)합니다.
      // 모든 작업이 Supabase 내부에서 트랜잭션으로 처리됩니다.

      // [4단계] 이메일 인증 확인
      // 이메일 인증이 활성화된 경우 session이 null로 옴
      if (!authData.session) {
        // 이메일 인증 대기 상태로 전환
        setRegisteredEmail(email);
        setIsEmailVerificationPending(true);
        return;
      }

      // [5단계] 이메일 인증이 비활성화된 경우 - 바로 로그인 가능
      alert("회원가입 성공! 로그인 페이지로 이동합니다.");
      router.push("/login");
    } catch (err: any) {
      // (19) 14~18단계 중 어디선가 에러가 발생하면, 여기로 잡혀옴
      console.error(err);
      setError(err.message || "알 수 없는 에러가 발생했습니다.");
    } finally {
      // (20) 성공하든 실패하든, 로딩 상태를 해제
      setLoading(false);
    }
  };

  const handleResendEmail = async () => {
    setResendLoading(true);
    setResendMessage(null);

    try {
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: registeredEmail,
      });

      if (resendError) {
        throw new Error(resendError.message);
      }

      setResendMessage("인증 메일을 다시 발송했습니다. 메일함을 확인해 주세요.");
    } catch (err: any) {
      setResendMessage(err.message || "메일 재발송에 실패했습니다.");
    } finally {
      setResendLoading(false);
    }
  };

  // (21) 사용자 눈에 보이는 HTML (JSX) 부분
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      {/* 이메일 인증 안내 모달 */}
      {isEmailVerificationPending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 space-y-6">
            {/* 아이콘 */}
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-sky-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-sky-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
            </div>

            {/* 제목 */}
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                이메일을 확인해 주세요 ✉️
              </h2>
              <p className="text-sm text-gray-600">
                회원가입이 거의 완료되었습니다!
              </p>
            </div>

            {/* 설명 */}
            <div className="bg-sky-50 rounded-lg p-4 space-y-2">
              <p className="text-sm text-gray-700 leading-relaxed">
                <span className="font-semibold text-sky-700">{registeredEmail}</span>
                <br />
                위 이메일로 인증 메일을 발송했습니다.
              </p>
              <p className="text-sm text-gray-600">
                메일함을 확인하시고 <strong>&apos;이메일 인증하기&apos;</strong> 버튼을 클릭하시면
                회원가입이 최종 완료됩니다.
              </p>
            </div>

            {/* 안내사항 */}
            <div className="space-y-2 text-xs text-gray-500">
              <p className="flex items-start gap-2">
                <span className="text-sky-600 mt-0.5">•</span>
                <span>메일이 도착하지 않았다면 스팸함을 확인해 주세요.</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-sky-600 mt-0.5">•</span>
                <span>인증 후 로그인 페이지에서 바로 이용하실 수 있습니다.</span>
              </p>
            </div>

            {/* 재발송 메시지 */}
            {resendMessage && (
              <div className={`text-sm text-center p-3 rounded-lg ${
                resendMessage.includes("실패") 
                  ? "bg-red-50 text-red-600" 
                  : "bg-green-50 text-green-600"
              }`}>
                {resendMessage}
              </div>
            )}

            {/* 버튼 */}
            <div className="space-y-3">
              <button
                onClick={handleResendEmail}
                disabled={resendLoading}
                className="w-full bg-white border border-gray-300 text-gray-700 py-3 rounded-lg font-semibold text-sm hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {resendLoading ? "발송 중..." : "인증 메일 다시 받기"}
              </button>
              <button
                onClick={() => router.push("/login")}
                className="w-full bg-sky-600 text-white py-3 rounded-lg font-semibold text-sm hover:bg-sky-700 transition-colors"
              >
                로그인 페이지로 이동
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <div className="flex justify-center mb-8">
          <Image src={logoImg} alt="게으른 가계부 로고" className="rounded-lg w-60 h-auto" />
        </div>

        {/* (22) 폼 태그. "submit" 이벤트가 발생하면 handleSubmit 함수를 실행 */}
        <form className="space-y-6" onSubmit={handleSubmit}>
          {/* 닉네임 입력란 */}
          <div>
            <label
              htmlFor="nickname"
              className="block text-sm font-medium text-gray-700"
            >
              닉네임
            </label>
            <input
              id="nickname"
              name="nickname"
              type="text"
              required
              value={nickname} // (23) 이 입력란의 값을 (5)번 메모리 박스와 연결
              onChange={(e) => setNickname(e.target.value)} // (24) 타이핑할 때마다 (5)번 박스의 값을 업데이트
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-sky-500 focus:border-sky-500"
              placeholder="똑똑한 소비자"
              disabled={loading} // (25) 로딩 중일 때 입력 방지
            />
          </div>

          {/* 이메일 입력란 */}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700"
            >
              이메일 주소
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-sky-500 focus:border-sky-500"
              placeholder="you@example.com"
              disabled={loading}
            />
          </div>

          {/* 비밀번호 입력란 */}
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700"
            >
              비밀번호
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={6} // Supabase 기본 최소 길이
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-sky-500 focus:border-sky-500"
              placeholder="최소 6자리 이상"
              disabled={loading}
            />
          </div>

          {/* 비밀번호 확인 입력란 */}
          <div>
            <label
              htmlFor="password-confirm"
              className="block text-sm font-medium text-gray-700"
            >
              비밀번호 확인
            </label>
            <input
              id="password-confirm"
              name="password-confirm"
              type="password"
              required
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-sky-500 focus:border-sky-500"
              placeholder="••••••••"
              disabled={loading}
            />
          </div>

          {/* (26) 에러가 발생했을 때만 에러 메시지를 보여줌 */}
          {error && <p className="text-sm text-red-600 text-center">{error}</p>}

          {/* 회원가입 버튼 */}
          <div>
            {/* (27) 로딩 중일 때 버튼을 비활성화하고 텍스트를 변경 */}
            <button
              type="submit"
              className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-lg font-medium text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 ${
                loading ? "opacity-50 cursor-not-allowed" : ""
              }`}
              disabled={loading}
            >
              {loading ? "가입 처리 중..." : "회원가입"}
            </button>
          </div>
        </form>

        {/* 하단 로그인 링크 */}
        <p className="mt-6 text-center text-sm text-gray-600">
          이미 계정이 있으신가요?{" "}
          <Link
            href="/login"
            className="font-medium text-sky-600 hover:text-sky-500"
          >
            로그인하기
          </Link>
        </p>
      </div>
    </div>
  );
}
