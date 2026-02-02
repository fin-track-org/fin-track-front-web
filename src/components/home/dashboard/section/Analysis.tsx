import { TrendingUp } from "lucide-react";

export default function Analysis() {
  return (
    <>
      <section className="bg-linear-to-br from-amber-50 via-orange-50 to-amber-100 rounded-xl p-6 shadow-sm border border-amber-200">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-10 h-10 bg-linear-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center shadow-md">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">소비 분석</h3>
        </div>
        <div className="space-y-4">
          <div className="bg-white/70 rounded-lg p-4 border border-amber-200">
            <p className="text-sm text-gray-700 leading-relaxed">
              이번 달 <span className="font-semibold text-amber-700">쇼핑</span>{" "}
              카테고리 지출이
              <span className="font-semibold text-amber-700">
                {" "}
                예산을 16% 초과
              </span>
              했습니다.
            </p>
          </div>
          <div className="bg-white/70 rounded-lg p-4 border border-amber-200">
            <p className="text-sm text-gray-700 leading-relaxed">
              <span className="font-semibold text-blue-700">식비</span>는 지난달
              대비
              <span className="font-semibold text-red-600"> 12.5% 증가</span>
              했습니다.
            </p>
          </div>
          <div className="bg-white/70 rounded-lg p-4 border border-amber-200">
            <p className="text-sm text-gray-700 leading-relaxed">
              현재 저축률은{" "}
              <span className="font-semibold text-green-700">25.3%</span>로 목표
              30%에 근접하고 있습니다.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
