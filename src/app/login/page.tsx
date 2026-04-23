/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"; // 👈 (1) "이 파일은 브라우저에서 동작해야 합니다!"

import Link from "next/link";
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

  return (
    <div className="min-h-screen flex">
      {/* ===== 왼쪽 브랜드 패널 (데스크톱 전용) ===== */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-sky-600 to-indigo-700 flex-col justify-between p-12 text-white">
        <span className="text-2xl font-bold tracking-tight">🦥 게으른 가계부</span>

        <div>
          <h2 className="text-4xl font-bold leading-tight mb-4">
            귀찮음도<br />자산이 됩니다.
          </h2>
          <p className="text-sky-200 text-lg mb-10">
            게으른 완벽주의자를 위한<br />가장 스마트한 가계부
          </p>
          <ul className="space-y-4 text-sm text-sky-100">
            <li className="flex items-start gap-3">
              <span className="text-sky-300 mt-0.5">✦</span>
              <span>숨만 쉬어도 정리되는 지출 분석</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-sky-300 mt-0.5">✦</span>
              <span>한 줄 입력으로 완성되는 월별 리포트</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-sky-300 mt-0.5">✦</span>
              <span>당신은 쓰기만 하세요. 통계는 우리가 합니다</span>
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
            <span className="text-2xl font-bold text-sky-700">🦥 게으른 가계부</span>
            <p className="mt-1 text-sm text-gray-500">복잡한 건 우리가 할게. 넌 대충 적기만 해 ✨</p>
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
