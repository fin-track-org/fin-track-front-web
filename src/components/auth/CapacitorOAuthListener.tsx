"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Capacitor } from "@capacitor/core";
import { App, type URLOpenListenerEvent } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { createClient } from "@/src/lib/supabase/client";
import { parseCapacitorOAuthCallbackUrl } from "@/src/lib/auth/capacitorOAuthCallback";
import { buildIdentitySyncPayload } from "@/src/lib/auth/identitySyncPayload";
import { getOAuthCallbackReasonMessage } from "@/src/lib/authErrorMessages";
import { useToast } from "@/src/hook/useToast";

const SPRING_BOOT_URL = process.env.NEXT_PUBLIC_SPRING_BOOT_URL!;

/**
 * 앱 전체에서 딱 한 번만 마운트되는 Capacitor OAuth 딥링크 수신기(IMPLEMENTATION_BRIEF_007 §5).
 * `Providers`(루트)에서 렌더링해 페이지 이동으로 재마운트되지 않게 한다.
 * cold start(`App.getLaunchUrl`)와 warm start(`appUrlOpen`)가 같은 URL을 중복 전달해도
 * code 교환은 한 번만 시도한다(§5 "listener가 같은 URL을 중복 수신해도...").
 */
export default function CapacitorOAuthListener() {
  const router = useRouter();
  const { toast } = useToast();

  // 렌더와 무관하게 값을 유지해야 하므로 ref로 관리한다. state로 만들면 각 처리마다
  // 리렌더가 일어나고, effect 의존성에 router/toast를 넣으면 리스너가 불필요하게 재등록된다.
  const processingRef = useRef(false);
  const handledUrlsRef = useRef<Set<string>>(new Set());
  const routerRef = useRef(router);
  const toastRef = useRef(toast);
  routerRef.current = router;
  toastRef.current = toast;

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const handleUrl = async (urlString: string) => {
      const parsed = parseCapacitorOAuthCallbackUrl(urlString);
      if (!parsed) return; // 우리 OAuth 콜백이 아니면 무시(scheme/host/path 불일치).

      if (handledUrlsRef.current.has(urlString) || processingRef.current) return;
      handledUrlsRef.current.add(urlString);
      processingRef.current = true;

      try {
        await Browser.close().catch(() => {
          // 이미 닫혀 있거나 브라우저 플러그인이 다룰 대상이 없는 경우 — 무시해도 안전하다.
        });

        if (parsed.hasErrorSignal) {
          const message = getOAuthCallbackReasonMessage("oauth_failed");
          if (message) toastRef.current.error(message);
          return;
        }

        if (!parsed.code) {
          // code도 error도 없으면 사용자가 시스템 인증창을 스스로 닫은 것으로 본다(기존 웹과 동일 기준).
          // 이 경우 오류 문구를 띄우지 않는다(getOAuthCallbackReasonMessage("oauth_cancelled") === null).
          return;
        }

        const supabase = createClient();
        const { data, error } = await supabase.auth.exchangeCodeForSession(parsed.code);

        if (error || !data.session || !data.user) {
          console.error("[capacitor-oauth] code 교환 실패:", error?.message);
          const message = getOAuthCallbackReasonMessage("session_failed");
          if (message) toastRef.current.error(message);
          return;
        }

        try {
          const payload = buildIdentitySyncPayload(data.user);
          await fetch(`${SPRING_BOOT_URL}/api/v1/users/me`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${data.session.access_token}`,
            },
            body: JSON.stringify(payload),
          });
        } catch (syncError) {
          // 동기화 실패는 로그인 자체를 취소하지 않는다 — 민감정보 없는 경고만 남긴다(DECISION_006 §4).
          console.warn("[capacitor-oauth] 사용자 동기화 실패(로그인은 계속 진행):", syncError);
        }

        routerRef.current.replace("/home");
      } finally {
        processingRef.current = false;
      }
    };

    // cold start: 앱이 완전히 종료된 상태에서 딥링크로 실행된 경우(App.getLaunchUrl 공식 API).
    App.getLaunchUrl().then((result) => {
      if (result?.url) handleUrl(result.url);
    });

    // warm start: 앱이 background에 있다가 딥링크로 재개된 경우.
    const listenerHandlePromise = App.addListener("appUrlOpen", (event: URLOpenListenerEvent) => {
      handleUrl(event.url);
    });

    return () => {
      listenerHandlePromise.then((handle) => handle.remove());
    };
    // router/toast는 ref로 최신값을 참조하므로 effect 안에서 직접 쓰지 않는다 — 마운트 시 한 번만 등록한다.
  }, []);

  return null;
}
