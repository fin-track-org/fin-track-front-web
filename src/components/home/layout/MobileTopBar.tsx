"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import logoImg from "@/public/images/logo.jpg";
import NotificationBell from "@/src/components/home/NotificationBell";
import { useQuery } from "@tanstack/react-query";
import { fetchMe } from "@/src/lib/api/userApi";
import { createClient } from "@/src/lib/supabase/client";
import { useRouter } from "next/navigation";
import { LogOut, X } from "lucide-react";

export default function MobileTopBar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const router = useRouter();
  
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

  return (
    <>
      <header className="lg:hidden h-14 flex items-center justify-between gap-2 px-4 border-b border-gray-200 bg-white sticky top-0 z-30">
        <div className="flex items-center gap-2.5">
          <Link href="/home" className="flex items-center">
            <Image src={logoImg} alt="게으른 가계부 로고" className="h-8 w-auto rounded-md" />
          </Link>
        </div>
        <div className="flex items-center gap-3">
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

      {/* 우측 슬라이드 메뉴 (Backdrop + Drawer) */}
      <div className={`fixed inset-0 z-[200] transition-opacity duration-300 lg:hidden ${isMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}>
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsMenuOpen(false)} />
        
        {/* Drawer */}
        <div className={`absolute top-0 right-0 bottom-0 w-72 bg-white shadow-2xl transform transition-transform duration-300 flex flex-col ${isMenuOpen ? "translate-x-0" : "translate-x-full"}`}>
          {/* Header */}
          <div className="flex items-center justify-end p-4">
            <NotificationBell />
          </div>

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
              <Link href="/home/shop" onClick={() => setIsMenuOpen(false)} className="w-full mt-2 text-sm text-amber-700 font-bold bg-amber-50 hover:bg-amber-100 border border-amber-200 py-3 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                보유 포인트: {data.pointBalance.toLocaleString()} P
              </Link>
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
