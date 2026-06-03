import Sidebar from "@/src/components/home/sidebar/Sidebar";
import GlobalQuickAdd from "@/src/components/home/GlobalQuickAdd";
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
          <div className="flex-1 p-6 lg:p-8">
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
