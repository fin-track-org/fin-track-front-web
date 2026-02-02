"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  BookOpen,
  BarChart3,
  Users,
  User,
  CreditCard,
  LogOut,
  DollarSign,
  Menu,
  X,
} from "lucide-react";
import { createClient } from "@/src/lib/supabase/client";

export default function Sidebar() {
  const router = useRouter();
  const supabase = createClient();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const menuItems = [
    { icon: Home, label: "대시보드 홈", path: "/home" },
    { icon: BookOpen, label: "가계부", path: "/home/transactions" },
    { icon: BarChart3, label: "통계", path: "/home/statistics" },
    { icon: Users, label: "커뮤니티", path: "/home/community" },
    { icon: User, label: "마이페이지", path: "/home/profile" },
    { icon: CreditCard, label: "결제/포인트샵", path: "/home/shop" },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const isActive = (path: string) => {
    if (path === "/home") return pathname === "/home";
    return pathname === path || pathname.startsWith(path + "/");
  };

  const SidebarContent = (
    <aside className="w-64 flex-1 bg-white flex flex-col">
      {/* Logo */}
      <div className="hidden md:block p-6 border-b border-gray-200">
        <h1 className="flex items-center gap-2 text-sky-700">
          <DollarSign className="w-8 h-8" />
          <span className="text-2xl font-bold">FinTrack</span>
        </h1>
      </div>

      {/* Profile */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-linear-to-br from-sky-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
            홍
          </div>
          <div>
            <div className="font-semibold text-gray-900">홍길동</div>
            <div className="text-sm text-gray-500">Free 플랜</div>
          </div>
        </div>
      </div>

      {/* Menu */}
      <nav className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);

            return (
              <Link
                key={item.path}
                href={item.path}
                onClick={() => setIsOpen(false)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  active
                    ? "bg-sky-50 text-sky-600 font-bold"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-gray-200">
        <button
          onClick={handleLogout}
          className=" w-full flex items-center justify-center gap-2 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">로그아웃</span>
        </button>
      </div>
    </aside>
  );

  return (
    <>
      {/* ===== 모바일 헤더 ===== */}
      <header className="md:hidden h-15 flex items-center justify-between gap-2 p-4 border-b bg-white">
        <span className="text-xl font-bold text-sky-700">FinTrack</span>
        <button onClick={() => setIsOpen(true)}>
          <Menu className="text-gray-700" />
        </button>
      </header>

      {/* ===== 데스크톱 사이드바 ===== */}
      <div className="hidden md:flex w-64 h-screen border-r border-gray-200 bg-white">
        {SidebarContent}
      </div>

      {/* ===== 모바일 오버레이 ===== */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* ===== 모바일 슬라이드 사이드바 ===== */}
      <div
        className={`fixed inset-y-0 left-0 z-50 flex flex-col w-64 transform bg-white transition-transform duration-300 md:hidden ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="h-15 flex justify-end p-4 border-b">
          <button onClick={() => setIsOpen(false)}>
            <X className="text-gray-600" />
          </button>
        </div>
        {SidebarContent}
      </div>
    </>
  );
}
