// app/page.tsx
// 'next/link' 임포트 제거 (빌드 오류 해결)
// import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">

      {/* 1. 상단 헤더 */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <nav className="container mx-auto px-6 py-4 flex justify-between items-center">
          {/* 로고 텍스트는 버튼(sky-500)보다 살짝 진한 sky-700을 사용했습니다.
            이것도 sky-500으로 바꾸시려면 'text-sky-500'으로 수정하세요.
          */}
          <h1 className="text-2xl font-bold text-sky-700">
            FinTrack
          </h1>
          {/* <Link>를 <a> 태그로 변경 (빌드 오류 해결) */}
          <a href="/fin-track/login">
            {/* 요청하신 sky-500을 버튼 배경색으로 사용합니다.
              hover 시에는 살짝 더 진한 sky-600을 사용합니다.
            */}
            <span className="bg-sky-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-sky-600 transition-colors cursor-pointer">
              로그인 / 회원가입
            </span>
          </a>
        </nav>
      </header>

      {/* 2. 메인 컨텐츠 (Hero Section) */}
      <main className="flex-grow flex flex-col justify-center items-center text-center px-6">
        <h2 className="text-5xl font-bold text-gray-800 mb-4">
          가계부 Demo
        </h2>
        <p className="text-xl text-gray-600 mb-8 max-w-lg">
          FinTrack에 오신 것을 환영합니다.
          <br />
          당신의 현명한 소비 생활을 도와드립니다.
        </p>

        {/* <Link>를 <a> 태그로 변경 (빌드 오류 해결) */}
        <a href="/fin-track/login">
          <span className="bg-sky-500 text-white px-6 py-3 rounded-lg font-bold text-lg hover:bg-sky-600 transition-colors cursor-pointer">
            로그인하고 시작하기
          </span>
        </a>
      </main>

      {/* 3. 푸터 */}
      <footer className="py-6 text-center text-gray-500 text-sm">
        &copy; {new Date().getFullYear()} FinTrack. All rights reserved.
      </footer>
    </div>
  );
}

