"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";
import { ToastProvider } from "@/src/hook/useToast";
import ToastContainer from "@/src/components/ui/ToastContainer";
import CapacitorOAuthListener from "@/src/components/auth/CapacitorOAuthListener";

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        {children}
        <ToastContainer />
        {/* 앱 전체에서 1회만 마운트 — 페이지 이동으로 재마운트되지 않아야 딥링크 리스너가 누적되지 않는다. */}
        <CapacitorOAuthListener />
      </ToastProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
