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

          <h2 className="text-2xl font-bold text-gray-900 mb-1">다시 오셨군요 👋</h2>
          <p className="text-sm text-gray-500 mb-8">계속하려면 로그인하세요.</p>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                이메일
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition"
                placeholder="you@example.com"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                비밀번호
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition"
                placeholder="••••••••"
                disabled={loading}
              />
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500"
            >
              {loading ? "로그인 중..." : "로그인"}
            </button>
          </form>

          {/* 🔥 [추가] "또는" 구분선 및 카카오 로그인 버튼 영역 */}
          <div className="space-y-4">
            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-gray-200"></div>
              <span className="flex-shrink mx-4 text-xs text-gray-400 bg-gray-50 px-2">또는</span>
              <div className="flex-grow border-t border-gray-200"></div>
            </div>

            <button
              type="button"
              disabled={loading}
              onClick={handleKakaoLogin}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[#FEE500] hover:bg-[#FCD81B] active:bg-[#F0C900] disabled:opacity-50 disabled:cursor-not-allowed text-black/85 font-medium rounded-lg text-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#FEE500] shadow-sm"
            >
              <svg className="w-5 h-5 text-black/85" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 3c-4.97 0-9 3.185-9 7.115 0 2.558 1.712 4.8 4.32 6.04-.173.579-.623 2.098-.713 2.42-.113.407.135.402.285.302.119-.079 1.907-1.282 2.662-1.79.79.117 1.606.18 2.446.18 4.97 0 9-3.186 9-7.116C21 6.185 16.97 3 12 3z" />
              </svg>
              카카오로 계속하기
            </button>
          </div>

          <p className="mt-6 text-center text-sm text-gray-500">
            아직 계정이 없으신가요?{" "}
            <Link href="/create-account" className="font-semibold text-sky-600 hover:text-sky-500">
              무료로 시작하기
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
