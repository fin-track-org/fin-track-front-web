import type { CapacitorConfig } from '@capacitor/cli';

/**
 * 원격 테스트/배포 서버 URL은 저장소에 하드코딩하지 않는다. 셸 환경변수 `CAPACITOR_SERVER_URL`로
 * origin만 주입한다 — path·query·hash가 섞여 들어와도 무시하고 origin만 취해 WebView 시작 주소를
 * `<origin>/welcome`로 정규화한다(IMPLEMENTATION_BRIEF_008 §2). 값이 없으면 `server` 자체를
 * 비워 Capacitor CLI가 로컬 `webDir`(플레이스홀더)을 로드하게 둔다.
 *
 *   CAPACITOR_SERVER_URL="https://<origin>" npx cap sync android
 *
 * 이 변경은 Android Capacitor 시작 주소에만 영향을 준다. `public/manifest.json`의
 * `start_url`과 웹 `/` 랜딩은 별개이며 이 파일에서 건드리지 않는다.
 */
const rawServerUrl = process.env.CAPACITOR_SERVER_URL;

/** HTTPS를 강제하고, 인증정보가 섞인 URL을 거부하고, origin만 남겨 `/welcome`을 붙인다. */
function resolveStartUrl(input: string): string {
  let parsed: URL;
  try {
    parsed = new URL(input);
  } catch {
    throw new Error(`CAPACITOR_SERVER_URL 형식이 올바르지 않습니다. 입력값: ${input}`);
  }

  if (parsed.protocol !== 'https:') {
    throw new Error(
      `CAPACITOR_SERVER_URL은 HTTPS여야 합니다(cleartext 비허용). 입력값: ${input}`
    );
  }

  if (parsed.username || parsed.password) {
    throw new Error('CAPACITOR_SERVER_URL에 username/password를 포함할 수 없습니다.');
  }

  return `${parsed.origin}/welcome`;
}

const config: CapacitorConfig = {
  // 브리프 권장값 "com.lazy-kit.cashbook"은 Java 패키지 규칙(하이픈 불가)에 위배돼
  // "com.lazykit.cashbook"으로 대체했다(IMPLEMENTATION_REPORT_014 §3). Decision 007 §3에
  // 따라 스토어 제출 전 재확정이 필요하다 — 이번 작업에서는 변경하지 않는다.
  appId: 'com.lazykit.cashbook',
  appName: '게으른 가계부',
  // Capacitor CLI는 webDir에 최소 index.html이 있어야 `cap add`/`cap sync`가 통과한다.
  // 실제 Next.js `public/`(아이콘·manifest 등 운영 정적 자산이 있는 폴더)을 건드리지 않기 위해
  // 전용 플레이스홀더 폴더를 따로 뒀다 — `server.url`이 있으면 이 폴더 내용은 로드되지 않는다.
  webDir: 'capacitor-webdir-placeholder',
  server: rawServerUrl
    ? {
        url: resolveStartUrl(rawServerUrl),
        cleartext: false,
        androidScheme: 'https',
      }
    : undefined,
};

export default config;
