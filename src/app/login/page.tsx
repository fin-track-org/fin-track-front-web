/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"; // 👈 (1) "이 파일은 브라우저에서 동작해야 합니다!"

import Link from "next/link";
import Image from "next/image";
import logoImg from "@/public/images/logo.jpg";
import { useState } from "react"; // (2) 리액트 "상태" 관리
// (3) Supabase 접속기 (경로 수정: '@/' 별칭 대신 상대 경로 사용)
import { useRouter } from "next/navigation"; // (4) 페이지 이동 기능
import { createClient } from "@/src/lib/supabase/client";

export default function LoginPage() {
  // (5) 이메일, 비밀번호, 에러, 로딩 상태를 관리할 "메모리 박스"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 🔥 [추가] 이메일 로그인 폼 표시 여부
  const [showEmailLogin, setShowEmailLogin] = useState(false);

  const router = useRouter(); // (6) 페이지 이동 기능 준비
  const supabase = createClient(); // (7) Supabase 접속기 실행

  // (8) "로그인" 버튼을 눌렀을 때 실행될 함수
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); // (9) 폼 제출 시 새로고침 방지
    setError(null); // (10) 이전 에러 메시지 초기화
    setLoading(true); // (11) 로딩 시작

    try {
      // (12) [1단계] Supabase Auth로 이메일/비밀번호 전송
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      // (13) Supabase가 에러를 반환했는지 확인 (예: 비번 틀림)
      if (authError) {
        throw new Error(`로그인 실패: ${authError.message}`);
      }

      // (14) [2단계] 모든 것이 성공! 대시보드로 이동
      router.push("/home");
    } catch (err: any) {
      // (15) 12~14단계 중 에러 발생 시, 여기로 잡혀옴
      console.error(err);
      setError(err.message || "알 수 없는 에러가 발생했습니다.");
    } finally {
      // (16) 성공하든 실패하든, 로딩 상태 해제
      setLoading(false);
    }
  };

  // 🔥 [추가] 카카오 로그인 핸들러 함수
  const handleKakaoLogin = async () => {
    setError(null);
    setLoading(true);

    try {
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: "kakao",
        options: {
          // 카카오 인증이 끝나면 우리 서비스의 콜백 라우터로 리다이렉트 시킵니다.
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (authError) {
        throw new Error(`카카오 로그인 실패: ${authError.message}`);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "카카오 로그인 중 에러가 발생했습니다.");
      setLoading(false); // OAuth 창으로 이동 실패 시에만 로딩을 풀어줍니다.
    }
  };

  // 🔥 [추가] 구글 로그인 핸들러 함수
  const handleGoogleLogin = async () => {
    setError(null);
    setLoading(true);

    try {
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (authError) {
        throw new Error(`구글 로그인 실패: ${authError.message}`);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "구글 로그인 중 에러가 발생했습니다.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* ===== 왼쪽 브랜드 패널 (데스크톱 전용) ===== */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-sky-600 to-indigo-700 flex-col justify-between p-12 text-white">
        <Image src={logoImg} alt="게으른 가계부 로고" className="rounded-lg w-60 h-auto" />

        <div>
          <h2 className="text-4xl font-bold leading-tight mb-4">
            귀찮을수록<br />더 잘 맞는 가계부
          </h2>
          <p className="text-sky-200 text-lg mb-10">
            복잡한 과정은 다 덜어냈습니다.<br />가장 스마트한 나만의 맞춤 가계부
          </p>
          <ul className="space-y-4 text-sm text-sky-100">
            <li className="flex items-start gap-3">
              <span className="text-sky-300 mt-0.5">✦</span>
              <span>입력은 가볍게, 분석은 깊고 완벽하게</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-sky-300 mt-0.5">✦</span>
              <span>예산부터 결제수단별 맞춤 통계까지 한눈에</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-sky-300 mt-0.5">✦</span>
              <span>기록에만 집중할 수 있도록 저희가 다 해드릴게요</span>
            </li>
          </ul>
        </div>

        <p className="text-sky-400 text-xs">
          © {new Date().getFullYear()} 게으른 가계부
        </p>
      </div>

      {/* ===== 오른쪽 폼 패널 ===== */}
      <div className="flex-1 flex items-center justify-center bg-gray-50 px-6 py-12">
        <div className="w-full max-w-sm">
          {/* 모바일 전용 로고 */}
          <div className="lg:hidden text-center mb-8">
            <Image src="/images/logo.jpg" alt="게으른 가계부 로고" width={200} height={54} className="rounded-lg mx-auto" />
            <p className="mt-3 text-sm text-gray-500">최소한의 입력으로 최대한의 효율을 ✨</p>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center lg:text-left">3초 만에 시작하기 🚀</h2>
          <p className="text-sm text-gray-500 mb-8 text-center lg:text-left">가장 빠르고 안전한 카카오 로그인을 추천합니다.</p>

          <div className="space-y-4">
            {/* 카카오 로그인 버튼 (최우선 강조) */}
            <button
              type="button"
              disabled={loading}
              onClick={handleKakaoLogin}
              className="relative w-full flex items-center justify-center gap-3 py-4 px-4 bg-[#FEE500] hover:bg-[#FCD81B] active:bg-[#F0C900] disabled:opacity-50 disabled:cursor-not-allowed text-black/90 font-bold rounded-xl text-base transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#FEE500] shadow-md hover:shadow-lg hover:-translate-y-0.5"
            >
              <svg className="w-6 h-6 text-black/90" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 3c-4.97 0-9 3.185-9 7.115 0 2.558 1.712 4.8 4.32 6.04-.173.579-.623 2.098-.713 2.42-.113.407.135.402.285.302.119-.079 1.907-1.282 2.662-1.79.79.117 1.606.18 2.446.18 4.97 0 9-3.186 9-7.116C21 6.185 16.97 3 12 3z" />
              </svg>
              카카오로 3초 만에 시작하기
              
              {/* 추천 뱃지 (Pill 형태) */}
              <span className="absolute -top-3 -right-2 bg-red-500 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full shadow-sm animate-bounce">
                추천 👍
              </span>
            </button>

            {/* 구글 로그인 버튼 */}
            <button
              type="button"
              disabled={loading}
              onClick={handleGoogleLogin}
              className="relative w-full flex items-center justify-center gap-3 py-4 px-4 bg-white border border-gray-200 hover:bg-gray-50 active:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 font-bold rounded-xl text-base transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-200 shadow-sm hover:shadow hover:-translate-y-0.5"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Google로 시작하기
            </button>

            <div className="relative flex py-4 items-center">
              <div className="flex-grow border-t border-gray-200"></div>
              <span className="flex-shrink mx-4 text-xs text-gray-400 bg-gray-50 px-2 font-medium">또는</span>
              <div className="flex-grow border-t border-gray-200"></div>
            </div>

            {/* 이메일 로그인 토글 영역 */}
            {!showEmailLogin ? (
              <button
                type="button"
                onClick={() => setShowEmailLogin(true)}
                className="w-full py-3.5 text-sm text-gray-500 hover:text-gray-800 font-medium rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors shadow-sm"
              >
                이메일로 로그인
              </button>
            ) : (
              <form className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm" onSubmit={handleSubmit}>
                <div>
                  <label htmlFor="email" className="block text-xs font-semibold text-gray-600 mb-1.5">
                    이메일
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 transition-all bg-gray-50 focus:bg-white"
                    placeholder="you@example.com"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-xs font-semibold text-gray-600 mb-1.5">
                    비밀번호
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 transition-all bg-gray-50 focus:bg-white"
                    placeholder="••••••••"
                    disabled={loading}
                  />
                </div>

                {error && (
                  <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600 font-medium">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-900 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-lg text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900"
                >
                  {loading ? "로그인 중..." : "로그인"}
                </button>
              </form>
            )}
          </div>

          <p className="mt-8 text-center text-sm text-gray-500">
            아직 계정이 없으신가요?{" "}
            <Link href="/create-account" className="font-bold text-sky-600 hover:text-sky-500 underline underline-offset-2">
              무료로 가입하기
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
