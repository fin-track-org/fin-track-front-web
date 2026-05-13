export default function CommunityPage() {
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
              d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
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
            커뮤니티
          </h1>
          <p className="text-sm text-neutral-400 leading-relaxed">
            함께 소비 습관을 나누는 공간을 준비하고 있어요.
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
