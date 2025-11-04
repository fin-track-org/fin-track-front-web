// app/login/page.tsx

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">

        {/* 로고 (소개 페이지와 동일하게 sky-700 사용) */}
        <h1 className="text-3xl font-bold text-center text-sky-700 mb-8">
          FinTrack
        </h1>

        <form className="space-y-6">
          {/* 이메일 입력 */}
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
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-sky-500 focus:border-sky-500" // focus 색상 변경
              placeholder="you@example.com"
            />
          </div>

          {/* 비밀번호 입력 */}
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
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-sky-500 focus:border-sky-500" // focus 색상 변경
              placeholder="••••••••"
            />
          </div>

          {/* 로그인 버튼 */}
          <div>
            <button
              type="submit"
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-lg font-medium text-white bg-sky-500 hover:bg-sky-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500" // 버튼 색상 변경
            >
              로그인
            </button>
          </div>
        </form>

        {/* 회원가입 링크 */}
        <p className="mt-6 text-center text-sm text-gray-600">
          계정이 없으신가요?{' '}
          <a href="/create-account" className="font-medium text-sky-600 hover:text-sky-500"> {/* 링크 색상 변경 */}
            회원가입하기
          </a>
        </p>

      </div>
    </div>
  );
}
