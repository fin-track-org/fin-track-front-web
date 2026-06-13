import DesktopSidebar from "@/src/components/home/layout/DesktopSidebar";
import MobileTopBar from "@/src/components/home/layout/MobileTopBar";
import MobileBottomNav from "@/src/components/home/layout/MobileBottomNav";
import GlobalQuickAdd from "@/src/components/home/GlobalQuickAdd";
import Footer from "@/src/components/Footer";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-[100dvh] w-full bg-gray-50 flex flex-col lg:flex-row overflow-hidden">
      {/* 모바일 상단 바 */}
      <MobileTopBar />

      {/* 데스크탑 사이드바 */}
      <div className="hidden lg:flex">
        <DesktopSidebar />
      </div>

      {/* 메인 콘텐츠 영역 */}
      <main className="flex-1 overflow-y-auto flex flex-col relative pb-16 lg:pb-0">
        <div className="flex-1 p-4 lg:p-8">
          {children}
        </div>
        <div className="mt-auto hidden lg:block">
          <Footer />
        </div>
      </main>

      {/* 모바일 하단 탭 바 */}
      <MobileBottomNav />
      
      {/* 글로벌 빠른 추가 모달 (FAB) */}
      <GlobalQuickAdd />
    </div>
  );
}
