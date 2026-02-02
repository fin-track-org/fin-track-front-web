"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/src/supabase/client";
import { useRouter } from "next/navigation";

export default function CreateAccountPage() {
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

      // [4단계] 모든 것이 성공! 로그인 페이지로 이동
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

  // (21) 사용자 눈에 보이는 HTML (JSX) 부분
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <h1 className="text-3xl font-bold text-center text-sky-700 mb-8">
          FinTrack
        </h1>

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
