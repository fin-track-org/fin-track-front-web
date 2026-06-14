// app/page.tsx
"use client";

import { useState, useEffect } from 'react';
// 'next/link' 임포트 제거 (빌드 오류 해결)
// import Link from 'next/link';
import Image from 'next/image';
import logoImg from "@/public/images/logo.jpg";
import Footer from '@/src/components/Footer';

import { useRouter } from 'next/navigation';
import { createClient } from "@/src/lib/supabase/client";

export default function LandingPage() {
  const [showBanner, setShowBanner] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // 뒤로가기 등으로 캐시된 랜딩 페이지에 접근했을 때, 이미 로그인되어 있다면 홈으로 돌려보냅니다.
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        router.replace("/home");
      }
    };
    checkUser();
    // 브라우저 렌더링 시 로컬 스토리지 확인하여 배너 표시 여부 결정
    const isBannerHidden = localStorage.getItem('hide_announcement_banner');
    if (!isBannerHidden) {
      setShowBanner(true);
    }
  }, []);

  const closeBanner = () => {
    setShowBanner(false);
    // '다시 보지 않기' 처리 (로컬 스토리지에 저장)
    localStorage.setItem('hide_announcement_banner', 'true');
  };
  const features = [
    {
      emoji: "🎯",
      title: "예산 기반 지출 관리",
      desc: "예산을 설정하고, 카테고리별 사용량과 초과 여부를 한눈에 확인하세요.",
    },
    {
      emoji: "💳",
      title: "맞춤형 상세 통계",
      desc: "단순 지출 기록을 넘어, 결제수단별 및 카테고리별 사용량을 정확히 분석해 드립니다.",
    },
    {
      emoji: "📈",
      title: "저축/투자 통계 분리",
      desc: "지출 현황과 별개로 나의 저축 및 투자 흐름을 별도로 관리할 수 있습니다. (개발 예정)",
    },
    {
      emoji: "🎛️",
      title: "내 입맛대로 모드 설정",
      desc: "기록에 집중하는 '간편모드', 꼼꼼한 '자산관리모드' 중 원하는 방식을 선택하세요. (개발 예정)",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* ===== 상단 띠 배너 ===== */}
      {showBanner && (
        <div className="bg-slate-800 text-slate-100 text-xs sm:text-sm py-2.5 px-4 flex justify-between items-center z-[60] relative">
          <div className="flex-1 text-center font-medium">
            🚧 개발자가 직접 쓰려고 만든 무료 서비스입니다. 지속적으로 업데이트 및 앱 출시를 준비 중이에요!
          </div>
          <button
            onClick={closeBanner}
            className="p-1 hover:bg-slate-700 rounded-full transition-colors ml-4 shrink-0 text-slate-300 hover:text-white"
            aria-label="배너 닫기"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* ===== 헤더 ===== */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <nav className="container mx-auto px-6 py-4 flex justify-between items-center">
          <Image src={logoImg} alt="게으른 가계부 로고" className="rounded-lg w-40 h-auto" />

          <a href="/login">
            <span className="bg-sky-600 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-sky-700 transition-colors">
              로그인 / 회원가입
            </span>
          </a>
        </nav>
      </header>

      <main>
        {/* ===== Hero ===== */}
        <section className="relative overflow-hidden bg-white pt-24 pb-32 px-6 text-center">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-64 bg-sky-50 rounded-full blur-3xl -z-10 opacity-60"></div>
          
          <div className="flex flex-col items-center gap-3 mb-8">
            <span className="inline-block bg-sky-50 text-sky-600 border border-sky-100 text-xs font-bold px-3.5 py-1.5 rounded-full tracking-wide">
              게으른 완벽주의자를 위한 가계부 ✨
            </span>
            <span className="inline-block bg-slate-50 text-slate-600 border border-slate-200 text-xs font-medium px-3.5 py-1.5 rounded-full tracking-wide shadow-sm">
              👋 개발자가 직접 쓰려고 만든 무료 서비스 (앱 출시 준비 중)
            </span>
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-slate-900 leading-[1.2] tracking-tight mb-6">
            최소한의 입력으로 <br className="hidden sm:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-500 to-indigo-500">최대한의 효율</span>을 경험하세요
          </h1>
          
          <p className="text-base md:text-lg text-slate-500 max-w-lg mx-auto mb-10 leading-relaxed font-medium">
            복잡한 과정은 다 덜어냈습니다. 가장 적은 노력으로 <br className="hidden sm:block" />
            예산, 카테고리, 결제수단별 맞춤 통계를 똑똑하게 관리해보세요.
          </p>

          <a href="/login">
            <span className="inline-flex items-center justify-center gap-2 bg-slate-900 text-white px-8 py-4 rounded-2xl font-bold text-base md:text-lg hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 hover:-translate-y-0.5">
              지금 바로 시작하기
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </span>
          </a>
        </section>

        {/* ===== 기능 소개 ===== */}
        <section className="py-24 px-6 bg-slate-50 border-y border-slate-100">
          <div className="container mx-auto max-w-5xl">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-slate-900 mb-4 tracking-tight">
                기록은 가볍게, 분석은 깊게
              </h2>
              <p className="text-slate-500 font-medium">가계부 쓰다 포기한 사람들을 위해 만들었습니다.</p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((f) => (
                <div
                  key={f.title}
                  className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 hover:shadow-md transition-all hover:-translate-y-1"
                >
                  <div className="w-14 h-14 bg-sky-50 rounded-2xl flex items-center justify-center text-2xl mb-6">
                    {f.emoji}
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">{f.title}</h3>
                  <p className="text-slate-500 leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== 하단 CTA ===== */}
        <section className="py-24 px-6 text-center bg-white">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 max-w-4xl mx-auto rounded-[2.5rem] py-16 px-6 text-white shadow-2xl">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 tracking-tight">당신의 돈 흐름, 이제 한눈에 확인하세요</h2>
            <p className="text-slate-300 mb-10 text-lg">이메일로 3초 만에 가입하고 바로 시작해보세요.</p>
            <a href="/login">
              <span className="inline-block bg-white text-slate-900 px-8 py-4 rounded-xl font-bold text-lg hover:bg-slate-50 transition-colors shadow-lg">
                무료로 시작하기
              </span>
            </a>
          </div>
        </section>
      </main>

      {/* ===== 푸터 ===== */}
      <Footer />
    </div>
  );
}
