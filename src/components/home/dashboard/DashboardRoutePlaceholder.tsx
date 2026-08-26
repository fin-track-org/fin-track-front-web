/**
 * `useIsMobileViewport()`가 아직 `null`(모바일/데스크톱 판별 전)인 동안 보여주는 최소
 * placeholder. `MobileDeskHome`도 `DesktopDashboard`도 마운트하지 않으므로 이 컴포넌트는
 * 어떤 query도 실행하지 않는다(QA_REVIEW_020 P1-1). 어느 한쪽 레이아웃 모양을 흉내 내면
 * "잘못된 모양이 잠깐 보이는" 문제가 그대로 남으므로, 브랜드 톤(paper/cream)의 중립적인
 * pulse만 보여준다.
 */
export default function DashboardRoutePlaceholder() {
  return (
    <div className="space-y-4 p-1" aria-hidden="true">
      <div className="h-24 animate-pulse rounded-2xl bg-ll-cream" />
      <div className="grid grid-cols-2 gap-3">
        <div className="h-40 animate-pulse rounded-xl bg-ll-cream" />
        <div className="h-40 animate-pulse rounded-xl bg-ll-cream" />
      </div>
      <div className="h-28 animate-pulse rounded-xl bg-ll-cream" />
    </div>
  );
}
