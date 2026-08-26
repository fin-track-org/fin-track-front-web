import { CAPACITOR_APP_SCHEME } from "@/src/lib/capacitorConfig";

export interface ParsedCapacitorOAuthCallback {
  code: string | null;
  /** provider가 code 없이 error/error_code만 돌려준 경우(취소가 아니라 실제 실패). */
  hasErrorSignal: boolean;
}

/**
 * Capacitor 앱 딥링크 URL이 우리 OAuth 콜백(scheme=com.lazykit.cashbook, host=auth,
 * pathname=/callback)과 정확히 일치할 때만 파싱 결과를 돌려준다(DECISION_006 §3).
 * scheme·host·path 중 하나라도 다르면 null — 앱이 받을 수 있는 다른 딥링크(향후 확장)를
 * 이 콜백 처리기가 실수로 삼키지 않도록 한다.
 */
export function parseCapacitorOAuthCallbackUrl(urlString: string): ParsedCapacitorOAuthCallback | null {
  let url: URL;
  try {
    url = new URL(urlString);
  } catch {
    return null;
  }

  if (url.protocol !== `${CAPACITOR_APP_SCHEME}:`) return null;
  if (url.hostname !== "auth") return null;
  if (url.pathname !== "/callback") return null;

  return {
    code: url.searchParams.get("code"),
    hasErrorSignal: url.searchParams.has("error") || url.searchParams.has("error_code"),
  };
}
