const Skeleton = ({ className }: { className?: string }) => (
  <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
);

export default function DashboardSkeleton() {
  return (
    <>
      <div className="space-y-6">
        {/* 0. 월 선택 버튼 */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Skeleton className="w-8 h-8 rounded-lg" />
              <Skeleton className="h-9 w-40" />
              <Skeleton className="w-8 h-8 rounded-lg" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-64" />
          </div>
        </div>

        {/* 1. 공통 요약 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 현재 잔액 */}
          <div className="bg-gray-50 p-6 rounded-xl shadow-sm border border-gray-100">
            <Skeleton className="h-4 w-24 mb-4" />
            <Skeleton className="h-8 w-32 mb-3" />
            <Skeleton className="h-4 w-40" />
          </div>

          {/* 수입 / 지출 */}
          <div className="grid grid-cols-2 gap-4 md:col-span-2">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="bg-gray-50 p-6 rounded-xl shadow-sm border border-gray-100"
              >
                <Skeleton className="h-4 w-28 mb-4" />
                <Skeleton className="h-8 w-32 mb-3" />
                <Skeleton className="h-4 w-36" />
              </div>
            ))}
          </div>
        </div>

        {/* 2. Chart */}
        <div className="flex flex-col md:flex-row gap-6">
          {/* Left - 이번 달 자산 변화 */}
          <div className="md:flex-1 bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <Skeleton className="h-5 w-40 mb-6" />

            {/* 차트 영역 */}
            <div className="h-[300px] flex items-end gap-2">
              {Array.from({ length: 14 }).map((_, i) => (
                <Skeleton key={i} className="w-full rounded-t" />
              ))}
            </div>
          </div>

          {/* Right - 카테고리별 지출 */}
          <section className="md:flex-1 bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            {/* 헤더 */}
            <div className="flex items-center justify-between mb-6">
              <Skeleton className="h-5 w-36" />
              <div className="flex gap-2">
                <Skeleton className="w-8 h-8" />
                <Skeleton className="w-8 h-8" />
              </div>
            </div>

            <div className="flex items-center gap-8">
              {/* 원형 차트 */}
              <Skeleton className="w-[280px] h-[280px] rounded-full" />

              {/* 범례 */}
              <div className="flex-1 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Skeleton className="w-3 h-3 rounded-full" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                    <Skeleton className="h-4 w-20" />
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>

        {/* 3. 예산 및 소비 분석 */}
        <div className="lg:col-span-2 p-6 bg-white rounded-xl shadow-sm border border-gray-100">
          {/* 헤더 */}
          <div className="flex items-center justify-between mb-6">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-12" />
          </div>

          {/* 카드 그리드 */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="p-4 rounded-lg border border-gray-100 bg-gray-50"
              >
                {/* 카테고리 + 상태 */}
                <div className="flex items-center justify-between mb-3">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-10 rounded-full" />
                </div>

                {/* 금액 */}
                <div className="flex justify-between mb-3">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-20" />
                </div>

                {/* 바 */}
                <div className="h-3 bg-gray-200 rounded-full overflow-hidden mb-2">
                  <Skeleton className="h-3 w-2/3 rounded-full" />
                </div>

                {/* 퍼센트 */}
                <Skeleton className="h-3 w-16" />
              </div>
            ))}
          </div>
        </div>

        {/* 최근 거래 내역 테이블 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-16" />
          </div>

          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                {[1, 2, 3, 4, 5].map((i) => (
                  <th key={i} className="px-6 py-3">
                    <Skeleton className="h-3 w-16" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-t border-gray-100">
                  <td className="px-6 py-4">
                    <Skeleton className="h-4 w-20" />
                  </td>
                  <td className="px-6 py-4">
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </td>
                  <td className="px-6 py-4">
                    <Skeleton className="h-4 w-40" />
                  </td>
                  <td className="px-6 py-4">
                    <Skeleton className="h-4 w-20" />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Skeleton className="h-4 w-24 ml-auto" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
