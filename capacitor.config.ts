import type { CapacitorConfig } from '@capacitor/cli';

/**
 * ⚠️ 기술검증(IMPLEMENTATION_BRIEF_006) 전용 설정이다. 운영 배포 구성이 아니다.
 *
 * 원격 테스트 서버 URL은 저장소에 하드코딩하지 않는다(브리프 §3). 셸 환경변수
 * `CAPACITOR_SERVER_URL`로 주입해야 하며, 값이 없으면 `server` 자체를 비워 Capacitor
 * CLI가 로컬 `webDir`(정적 export를 하지 않으므로 실질적으로 빈 화면)을 로드하게 둔다 —
 * 임의 URL을 대신 채워 넣지 않는다.
 *
 *   CAPACITOR_SERVER_URL="https://<test-server>" npx cap sync android
 *
 * URL은 반드시 HTTPS여야 한다. HTTP cleartext는 허용하지 않는다(브리프 §3).
 */
const serverUrl = process.env.CAPACITOR_SERVER_URL;

if (serverUrl && !serverUrl.startsWith('https://')) {
  throw new Error(
    `CAPACITOR_SERVER_URL은 HTTPS여야 합니다(cleartext 비허용). 입력값: ${serverUrl}`
  );
}

const config: CapacitorConfig = {
  // 브리프 권장값 "com.lazy-kit.cashbook"은 Java 패키지 규칙(각 세그먼트는 영문자로 시작하는
  // 영숫자/밑줄만 허용, 하이픈 불가)에 위배돼 `cap add android`가 그대로 거부했다. 도메인
  // `lazy-kit.com`의 하이픈만 제거해 최소 변경으로 "com.lazykit.cashbook"을 대신 썼다.
  // 실제 스토어 제출 시점에는 조직이 최종 appId를 다시 확정해야 한다(이번 기술검증 범위 밖).
  appId: 'com.lazykit.cashbook',
  appName: '게으른 가계부',
  // Capacitor CLI는 webDir에 최소 index.html이 있어야 `cap add`/`cap sync`가 통과한다.
  // 실제 Next.js `public/`(아이콘·manifest 등 운영 정적 자산이 있는 폴더)을 건드리지 않기 위해
  // 전용 플레이스홀더 폴더를 따로 뒀다 — Decision 005 §4의 "1) 원격 서버 로드 유지" 방식에서는
  // 이 폴더 내용이 실제로 로드되지 않는다(server.url이 있으면 그 원격 URL을 대신 로드한다).
  webDir: 'capacitor-webdir-placeholder',
  server: serverUrl
    ? {
        url: serverUrl,
        cleartext: false,
        androidScheme: 'https',
      }
    : undefined,
};

export default config;
