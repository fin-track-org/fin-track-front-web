"use client"; // 👈 (1) "use client" (이벤트 핸들러, 훅 사용)

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation"; // 👈 (2) usePathname 추가
// 👈 (3) 경로를 상대 경로('../../') 대신 Next.js 표준 별칭('@/')으로 수정
import { createClient } from "@/lib/supabase/client";

// (4) 레이아웃은 children prop을 받습니다.
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const supabase = createClient();
  const pathname = usePathname(); // 👈 (5) 현재 URL 경로를 가져옵니다 (e.g., "/dashboard" 또는 "/dashboard/ledger")

  // (6) 로그아웃 버튼 클릭 시 실행될 함수
  const handleLogout = async () => {
    await supabase.auth.signOut();
    // 💡 basePath가 적용되어 있어도 '/login'만 적으면
    // Next.js가 알아서 '/fintrack-frontend/login'으로 보내줍니다.
    router.push("/login");
  };

  // (7) 현재 경로에 따라 메뉴 스타일을 다르게 적용
  // basePath를 고려하여 경로를 확인합니다.
  const getLinkClass = (path: string) => {
    // basePath가 설정되어 있을 수 있으므로, pathname.endsWith를 사용하는 것이 더 안전합니다.
    return pathname.endsWith(path)
      ? "text-sky-600 font-bold border-b-2 border-sky-600 pb-1" // 활성 탭
      : "text-gray-500 hover:text-gray-800"; // 비활성 탭
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 1. 상단 헤더 (GNB) - 이제 모든 페이지가 공유합니다. */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <nav className="container mx-auto px-6 py-4 flex justify-between items-center">
          {/* 로고와 메뉴 */}
          <div className="flex items-center gap-8">
            <h1 className="text-2xl font-bold text-sky-700">FinTrack</h1>

            {/* ✨ 요청하신 메뉴 ✨ */}
            <div className="flex items-center gap-6 text-lg">
              {/* Link의 href는 basePath를 신경쓰지 않고 그대로 둡니다. */}
              <Link href="/home" className={getLinkClass("/home")}>
                대시보드
              </Link>
              <Link
                href="/home/transactions"
                className={getLinkClass("/home/transactions")}
              >
                가계부
              </Link>
              <Link
                href="/home/statistics"
                className={getLinkClass("/home/statistics")}
              >
                통계
              </Link>
              <Link
                href="/home/community"
                className={getLinkClass("/home/community")}
              >
                커뮤니티
              </Link>
              <Link
                href="/home/profile"
                className={getLinkClass("/home/profile")}
              >
                마이페이지
              </Link>
              <Link href="/home/shop" className={getLinkClass("/home/shop")}>
                결제/포인트샵
              </Link>
            </div>
          </div>

          {/* 로그아웃 버튼 */}
          <button
            onClick={handleLogout}
            className="bg-sky-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-sky-600 transition-colors"
          >
            로그아웃
          </button>
        </nav>
      </header>

      {/* 2. 메인 컨텐츠 영역 */}
      {/* (8) 이 children 부분에 page.tsx 또는 ledger/page.tsx의 내용이 들어옵니다. */}
      <main className="container mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
