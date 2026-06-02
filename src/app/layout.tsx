import type { Metadata } from "next";
import "./globals.css";
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
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
