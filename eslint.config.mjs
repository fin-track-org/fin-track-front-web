import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // 네이티브 Android 프로젝트(Capacitor) — Java/XML/Gradle 산출물이라 이 JS/TS 설정으로 검사하지 않는다.
    // 특히 android/app/build/**의 Gradle 빌드 산출물(예: 번들된 native-bridge.js)이 검사 대상에
    // 걸리면 우리 코드와 무관한 대량의 경고가 lint 기준선에 섞여 들어온다.
    "android/**",
  ]),
]);

export default eslintConfig;
