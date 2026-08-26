"use client";

import { Browser } from "@capacitor/browser";
import { createClient } from "@/src/lib/supabase/client";
import { CAPACITOR_OAUTH_CALLBACK_URL } from "@/src/lib/capacitorConfig";

/**
 * Capacitor Android 전용 OAuth 시작(DECISION_006). 일반 웹의 전체 페이지 redirect 대신
 * `skipBrowserRedirect: true`로 인증 URL만 받아 Capacitor Browser(시스템 인증창)로 연다.
 * 앱 복귀와 code 교환은 `CapacitorOAuthListener`가 딥링크로 넘겨받아 처리한다.
 */
export async function startNativeOAuth(provider: "google" | "kakao"): Promise<void> {
  const supabase = createClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: CAPACITOR_OAUTH_CALLBACK_URL,
      skipBrowserRedirect: true,
    },
  });

  if (error) throw error;
  if (!data?.url) throw new Error("인증 URL을 받지 못했습니다.");

  assertIsSupabaseAuthorizeUrl(data.url);
  await Browser.open({ url: data.url });
}

/**
 * 임의의 외부 URL을 Browser 플러그인에 전달하지 않는다(DECISION_006 §3) — Supabase가 반환한
 * HTTPS 인증 URL이 실제로 우리 Supabase 프로젝트 도메인인지까지 확인한다.
 */
function assertIsSupabaseAuthorizeUrl(urlString: string): void {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error("Supabase URL이 설정되지 않았습니다.");
  }

  let target: URL;
  let expected: URL;
  try {
    target = new URL(urlString);
    expected = new URL(supabaseUrl);
  } catch {
    throw new Error("인증 URL 형식이 올바르지 않습니다.");
  }

  if (target.protocol !== "https:" || target.hostname !== expected.hostname) {
    throw new Error("인증 URL이 예상한 Supabase 도메인이 아닙니다.");
  }
}
