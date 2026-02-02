import { ChevronLeft, ChevronRight } from "lucide-react";

export default function MonthSelector({
  currentMonth,
  onPrev,
  onNext,
}: {
  currentMonth: Date;
  onPrev: () => void;
  onNext: () => void;
}) {
  const monthName = currentMonth.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
  });

  const today = new Date().toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <button
            onClick={onPrev}
            className="cursor-pointer hover:bg-gray-200 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-8 h-8 text-gray-500" />
          </button>
          <h1 className="text-3xl font-bold text-gray-900">{monthName}</h1>
          <button
            onClick={onNext}
            className="cursor-pointer hover:bg-gray-200 rounded-lg transition-colors"
          >
            <ChevronRight className="w-8 h-8 text-gray-500" />
          </button>
        </div>
      </div>
      <div className="flex items-center gap-2 text-gray-500">
        <span>오늘은 {today} 입니다.</span>
      </div>
    </div>
  );
}
