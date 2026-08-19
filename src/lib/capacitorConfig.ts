/**
 * Capacitor 기술검증 appId/커스텀 스킴. `capacitor.config.ts`의 appId와 반드시 같은 값을 유지한다.
 * Android manifest(`android/app/src/main/AndroidManifest.xml`)의 딥링크 intent-filter도
 * 이 값과 동일하게 맞춰져 있어야 한다(IMPLEMENTATION_BRIEF_007 §3).
 *
 * 이 값은 기술검증용 appId다 — 실제 스토어 제출 전 재확정이 필요하다(REPORT_014 §11).
 */
export const CAPACITOR_APP_SCHEME = "com.lazykit.cashbook";

/** Capacitor 앱 전용 OAuth redirect URL. 일반 웹 로그인의 `${origin}/auth/callback`과는 별개다. */
export const CAPACITOR_OAUTH_CALLBACK_URL = `${CAPACITOR_APP_SCHEME}://auth/callback`;
