"use client";

import { useEffect, useState } from "react";

/**
 * `lg`(1024px) 미만 여부를 JS로 판단한다. 기존 앱 셸(MobileTopBar/DesktopSidebar/
 * MobileBottomNav)이 전부 Tailwind `lg:` 브레이크포인트(1024px)로 모바일/데스크톱을
 * 나누므로, 홈 대시보드의 모바일/데스크톱 트리 분기도 같은 기준을 따른다
 * (IMPLEMENTATION_BRIEF_010 §2 절대 원칙 3 "lg 이상에서 보존").
 *
 * CSS로 두 트리를 모두 렌더링한 뒤 숨기면 무거운 query·차트가 중복 실행되므로,
 * `DashboardPage`처럼 두 트리 중 하나만 마운트해야 하는 곳에서 이 훅으로 분기한다.
 *
 * QA_REVIEW_020 P1-1: 처음에는 `TutorialSpotlight.tsx`처럼 `false`로 시작했는데, 그러면
 * "판별 전"과 "데스크톱으로 판별됨"을 구분할 수 없어 모바일 기기의 첫 client render에서도
 * 잠깐 데스크톱 쪽 트리가 실제로 마운트됐다(=데스크톱 전용 query가 시작될 수 있었다).
 * 그래서 반환 타입을 `boolean | null`로 바꿔 "아직 판별 전"을 `null`로 명시적으로 구분한다.
 * 호출부(`DashboardPage`)는 `null`인 동안 두 트리 중 어느 쪽도 마운트하지 않아야 한다.
 * `matchMedia`의 `change` 이벤트를 쓰므로 리사이즈뿐 아니라 기기 회전에도 반응한다.
 */
export function useIsMobileViewport(breakpointPx = 1024): boolean | null {
  const [isMobile, setIsMobile] = useState<boolean | null>(null);

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpointPx - 1}px)`);
    const update = () => setIsMobile(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, [breakpointPx]);

  return isMobile;
}

export default useIsMobileViewport;
