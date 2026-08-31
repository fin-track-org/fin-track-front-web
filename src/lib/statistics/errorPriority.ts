/**
 * `/home/statistics`는 독립된 query 5개(summary/daily/category/budget/annual)를 동시에 갖는다
 * (IMPLEMENTATION_BRIEF_019 §12 "섹션별로 query 상태를 분리"). 세션 만료(`AuthError`)로 이동해야
 * 하는지 판단할 때 `a || b || c || d || e`처럼 첫 번째 truthy 오류만 보면, 먼저 실패한 일반
 * 오류(예: category 네트워크 오류)가 나중에 도착한 `AuthError`를 가려 `/login` 이동이 누락될 수
 * 있다(QA_REVIEW_043 P1-1). 그래서 "여러 오류 중 인증 오류가 하나라도 있는가"를 배열 전체에서
 * 독립적으로 판단하는 순수 함수로 분리했다.
 *
 * `AuthError` 클래스를 직접 import하지 않고 `error.name === "AuthError"`로 판별한다 —
 * 이 파일은 `scripts/verify-statistics.ts`(Node 네이티브 TS 실행, 경로 alias·확장자 없는 상대
 * import를 해석하지 못함)와 실제 Next.js 앱(tsc `moduleResolution: "bundler"`, `.ts`/`.js`
 * 확장자 명시 import를 거부) 양쪽에서 그대로 import되므로, 두 실행 환경 모두와 충돌하지 않는
 * 다른 lib 파일 import 자체를 만들지 않는 편이 안전하다. `src/lib/api/authError.ts`의
 * `AuthError`는 항상 `this.name = "AuthError"`를 생성자에서 설정하므로 이 판별은 안전하다.
 */
export function containsAuthError(errors: ReadonlyArray<unknown>): boolean {
  return errors.some((error) => error instanceof Error && error.name === "AuthError");
}
