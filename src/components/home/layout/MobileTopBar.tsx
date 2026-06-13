"use client";

import { usePathname } from "next/navigation";
import Image from "next/image";
import logoImg from "@/public/images/logo.jpg";
import NotificationBell from "@/src/components/home/NotificationBell";

export default function MobileTopBar() {
  return (
    <header className="lg:hidden h-14 flex items-center justify-between gap-2 px-4 border-b border-gray-200 bg-white sticky top-0 z-30">
      <div className="flex items-center">
        <Image src={logoImg} alt="게으른 가계부 로고" className="rounded-lg w-24 h-auto" />
      </div>
      <div className="flex items-center gap-4">
        <NotificationBell />
      </div>
    </header>
  );
}
