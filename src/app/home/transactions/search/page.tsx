import { Suspense } from "react";
import SearchPage from "@/src/components/home/transactions/SearchPage";

export default function Page() {
  return (
    <Suspense fallback={<div className="p-4 text-center">로딩 중...</div>}>
      <SearchPage />
    </Suspense>
  );
}
