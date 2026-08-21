"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronLeft, LogOut } from "lucide-react";
import NotificationBell from "@/src/components/home/NotificationBell";
import { useQuery } from "@tanstack/react-query";
import { fetchMe } from "@/src/lib/api/userApi";
import { createClient } from "@/src/lib/supabase/client";

/**
 * 모바일 공통 상단바의 제목 규칙(IMPLEMENTATION_BRIEF_017 §4.1·§4.2).
 *  - 최상위 탭(홈/장부/통계/MY): 뒤로가기 없음. 홈은 브랜드 워드마크, 나머지는 화면 제목.
 *  - 실제 pathname으로 분리된 하위 화면(예: 거래 검색 결과): 뒤로가기 + 제목. 뒤로가기는
 *    브라우저 history가 아니라 명시적 부모 경로로 이동한다(§4.2 "앱 밖이나 OAuth 페이지로
 *    빠지는 동작을 만들지 않는다").
 *  - 공개 메뉴에서는 숨겼지만 라우트는 남겨둔 커뮤니티·상점(§3.3)도 직접 접근 시 제목이
 *    비어 보이지 않도록 안전하게 매핑해 둔다.
 */
type TopBarConfig =
  | { kind: "wordmark" }
  | { kind: "title"; title: string }
  | { kind: "sub"; title: string; parentHref: string; parentLabel: string };

function resolveTopBar(pathname: string): TopBarConfig {
  if (pathname === "/home") return { kind: "wordmark" };
  if (pathname === "/home/transactions") return { kind: "title", title: "거래내역" };
  if (pathname === "/home/statistics") return { kind: "title", title: "통계" };
  if (pathname === "/home/profile") return { kind: "title", title: "MY" };
  if (pathname.startsWith("/home/transactions/search")) {
    return { kind: "sub", title: "검색 결과", parentHref: "/home/transactions", parentLabel: "장부로 돌아가기" };
  }
  // 1차 배포 공개 메뉴에서는 숨지만 라우트는 그대로 남아 있다(§3.3) — 직접 URL로 들어와도
  // 제목이 비어 보이지 않게 최소한으로 처리한다.
  if (pathname === "/home/community") return { kind: "title", title: "커뮤니티" };
  if (pathname === "/home/shop") return { kind: "title", title: "포인트 상점" };
  return { kind: "wordmark" };
}

export default function MobileTopBar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const topBar = resolveTopBar(pathname);

  const { data } = useQuery({
    queryKey: ["me"],
    queryFn: fetchMe,
  });

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  // 뒤로가기 버튼 처리 (안드로이드/모바일 프로필 사이드바)
  React.useEffect(() => {
    if (!isMenuOpen) return;

    // Next.js의 기존 history state를 유지하면서 플래그만 추가
    const currentState = window.history.state;
    window.history.pushState({ ...currentState, profileOpen: true }, "");

    const handlePopState = (e: PopStateEvent) => {
      if (!e.state?.profileOpen) {
        setIsMenuOpen(false);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
      // 백드롭 등 다른 방법으로 닫혔을 때 추가했던 히스토리 제거
      if (window.history.state?.profileOpen) {
        window.history.back();
      }
    };
  }, [isMenuOpen]);

  return (
    <>
      <header
        className="lg:hidden flex min-h-14 items-center justify-between gap-2 border-b border-ll-ink/10 bg-ll-paper px-4 sticky top-0 z-30"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="flex min-w-0 items-center gap-1.5">
          {topBar.kind === "sub" && (
            <Link
              href={topBar.parentHref}
              aria-label={topBar.parentLabel}
              className="-ml-1.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-ll-ink hover:bg-ll-cream"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            </Link>
          )}
          {topBar.kind === "wordmark" ? (
            <Link href="/home" className="flex items-center truncate font-black tracking-tight text-ll-ink">
              게으른 가계부
            </Link>
          ) : (
            <h1 className="truncate text-base font-black text-ll-ink">{topBar.title}</h1>
          )}
        </div>
        <div className="flex flex-shrink-0 items-center gap-1">
          <NotificationBell />
          <button onClick={() => setIsMenuOpen(true)} className="flex items-center justify-center transition-transform active:scale-95">
            {data?.avatarUrl ? (
              <img src={data.avatarUrl} alt="profile" className="w-8 h-8 rounded-full object-cover shadow-sm ring-1 ring-gray-200" />
            ) : (
              <div className="w-8 h-8 bg-gradient-to-br from-sky-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-semibold shadow-sm">
                {data?.nickname?.[0] || "G"}
              </div>
            )}
          </button>
        </div>
      </header>

      {/* 우측 슬라이드 메뉴 (Backdrop + Drawer) — IMPLEMENTATION_BRIEF_017 §4.3: 상단 프로필
          버튼과 하단 MY가 기능적으로 중복되므로 "MY로 이동"/"로그아웃"/꼭 필요한 포인트
          정보만 남기고 최소화한다. 커뮤니티·상점 링크는 제거한다(라우트 자체는 보존). */}
      <div className={`fixed inset-0 z-[200] transition-opacity duration-300 lg:hidden ${isMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}>
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsMenuOpen(false)} />

        {/* Drawer */}
        <div className={`absolute top-0 right-0 bottom-0 w-72 bg-white shadow-2xl transform transition-transform duration-300 flex flex-col ${isMenuOpen ? "translate-x-0" : "translate-x-full"}`}>
          {/* 알림은 이제 상단 앱 바에 상시 노출되므로(IMPLEMENTATION_BRIEF_010 §5) 여기서는
              중복 렌더링하지 않는다. */}

          {/* Profile Section */}
          <div className="p-6 flex flex-col items-center border-b border-gray-100 bg-gray-50/50">
            {data?.avatarUrl ? (
              <img src={data.avatarUrl} alt="profile" className="w-20 h-20 rounded-full object-cover shadow-md ring-4 ring-white mb-4" />
            ) : (
              <div className="w-20 h-20 bg-gradient-to-br from-sky-500 to-purple-500 rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-md ring-4 ring-white mb-4">
                {data?.nickname?.[0] || "G"}
              </div>
            )}
            <h3 className="text-lg font-bold text-gray-800 mb-1">{data?.nickname || "Guest"}</h3>
            <div className="text-xs text-sky-600 font-medium bg-sky-50 px-2.5 py-1 rounded-md mb-4">
              Free 플랜
            </div>

            {data?.pointBalance !== undefined && (
              // 포인트 상점(§3.3)이 공개 메뉴에서 빠졌으므로, 여기서도 상점으로 가는 링크는
              // 두지 않는다. "꼭 필요한 포인트 정보"만 정적으로 보여준다(§4.3).
              <div className="w-full mt-2 text-sm text-amber-700 font-bold bg-amber-50 border border-amber-200 py-3 rounded-xl flex items-center justify-center gap-2 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                보유 포인트: {data.pointBalance.toLocaleString()} P
              </div>
            )}
          </div>

          {/* 기능 메뉴 */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4">
            <div className="space-y-1 pt-2">
              <Link
                href="/home/profile"
                onClick={() => setIsMenuOpen(false)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
              >
                마이페이지 설정
              </Link>
            </div>
          </div>

          {/* 로그아웃 */}
          <div className="p-4 border-t border-gray-200 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-3 text-red-600 hover:bg-red-50 rounded-xl font-medium transition-colors"
            >
              <LogOut size={18} />
              로그아웃
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
