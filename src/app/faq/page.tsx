import React from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import Footer from "@/src/components/Footer";

export const metadata = {
  title: "자주 묻는 질문(FAQ) | 게으른 가계부",
  description: "게으른 가계부 서비스에 대해 사용자들이 가장 자주 묻는 질문들과 그에 대한 상세한 답변을 모아둔 FAQ 페이지입니다.",
};

export default function FaqPage() {
  const faqs = [
    {
      question: "Q. 서비스 이용 요금은 얼마인가요? 정말 무료인가요?",
      answer: (
        <>
          <p className="mb-2">
            네, 현재 게으른 가계부는 <strong>100% 전면 무료</strong>로 제공되고 있습니다.
            초기 기획 단계부터 개발자가 본인이 쓰려고, 지인들과 함께 가계부를 편하게 쓰기 위해 취미로 시작한 프로젝트이기 때문입니다.
          </p>
          <p>
            향후 서버 유지보수 비용을 충당하기 위해 아주 작은 배너 광고가 추가되거나, 
            프리미엄 기능(예: 자산 연동 자동화 등)에 한해 유료 모델이 도입될 가능성은 있지만, 
            기본적인 수입/지출 기록 및 통계 분석 기능은 앞으로도 계속 무료로 제공될 약속드립니다.
          </p>
        </>
      ),
    },
    {
      question: "Q. 스마트폰 앱(iOS/Android)으로는 언제 출시되나요?",
      answer: (
        <>
          <p className="mb-2">
            현재 게으른 가계부는 웹 브라우저(PC/모바일 웹) 환경에 최적화되어 제공되고 있습니다. 
            Safari, Chrome 등 스마트폰 브라우저에서도 앱처럼 편리하게 사용하실 수 있도록 반응형 웹(Responsive Web) 디자인을 적용했습니다.
          </p>
          <p>
            모바일 전용 네이티브 앱(App Store 및 Google Play) 출시는 현재 적극적으로 개발을 진행 중에 있습니다. 
            앱이 출시되면 스마트폰의 푸시 알림 기능이나, 영수증 스캔 기능 등 더 강력한 편의 기능을 지원할 예정이니 많은 기대 부탁드립니다.
          </p>
        </>
      ),
    },
    {
      question: "Q. 내가 기록한 금융 데이터는 안전하게 보관되나요?",
      answer: (
        <>
          <p className="mb-2">
            사용자 여러분의 개인정보와 민감한 금융 데이터는 철저한 보안 시스템을 갖춘 글로벌 클라우드 서버(Supabase)에 안전하게 저장됩니다.
          </p>
          <p>
            또한, 비밀번호 등의 인증 정보는 암호화(Hashing) 처리되어 저장되며, 개발자를 포함한 그 누구도 원본 비밀번호를 열람할 수 없습니다.
            저희는 사용자의 금융 데이터를 외부 기관에 판매하거나 마케팅 용도로 무단 사용하지 않으므로 안심하고 사용하셔도 좋습니다.
          </p>
        </>
      ),
    },
    {
      question: "Q. 카테고리와 세부 항목은 어떻게 다르고, 어떻게 추가하나요?",
      answer: (
        <>
          <p className="mb-2">
            <strong>메인 카테고리</strong>는 '식비', '교통비', '주거비' 처럼 큰 틀의 지출 목적을 의미합니다. 
            반면 <strong>세부 항목(Sub-category)</strong>은 그 안에서 구체적으로 어디에 돈을 썼는지(예: '배달음식', '편의점', '버스/지하철')를 나눌 수 있는 맞춤형 꼬리표입니다.
          </p>
          <p>
            메인 카테고리는 시스템에서 표준으로 제공되는 항목들을 사용하지만, 
            세부 항목은 여러분의 라이프스타일에 맞게 직접 텍스트를 입력하여 무제한으로 만들어낼 수 있습니다. 
            상세 거래 등록 모달 창에서 '세부 항목 추가' 버튼을 눌러보세요!
          </p>
        </>
      ),
    },
    {
      question: "Q. '자산 관리 모드'와 '간편 모드'의 차이가 무엇인가요?",
      answer: (
        <>
          <p className="mb-2">
            가계부를 쓰는 목적은 사람마다 다릅니다. 게으른 가계부는 이러한 다양한 니즈를 충족시키기 위해 두 가지 모드를 기획했습니다.
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>간편 모드(현재 기본값):</strong> 통장 잔고가 얼마인지 계산하기보다는, 단순히 '이번 달에 얼마를 벌었고 얼마를 썼는지' 현금 흐름 자체를 추적하는 가벼운 모드입니다. 가계부 초보자에게 적극 추천합니다.</li>
            <li><strong>자산 관리 모드(추후 업데이트):</strong> 예금, 적금, 주식, 가상화폐 등 내가 가진 모든 계좌의 잔액을 설정하고, 이체 현황과 투자 수익률까지 종합적으로 관리하여 내 순자산(Net Worth)을 불려가는 것을 목표로 하는 고급 모드입니다.</li>
          </ul>
        </>
      ),
    },
    {
      question: "Q. 탈퇴하거나 데이터를 모두 초기화하고 싶을 땐 어떻게 하나요?",
      answer: (
        <p>
          우측 상단의 프로필 아이콘을 클릭하여 '마이페이지(설정)' 메뉴로 진입하시면 회원 탈퇴 버튼을 찾으실 수 있습니다.
          탈퇴 시 그동안 기록하셨던 모든 가계부 내역과 회원 정보는 데이터베이스에서 즉시, 영구적으로 삭제되며 복구할 수 없습니다.
          단순히 기록만 초기화하는 기능은 현재 준비 중입니다.
        </p>
      ),
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ===== 헤더 ===== */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <nav className="container mx-auto px-6 py-4 flex items-center gap-4">
          <Link href="/" className="text-gray-500 hover:text-gray-800 transition-colors">
            <ChevronLeft size={24} />
          </Link>
          <h1 className="text-xl font-bold text-slate-800">자주 묻는 질문 (FAQ)</h1>
        </nav>
      </header>

      <main className="container mx-auto px-6 py-12 max-w-4xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4 tracking-tight">
            궁금한 점이 있으신가요?
          </h2>
          <p className="text-slate-500 text-lg">
            게으른 가계부 사용자들이 자주 묻는 질문들을 모아 답변해 드립니다.
          </p>
        </div>

        <div className="space-y-6">
          {faqs.map((faq, idx) => (
            <div key={idx} className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-100">
              <h3 className="text-xl font-bold text-slate-800 mb-4 border-b border-slate-50 pb-4">
                {faq.question}
              </h3>
              <div className="text-slate-600 leading-relaxed">
                {faq.answer}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 bg-white rounded-2xl p-8 border border-slate-200 text-center">
          <h3 className="text-xl font-bold text-slate-800 mb-2">원하는 답변을 찾지 못하셨나요?</h3>
          <p className="text-slate-500 mb-6">
            서비스 개선 의견이나 버그 제보, 추가적인 문의 사항이 있다면 언제든지 피드백을 남겨주세요.
          </p>
          {/* 향후 피드백 폼이나 이메일 주소로 연동 */}
          <span className="inline-block bg-slate-100 text-slate-700 px-6 py-3 rounded-lg font-medium">
            이메일 문의: support@lazy-kit.com (예정)
          </span>
        </div>
      </main>

      {/* ===== 푸터 ===== */}
      <Footer />
    </div>
  );
}
