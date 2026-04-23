// app/page.tsx
// 'next/link' 임포트 제거 (빌드 오류 해결)
// import Link from 'next/link';

export default function LandingPage() {
  const features = [
    {
      emoji: "⚡",
      title: "1초 입력",
      desc: "금액과 카테고리만 누르면 끝. 메모는 선택 사항입니다.",
    },
    {
      emoji: "📊",
      title: "자동 통계",
      desc: "월별·카테고리별 지출이 알아서 정리됩니다. 엑셀 필요 없음.",
    },
    {
      emoji: "🎯",
      title: "예산 관리",
      desc: "카테고리별 예산을 설정하고 초과 여부를 한눈에 확인하세요.",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* ===== 헤더 ===== */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <nav className="container mx-auto px-6 py-4 flex justify-between items-center">
          <span className="text-xl font-bold text-sky-700">🦥 게으른 가계부</span>
          <a href="/login">
            <span className="bg-sky-600 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-sky-700 transition-colors">
              로그인 / 회원가입
            </span>
          </a>
        </nav>
      </header>

      <main>
        {/* ===== Hero ===== */}
        <section className="bg-gradient-to-br from-sky-50 via-white to-indigo-50 py-28 px-6 text-center">
          <span className="inline-block bg-sky-100 text-sky-700 text-xs font-semibold px-3 py-1 rounded-full mb-6 tracking-wide">
            게으른 완벽주의자를 위한 가계부 ✨
          </span>
          <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 leading-tight mb-6">
            귀찮아도<br />돈은 모여야죠
          </h1>
          <p className="text-lg text-gray-500 max-w-md mx-auto mb-10">
            입력은 최소한으로, 분석은 최대한으로.<br />
            당신의 소비 습관을 가장 쉽게 파악하세요.
          </p>
          <a href="/login">
            <span className="inline-block bg-sky-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-sky-700 transition-colors shadow-lg shadow-sky-200">
              무료로 시작하기 →
            </span>
          </a>
        </section>

        {/* ===== 기능 카드 ===== */}
        <section className="py-20 px-6 bg-white">
          <div className="container mx-auto max-w-4xl">
            <h2 className="text-2xl font-bold text-center text-gray-800 mb-12">
              왜 게으른 가계부인가요?
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              {features.map((f) => (
                <div
                  key={f.title}
                  className="bg-gray-50 rounded-2xl p-6 hover:shadow-md transition-shadow"
                >
                  <div className="text-3xl mb-3">{f.emoji}</div>
                  <h3 className="font-bold text-gray-900 mb-2">{f.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== CTA 배너 ===== */}
        <section className="bg-gradient-to-r from-sky-600 to-indigo-600 py-20 px-6 text-center text-white">
          <h2 className="text-3xl font-bold mb-3">지금 바로 시작해보세요</h2>
          <p className="text-sky-200 mb-8">가입하는 데 1분도 안 걸립니다.</p>
          <a href="/login">
            <span className="inline-block bg-white text-sky-700 px-8 py-3 rounded-xl font-bold hover:bg-sky-50 transition-colors">
              무료 계정 만들기
            </span>
          </a>
        </section>
      </main>

      {/* ===== 푸터 ===== */}
      <footer className="py-8 text-center text-gray-400 text-xs bg-white border-t border-gray-100">
        &copy; {new Date().getFullYear()} 게으른 가계부. All rights reserved.
      </footer>
    </div>
  );
}
