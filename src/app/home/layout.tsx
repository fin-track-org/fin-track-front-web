import Sidebar from "@/src/components/home/sidebar/Sidebar";
import GlobalQuickAdd from "@/src/components/home/GlobalQuickAdd";
import NotificationBell from "@/src/components/home/NotificationBell";
import Footer from "@/src/components/Footer";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-screen w-full bg-gray-50">
      <div className="flex h-full flex-col lg:flex-row">
        {/* Sidebar + Mobile Header */}
        <Sidebar />

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto flex flex-col">
          {/* Top Bar for Desktop/Mobile (Right aligned) */}
          <div className="flex justify-end px-4 pt-4 lg:px-8 lg:pt-6">
            <NotificationBell />
          </div>

          <div className="flex-1 p-6 pt-2 lg:p-8 lg:pt-2">
            {children}
          </div>
          <div className="mt-auto">
            <Footer />
          </div>
        </main>
      </div>
      
      {/* 글로벌 빠른 추가 모달 (FAB) */}
      <GlobalQuickAdd />
    </div>
  );
}
