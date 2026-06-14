"use client";

import { usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import logoImg from "@/public/images/logo.jpg";
import NotificationBell from "@/src/components/home/NotificationBell";
import { useQuery } from "@tanstack/react-query";
import { fetchMe } from "@/src/lib/api/userApi";

export default function MobileTopBar() {
  const { data } = useQuery({
    queryKey: ["me"],
    queryFn: fetchMe,
  });

  return (
    <header className="lg:hidden h-14 flex items-center justify-between gap-2 px-4 border-b border-gray-200 bg-white sticky top-0 z-30">
      <div className="flex items-center gap-2.5">
        <Link href="/home/profile" className="flex items-center gap-2.5">
          {data?.avatarUrl ? (
            <img src={data.avatarUrl} alt="profile" className="w-8 h-8 rounded-full object-cover shadow-sm ring-1 ring-gray-200" />
          ) : (
            <div className="w-8 h-8 bg-gradient-to-br from-sky-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-semibold shadow-sm">
              {data?.nickname?.[0] || "G"}
            </div>
          )}
          <span className="font-bold text-gray-800 text-sm tracking-tight">{data?.nickname || "Guest"}</span>
        </Link>
      </div>
      <div className="flex items-center gap-3">
        {data?.pointBalance !== undefined && (
          <Link href="/home/shop" className="text-[11px] text-amber-600 font-bold bg-amber-50 hover:bg-amber-100 border border-amber-100 px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-colors">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            {data.pointBalance.toLocaleString()} P
          </Link>
        )}
        <NotificationBell />
      </div>
    </header>
  );
}
