const Skeleton = ({ className }: { className?: string }) => (
  <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
);

export default function TransactionPageSkeleton() {
  return (
    <section className="space-y-4 md:space-y-6 animate-pulse">
      {/* 상단: 월 선택 + 버튼 */}
      <div className="flex items-center justify-between">
        <div>
          <div className="mb-4">
            <Skeleton className="h-9 w-60" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-64" />
          </div>
        </div>

        <Skeleton className="h-9 w-32" />
      </div>

      {/* 검색 / 필터 박스 */}
      <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm md:p-6">
        <div className="flex flex-col gap-3">
          {/* 검색창 */}
          <div className="h-12 w-full rounded-lg bg-gray-200" />

          {/* 모바일 카테고리 select */}
          <div className="md:hidden space-y-2">
            <div className="h-4 w-16 rounded bg-gray-200" />
            <div className="h-10 w-full rounded-lg bg-gray-200" />
          </div>

          {/* 데스크탑 카테고리 칩 */}
          <div className="hidden md:flex flex-wrap gap-2">
            <div className="h-10 w-16 rounded-lg bg-gray-200" />
            <div className="h-10 w-20 rounded-lg bg-gray-200" />
            <div className="h-10 w-24 rounded-lg bg-gray-200" />
            <div className="h-10 w-20 rounded-lg bg-gray-200" />
            <div className="h-10 w-28 rounded-lg bg-gray-200" />
            <div className="h-10 w-16 rounded-lg bg-gray-200" />
            <div className="h-10 w-24 rounded-lg bg-gray-200" />
          </div>
        </div>
      </div>

      {/* 테이블 영역 */}
      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        {/* 테이블 헤더 */}
        <div className="hidden grid-cols-6 gap-4 border-b bg-gray-50 border-gray-100 px-6 py-3 md:grid">
          <div className="h-4 w-8 rounded bg-gray-200" />
          <div className="h-4 w-16 rounded bg-gray-200" />
          <div className="h-4 w-8 rounded bg-gray-200" />
          <div className="h-4 w-16 rounded bg-gray-200" />
          <div className="h-4 w-8 rounded bg-gray-200" />
          <div className="h-4 w-16" />
        </div>

        {/* 데스크탑 행 */}
        <div className="hidden md:block">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="grid grid-cols-6 items-center gap-4 border-b border-gray-100 px-6 py-4 last:border-b-0"
            >
              <div className="h-4 w-20 rounded bg-gray-200" />
              <div className="h-4 w-24 rounded bg-gray-200" />
              <div className="h-4 w-32 rounded bg-gray-200" />
              <div className="h-4 w-20 rounded bg-gray-200" />
              <div className="h-4 w-20 rounded bg-gray-200" />
              <div className="ml-auto flex gap-2">
                <div className="h-8 w-14 rounded-lg bg-gray-200" />
                <div className="h-8 w-14 rounded-lg bg-gray-200" />
              </div>
            </div>
          ))}
        </div>

        {/* 모바일 카드형 목록 */}
        <div className="md:hidden divide-y divide-gray-100">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="space-y-3 px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2">
                  <div className="h-4 w-24 rounded bg-gray-200" />
                  <div className="h-4 w-16 rounded bg-gray-200" />
                </div>
                <div className="h-4 w-20 rounded bg-gray-200" />
              </div>

              <div className="h-4 w-32 rounded bg-gray-200" />

              <div className="flex gap-2">
                <div className="h-8 w-14 rounded-lg bg-gray-200" />
                <div className="h-8 w-14 rounded-lg bg-gray-200" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
