"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BookOpen, BarChart3, User, Plus } from "lucide-react";

export default function MobileBottomNav() {
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path === "/home") return pathname === "/home";
    return pathname === path || pathname.startsWith(path + "/");
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[100] bg-white border-t border-gray-200 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.05)] lg:hidden">
      <div className="flex items-center justify-around h-16 px-1 relative">
        <Link href="/home" className={`flex flex-col items-center justify-center w-14 h-full gap-1 ${isActive("/home") ? "text-sky-600" : "text-gray-400 hover:text-gray-600"}`}>
          <Home className="w-[22px] h-[22px]" strokeWidth={isActive("/home") ? 2.5 : 2} />
          <span className="text-[10px] font-medium">홈</span>
        </Link>

        <Link href="/home/transactions" className={`flex flex-col items-center justify-center w-14 h-full gap-1 ${isActive("/home/transactions") ? "text-sky-600" : "text-gray-400 hover:text-gray-600"}`}>
          <BookOpen className="w-[22px] h-[22px]" strokeWidth={isActive("/home/transactions") ? 2.5 : 2} />
          <span className="text-[10px] font-medium">가계부</span>
        </Link>

        {/* 중앙 빠른 추가 버튼 (Squircle) */}
        <div className="relative w-16 h-full flex items-center justify-center">
          <button 
            onClick={() => window.dispatchEvent(new Event("open-quick-add"))}
            className="w-12 h-10 bg-sky-600 hover:bg-sky-700 text-white rounded-[14px] flex items-center justify-center shadow-sm active:scale-95 transition-all"
          >
            <Plus className="w-6 h-6" strokeWidth={2.5} />
          </button>
        </div>

        <Link href="/home/statistics" className={`flex flex-col items-center justify-center w-14 h-full gap-1 ${isActive("/home/statistics") ? "text-sky-600" : "text-gray-400 hover:text-gray-600"}`}>
          <BarChart3 className="w-[22px] h-[22px]" strokeWidth={isActive("/home/statistics") ? 2.5 : 2} />
          <span className="text-[10px] font-medium">통계</span>
        </Link>

        <Link href="/home/profile" className={`flex flex-col items-center justify-center w-14 h-full gap-1 ${isActive("/home/profile") ? "text-sky-600" : "text-gray-400 hover:text-gray-600"}`}>
          <User className="w-[22px] h-[22px]" strokeWidth={isActive("/home/profile") ? 2.5 : 2} />
          <span className="text-[10px] font-medium">MY</span>
        </Link>
      </div>
    </nav>
  );
}
