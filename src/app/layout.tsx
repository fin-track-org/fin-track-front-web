import type { Metadata } from "next";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import NextTopLoader from 'nextjs-toploader';
import Providers from "./providers";

export const metadata: Metadata = {
  title: "게으른 가계부 | 나만의 똑똑한 자산 및 지출 관리",
  description:
    "복잡한 인증 없이 간편하게 수입과 지출을 기록하고, 내 자산 흐름을 한눈에 파악하는 무료 가계부 웹 앱입니다. 똑똑한 소비 습관을 만들어보세요.",
  keywords: ["가계부", "자산관리", "지출관리", "무료 가계부", "재테크", "가계부 어플"],
  icons: {
    icon: "/images/favicon.png",
    shortcut: "/images/favicon.png",
    apple: "/images/favicon.png",
  },
  openGraph: {
    title: "게으른 가계부 | 나만의 똑똑한 자산 관리",
    description: "간편하게 수입/지출을 기록하고 자산을 관리하세요.",
    url: "https://cashbook.lazy-kit.com",
    siteName: "게으른 가계부",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
      },
    ],
    locale: "ko_KR",
    type: "website",
  },
  verification: {
    google: "EfoaIFNiw6haAicV3M_jMn8T2jOp7nyzynyLBEQ3Z9Y",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <head>
        {/* head 태그 안에 애드센스 스크립트를 넣습니다. */}
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2225450018264899"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#ffffff" />
      </head>
      <body className="antialiased">
        <NextTopLoader color="#0ea5e9" height={3} showSpinner={false} />
        <Providers>{children}</Providers>
        <Analytics />
      </body>
    </html>
  );
}
