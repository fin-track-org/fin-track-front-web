export default function ShopPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center">
      <div className="flex flex-col items-center gap-6 max-w-sm">
        {/* Icon */}
        <div className="w-20 h-20 rounded-2xl bg-neutral-100 flex items-center justify-center">
          <svg
            className="w-10 h-10 text-neutral-400"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
            />
          </svg>
        </div>

        {/* Badge */}
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-600 text-xs font-semibold tracking-wide">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          개발 중
        </span>

        {/* Title & Description */}
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold text-neutral-800 tracking-tight">
            상점
          </h1>
          <p className="text-sm text-neutral-400 leading-relaxed">
            포인트를 사용해 다양한 상품을 구매할 수 있는 상점을 준비하고 있어요.
            <br />
            조금만 기다려 주세요!
          </p>
        </div>

        {/* Divider */}
        <div className="w-12 h-px bg-neutral-200" />

        <p className="text-xs text-neutral-300">Coming Soon</p>
      </div>
    </div>
  );
}
