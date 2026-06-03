import React from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import Footer from "@/src/components/Footer";

export const metadata = {
  title: "이용 가이드 | 게으른 가계부",
  description: "최소한의 입력으로 최대한의 효율을 내는 게으른 가계부의 100% 활용 가이드입니다. 예산 설정, 통계 분석, 빠른 거래 등록 방법 등을 상세히 알아보세요.",
};

export default function GuidePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* ===== 헤더 ===== */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <nav className="container mx-auto px-6 py-4 flex items-center gap-4">
          <Link href="/" className="text-gray-500 hover:text-gray-800 transition-colors">
            <ChevronLeft size={24} />
          </Link>
          <h1 className="text-xl font-bold text-slate-800">이용 가이드</h1>
        </nav>
      </header>

      <main className="container mx-auto px-6 py-12 max-w-3xl">
        <article className="prose prose-slate prose-lg max-w-none">
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-8">
            게으른 가계부 100% 활용 가이드
          </h1>
          
          <p className="text-slate-600 mb-12 text-lg leading-relaxed">
            게으른 가계부에 오신 것을 환영합니다! 복잡한 가계부 작성에 지치셨나요? 
            저희 서비스는 '최소한의 입력으로 최대한의 효율을'이라는 철학 아래, 가계부를 쓰다가 중도 포기하는 분들을 위해 만들어졌습니다. 
            이 가이드를 통해 게으른 가계부의 핵심 기능들과 숨겨진 꿀팁들을 익히고, 보다 스마트하게 자산을 관리하는 방법을 알아보세요.
          </p>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-slate-800 mb-4 border-b pb-2">1. 기초부터 탄탄하게: 예산 설정하기</h2>
            <p className="text-slate-600 mb-4 leading-relaxed">
              성공적인 자산 관리의 첫걸음은 한 달 예산을 설정하는 것입니다. 게으른 가계부에서는 매달 사용할 총 예산을 설정하고, 
              실시간으로 남은 금액과 사용 비율을 시각적인 막대 그래프(Progress Bar)로 한눈에 파악할 수 있습니다.
            </p>
            <ul className="list-disc pl-6 text-slate-600 mb-4 space-y-2">
              <li><strong>예산 입력 방법:</strong> 대시보드 메인 화면 상단의 '예산 설정' 버튼을 눌러 이번 달 목표 지출액을 입력하세요.</li>
              <li><strong>실시간 추적:</strong> 지출 내역을 등록할 때마다 예산 막대가 실시간으로 채워지며, 예산의 80% 이상을 사용하면 경고 색상으로 변하여 과소비를 방지해 줍니다.</li>
              <li><strong>이월 기능:</strong> (업데이트 예정) 남은 예산을 다음 달로 이월하거나 저축으로 자동 분류하는 기능이 곧 추가됩니다.</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-slate-800 mb-4 border-b pb-2">2. 귀찮음 제로: 빠른 거래 추가 기능</h2>
            <p className="text-slate-600 mb-4 leading-relaxed">
              "아, 아까 커피 마신 거 가계부에 써야 하는데..." 생각만 하다가 까먹은 적 많으시죠? 
              게으른 가계부는 어떤 화면에 있든 우측 하단에 떠 있는 <strong>플로팅 액션 버튼(FAB)</strong>을 통해 단 3초 만에 거래를 등록할 수 있습니다.
            </p>
            <ul className="list-disc pl-6 text-slate-600 mb-4 space-y-2">
              <li><strong>빠른 등록 (임시 보관):</strong> 날짜와 금액, 메모만 대충 적고 일단 저장하세요! 나중에 여유로울 때 카테고리를 지정해 분류하면 됩니다.</li>
              <li><strong>상세 등록:</strong> 꼼꼼하게 관리하고 싶다면 처음부터 카테고리, 결제 수단(현금, 카드 등), 세부 항목까지 모두 입력할 수 있는 상세 등록 모드를 활용하세요.</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-slate-800 mb-4 border-b pb-2">3. 나만의 맞춤형 분류: 카테고리 및 세부 항목</h2>
            <p className="text-slate-600 mb-4 leading-relaxed">
              기본 제공되는 '식비', '교통비' 같은 뻔한 카테고리만으로는 부족할 때가 있습니다. 
              게으른 가계부는 큰 틀의 메인 카테고리뿐만 아니라, 나만의 맞춤형 <strong>세부 항목(Sub-category)</strong>을 자유롭게 추가할 수 있는 기능을 제공합니다.
            </p>
            <p className="text-slate-600 mb-4 leading-relaxed">
              예를 들어, '식비' 카테고리 아래에 '배달음식', '회사점심', '카페/디저트' 등으로 세분화하여 내 돈이 정확히 어디로 새어나가고 있는지 날카롭게 분석해 보세요. 
              세부 항목은 거래를 입력하는 도중에도 즉시 새롭게 생성하여 적용할 수 있어 매우 편리합니다.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-slate-800 mb-4 border-b pb-2">4. 눈에 쏙 들어오는 통계 대시보드</h2>
            <p className="text-slate-600 mb-4 leading-relaxed">
              입력만 하고 끝난다면 훌륭한 가계부가 아닙니다. 게으른 가계부의 대시보드는 여러분이 입력한 데이터를 바탕으로 가장 직관적이고 아름다운 차트를 그려냅니다.
            </p>
            <ul className="list-disc pl-6 text-slate-600 mb-4 space-y-2">
              <li><strong>결제수단별 지출 분석:</strong> 신용카드, 체크카드, 간편결제(네이버페이, 카카오페이 등), 현금 등 내가 어떤 방식으로 돈을 가장 많이 쓰는지 도넛 차트로 보여줍니다.</li>
              <li><strong>카테고리 비율:</strong> 이번 달 지출 중 가장 큰 비중을 차지한 카테고리가 무엇인지 한눈에 파악하세요.</li>
              <li><strong>일자별 자산 변화 (준비 중):</strong> 한 달 동안 내 자산이 어떻게 변화했는지 꺾은선 그래프로 추적할 수 있습니다.</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-slate-800 mb-4 border-b pb-2">5. 두 가지 관리 모드: 간편 vs 자산 관리</h2>
            <p className="text-slate-600 mb-4 leading-relaxed">
              사용자의 성향에 따라 가계부를 쓰는 목적이 다릅니다. 게으른 가계부는 설정(Settings) 메뉴에서 두 가지 모드를 자유롭게 전환할 수 있도록 지원할 예정입니다.
            </p>
            <ul className="list-disc pl-6 text-slate-600 mb-4 space-y-2">
              <li><strong>간편 모드 (Lazy Mode):</strong> 통장 잔고나 복잡한 자산 흐름은 신경 쓰지 않고, 오직 '수입'과 '지출'만 기록하여 소비 통제에 집중하는 모드입니다.</li>
              <li><strong>자산 관리 모드 (Pro Mode):</strong> 여러 개의 은행 계좌 잔액, 주식 및 코인 등 투자 자산까지 종합적으로 연동하여 나의 '총 자산'의 증감을 관리하는 전문가용 모드입니다. (추후 업데이트 예정)</li>
            </ul>
          </section>

          <div className="bg-sky-50 rounded-2xl p-8 mt-16 text-center">
            <h3 className="text-xl font-bold text-slate-800 mb-4">지금 바로 가계부 작성을 시작해볼까요?</h3>
            <p className="text-slate-600 mb-6">
              복잡한 회원가입 없이 클릭 몇 번으로 즉시 이용할 수 있습니다. 
              게으른 가계부와 함께 현명한 소비 습관을 만들어가세요.
            </p>
            <Link href="/login" className="inline-block bg-sky-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-sky-700 transition-colors">
              무료로 시작하기
            </Link>
          </div>

        </article>
      </main>

      {/* ===== 푸터 ===== */}
      <Footer />
    </div>
  );
}
