"use client"; // 👈 (1) "이 파일은 브라우저에서 동작해야 합니다!"

import Link from 'next/link';
import { useState } from 'react'; // (2) 리액트 "상태" 관리
// (3) Supabase 접속기 (경로 수정: '@/' 별칭 대신 상대 경로 사용)
import { createClient } from '../../lib/supabase/client'; 
import { useRouter } from 'next/navigation'; // (4) 페이지 이동 기능

export default function LoginPage() {
  // (5) 이메일, 비밀번호, 에러, 로딩 상태를 관리할 "메모리 박스"
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter(); // (6) 페이지 이동 기능 준비
  const supabase = createClient(); // (7) Supabase 접속기 실행

  // (8) "로그인" 버튼을 눌렀을 때 실행될 함수
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); // (9) 폼 제출 시 새로고침 방지
    setError(null);     // (10) 이전 에러 메시지 초기화
    setLoading(true);   // (11) 로딩 시작

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
      router.push('/dashboard');

    } catch (err: any) {
      // (15) 12~14단계 중 에러 발생 시, 여기로 잡혀옴
      console.error(err);
      setError(err.message || "알 수 없는 에러가 발생했습니다.");
    } finally {
      // (16) 성공하든 실패하든, 로딩 상태 해제
      setLoading(false);
    }
  };

  // (17) 사용자 눈에 보이는 HTML (JSX) 부분
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        
        <h1 className="text-3xl font-bold text-center text-sky-700 mb-8">
          FinTrack
        </h1>
        
        {/* (18) 폼 제출 핸들러 연결 */}
        <form className="space-y-6" onSubmit={handleSubmit}>
          
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
              value={email} // (19) State와 연결
              onChange={(e) => setEmail(e.target.value)} // (20) State 변경
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-sky-500 focus:border-sky-500"
              placeholder="you@example.com"
              disabled={loading} // 로딩 중 비활성화
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
              value={password} // State와 연결
              onChange={(e) => setPassword(e.target.value)} // State 변경
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-sky-500 focus:border-sky-500"
              placeholder="••••••••"
              disabled={loading} // 로딩 중 비활성화
            />
          </div>
          
          {/* (21) 에러가 발생했을 때만 에러 메시지를 보여줌 */}
          {error && (
            <p className="text-sm text-red-600 text-center">{error}</p>
          )}

          {/* 로그인 버튼 */}
          <div>
            <button 
              type="submit" 
              className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-lg font-medium text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 ${
                loading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              disabled={loading}
            >
              {loading ? '로그인 중...' : '로그인'}
            </button>
          </div>
        </form>

        {/* 회원가입 링크 */}
        <p className="mt-6 text-center text-sm text-gray-600">
          계정이 없으신가요?{' '}
          <Link href="/create-account" className="font-medium text-sky-600 hover:text-sky-500">
            회원가입하기
          </Link>
        </p>

      </div>
    </div>
  );
}