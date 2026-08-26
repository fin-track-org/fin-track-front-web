"use client";

import { useIsMobileViewport } from "@/src/hook/useIsMobileViewport";
import MobileDeskHome from "./mobile-desk/MobileDeskHome";
import DesktopDashboard from "./DesktopDashboard";
import DashboardRoutePlaceholder from "./DashboardRoutePlaceholder";

/**
 * `/home`의 진입점. lg(1024px) 미만이면 책상형 모바일 홈, 이상이면 기존 데스크톱
 * 대시보드를 렌더링한다(IMPLEMENTATION_BRIEF_010 §2 절대 원칙 3, §4).
 *
 * 두 화면은 서로 다른(대부분 겹치지 않는) query 세트를 쓰므로, 하나의 컴포넌트 안에서
 * `isMobile`로 훅 호출을 건너뛸 수 없다(React Hooks 규칙). 그래서 각 화면을 완전히 분리된
 * 컴포넌트(`MobileDeskHome`/`DesktopDashboard`)로 두고 이 파일은 어느 쪽을 마운트할지만
 * 결정한다 — 두 트리를 모두 렌더링한 뒤 CSS로 한쪽만 숨기면 무거운 dashboardSummary/daily/
 * pie 쿼리와 recharts가 모바일에서도 그대로 실행돼버리기 때문이다.
 *
 * QA_REVIEW_020 P1-1: `useIsMobileViewport()`가 아직 판별 전(`null`)일 때 여기서 둘 중
 * 하나를 "기본값"으로 골라 마운트하면, 그 기본값이 실제 기기와 반대인 경우 잘못된 쪽
 * query가 잠깐 시작돼버린다. 그래서 판별 전에는 어느 쪽도 마운트하지 않고 query 없는
 * `DashboardRoutePlaceholder`만 보여준다.
 */
export default function DashboardPage() {
  const isMobile = useIsMobileViewport();
  if (isMobile === null) return <DashboardRoutePlaceholder />;
  return isMobile ? <MobileDeskHome /> : <DesktopDashboard />;
}
