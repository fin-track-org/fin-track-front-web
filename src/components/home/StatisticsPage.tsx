"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";

import { useStatisticsData } from "@/src/hook/useStatisticsData";
import { useIsMobileViewport } from "@/src/hook/useIsMobileViewport";
import { containsAuthError } from "@/src/lib/statistics/errorPriority";
import MobileStatisticsView from "@/src/components/home/statistics/MobileStatisticsView";
import DesktopStatisticsView from "@/src/components/home/statistics/DesktopStatisticsView";

/**
 * `/home/statistics` 진입점(IMPLEMENTATION_BRIEF_019). 데이터·계산은 `useStatisticsData` 훅
 * 하나로 모으고(모바일·데스크톱이 완전히 같은 query 세트를 쓰므로 `DashboardPage`처럼 트리를
 * 아예 분리할 필요가 없다 — 훅을 한 번만 호출해 그 결과를 두 화면에 그대로 내려준다), 이 컴포넌트는
 * 뷰포트에 따라 `MobileStatisticsView`/`DesktopStatisticsView` 중 하나만 렌더링한다.
 */
export default function StatisticsPage() {
  const router = useRouter();
  const isMobile = useIsMobileViewport();
  const data = useStatisticsData();

  // QA_REVIEW_043 P1-1 — 5개 query 오류를 `a || b || ...`로 합치면 먼저 실패한 일반 오류가 나중에
  // 도착한 AuthError를 가려 로그인 이동이 누락될 수 있다. 배열 전체에서 AuthError 존재 여부를
  // 독립적으로 판단한다(순수 함수라 verify-statistics.ts로 조합 fixture를 고정할 수 있다).
  const hasAuthError = useMemo(
    () =>
      containsAuthError([
        data.summaryQuery.error,
        data.dailyQuery.error,
        data.categoryQuery.error,
        data.budgetQuery.error,
        data.annualQuery.error,
      ]),
    [data.summaryQuery.error, data.dailyQuery.error, data.categoryQuery.error, data.budgetQuery.error, data.annualQuery.error],
  );

  useEffect(() => {
    if (hasAuthError) router.replace("/login");
  }, [hasAuthError, router]);

  // 뷰포트 판별 전에는 어느 트리도 마운트하지 않는다(useIsMobileViewport와 동일한 원칙,
  // DashboardPage.tsx 참고 — 판별 전 데스크톱 트리가 잠깐 마운트되는 걸 막는다).
  if (isMobile === null) return null;

  // 로그인 화면으로 이동하는 중에는 어떤 섹션도 일반 오류 카드로 AuthError를 잠깐이라도
  // 보여주지 않는다(§P1-1 "화면의 부분 오류에는 AuthError를 일반 오류 카드로 노출하지 않는다").
  if (hasAuthError) return null;

  return isMobile ? <MobileStatisticsView {...data} /> : <DesktopStatisticsView {...data} />;
}
