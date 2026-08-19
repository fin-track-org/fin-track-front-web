/**
 * 빠른 기록을 암시하는 장식용 영수증 카드(DECISION_004 §3, design-package/app-welcome-mobile.html).
 * 입력 필드·버튼이 아니며 스크린리더에서 완전히 제외한다.
 */
export function ReceiptDecoration() {
  return (
    <div
      aria-hidden="true"
      className="relative mt-7 w-[min(286px,100%)] -rotate-1 rounded-t-[13px] rounded-b-lg border border-ll-ink/10 bg-white px-[17px] pb-[18px] pt-[15px] text-left shadow-[4px_5px_0_rgba(32,40,58,0.07)]"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-[22px] font-extrabold tabular-nums text-ll-ink">12,000원</span>
        <span className="rotate-[5deg] rounded-full border-2 border-ll-tomato px-[7px] py-[3px] text-[10px] font-extrabold text-ll-tomato">
          적어둠
        </span>
      </div>
      <div className="my-[11px] border-t border-dashed border-ll-ink/20" />
      <p className="text-xs text-ll-pencil">점심 · 정리는 나중에</p>
      {/* 영수증 하단 찢어진 종이 느낌 — 시안(app-welcome-mobile.html)의 톱니 그라디언트를 그대로 옮겼다. */}
      <div
        className="absolute inset-x-0 -bottom-[7px] h-2"
        style={{ background: "linear-gradient(135deg, transparent 5px, #fff 0) 0 0/10px 8px repeat-x" }}
      />
    </div>
  );
}

export default ReceiptDecoration;
