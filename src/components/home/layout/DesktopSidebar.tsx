"use client";

import Link from "next/link";
import Image from "next/image";
import logoImg from "@/public/images/logo.jpg";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  BookOpen,
  BarChart3,
  Users,
  User,
  CreditCard,
  LogOut,
} from "lucide-react";
import { createClient } from "@/src/lib/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { fetchMe } from "@/src/lib/api/userApi";
import NotificationBell from "@/src/components/home/NotificationBell";
import { useQuestStore } from "@/src/store/useQuestStore";

export default function DesktopSidebar() {
  const router = useRouter();
  const supabase = createClient();
  const pathname = usePathname();

  const menuItems = [
    { icon: Home, label: "대시보드 홈", path: "/home" },
    { icon: BookOpen, label: "가계부", path: "/home/transactions" },
    { icon: BarChart3, label: "통계", path: "/home/statistics" },
    { icon: Users, label: "커뮤니티", path: "/home/community" },
    { icon: User, label: "마이페이지", path: "/home/profile" },
    { icon: CreditCard, label: "결제/포인트샵", path: "/home/shop" },
  ];

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["me"],
    queryFn: fetchMe,
  });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  const isActive = (path: string) => {
    if (path === "/home") return pathname === "/home";
    return pathname === path || pathname.startsWith(path + "/");
  };

  return (
    <aside className="w-64 h-full bg-white flex flex-col border-r border-gray-200">
      {/* Logo */}
      <div className="p-6 border-b border-gray-200 flex justify-center lg:justify-start">
        <Image src={logoImg} alt="게으른 가계부 로고" className="rounded-lg w-40 h-auto" />
      </div>

      {/* Profile */}
      <div className="p-6 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {data?.avatarUrl ? (
            <img src={data.avatarUrl} alt="profile" className="w-12 h-12 rounded-full object-cover shadow-sm ring-2 ring-gray-100" />
          ) : (
            <div className="w-12 h-12 bg-gradient-to-br from-sky-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold shadow-sm ring-2 ring-gray-100">
              {data?.nickname?.[0] || "G"}
            </div>
          )}
          <div>
            <div className="font-semibold text-gray-900">{data?.nickname || "Guest"}</div>
            <div className="flex flex-wrap items-center gap-1.5 mt-1">
              <div className="text-[11px] text-sky-600 font-medium bg-sky-50 px-2 py-0.5 rounded-md">Free 플랜</div>
              {data?.pointBalance !== undefined && (
                <div className="text-[11px] text-amber-600 font-bold bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-amber-400" />
                  {data.pointBalance.toLocaleString()} P
                </div>
              )}
            </div>
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
                id={item.path === "/home/transactions" ? "tutorial-nav-ledger-desktop" : undefined}
                onClick={() => {
                  // 임시 등록 후 스텝 3에서 가계부를 누르면 스텝 4로 이동
                  if (item.path === "/home/transactions") {
                    const store = useQuestStore.getState();
                    if (store.activeQuestCode === "FAST_DRAFT" && store.stepIndex === 3) {
                      store.nextStep();
                    }
                  }
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${active
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

      {/* Logout / Notification */}
      <div className="p-4 border-t border-gray-200 flex flex-col gap-2">
        <NotificationBell variant="sidebar" />
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
}
