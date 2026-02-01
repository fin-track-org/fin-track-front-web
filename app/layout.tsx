import type { Metadata } from "next";
import localFont from "next/font/local";
import { Inter } from "next/font/google";
import "./globals.css";

/* Pretendard (기본 UI 폰트) */
const pretendard = localFont({
  src: "../public/font/PretendardVariable.woff2",
  variable: "--font-pretendard",
  display: "swap",
});

/* Inter (숫자/금액용) */
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "FinTrack",
  description: "스마트 가계부 서비스",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className={`${pretendard.variable} ${inter.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
