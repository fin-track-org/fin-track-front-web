"use client";

import Image from "next/image";
import { ReactNode } from "react";
import logoImg from "@/public/images/logo.jpg";
import { PandaBrandArt } from "./PandaBrandArt";

interface AuthShellProps {
  /** 브랜드 영역 제목(데스크톱 전용 표시) */
  brandHeadline: string;
  brandDescription: string;
  /** 서비스 장점 — 최대 2개만 짧게(브리프 §5) */
  benefits?: [string] | [string, string];
  children: ReactNode;
}

/**
 * 로그인·회원가입이 공유하는 2단 레이아웃.
 * 데스크톱: 좌측 브랜드 영역(로고 + 판다 1회 + 제목/설명/장점) + 우측 폼 영역.
 * 모바일: 브랜드 영역은 숨기고 로고만 작게 보여준 뒤 곧바로 폼(children)을 노출한다.
 * 실제 페이지 h1은 children 쪽(폼 영역)에서 렌더링해 페이지당 h1이 정확히 1개가 되도록 한다.
 */
export function AuthShell({ brandHeadline, brandDescription, benefits, children }: AuthShellProps) {
  return (
    <div className="min-h-screen bg-ll-paper lg:flex">
      {/* 데스크톱 전용 브랜드 영역 — 폼보다 시각적으로 우세하지 않도록 폭 절반, 여백 절제 */}
      <div className="hidden lg:flex lg:w-1/2 lg:flex-col lg:justify-between bg-ll-cream px-12 py-12">
        <Image src={logoImg} alt="게으른 가계부 로고" className="h-auto w-32 rounded-lg" priority />

        <div className="max-w-sm">
          <PandaBrandArt size={104} className="mb-6" />
          <p className="mb-3 text-3xl font-extrabold leading-snug text-ll-ink break-keep">{brandHeadline}</p>
          <p className="text-base leading-relaxed text-ll-pencil break-keep">{brandDescription}</p>

          {benefits && benefits.length > 0 && (
            <ul className="mt-6 space-y-2 text-sm text-ll-pencil">
              {benefits.map((benefit) => (
                <li key={benefit} className="flex items-start gap-2 break-keep">
                  <span aria-hidden="true" className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-ll-mint" />
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="text-xs text-ll-pencil/70">© {new Date().getFullYear()} 게으른 가계부</p>
      </div>

      {/* 폼 영역 — 데스크톱 400~460px 범위 유지, 모바일에서는 화면 전체 폭 사용 */}
      <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6 lg:px-12">
        <div className="w-full max-w-[420px]">
          <div className="mb-8 flex justify-center lg:hidden">
            <Image src={logoImg} alt="게으른 가계부 로고" width={152} height={41} className="h-auto w-36 rounded-lg" priority />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

export default AuthShell;
