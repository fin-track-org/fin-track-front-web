import Sidebar from "@/components/home/sidebar/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-screen w-full bg-gray-50">
      <div className="flex h-full flex-col md:flex-row">
        {/* Sidebar + Mobile Header */}
        <Sidebar />

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">{children}</main>
      </div>
    </div>
  );
}
