#!/usr/bin/env node
/**
 * QA_REVIEW_018 P1-1·P1-2 대응 — `@capacitor/assets`(v3.0.5) 실행 이후에 실행하는
 * 후처리 스크립트. 이 스크립트가 `mipmap-anydpi-v26/ic_launcher.xml`(round 포함)의
 * 최종 형태와 adaptive foreground/monochrome 레이어의 실제 픽셀을 결정한다.
 *
 * P1-1(배경 inset 금지): `@capacitor/assets`는 background에도 foreground와 동일하게
 * `<inset 16.7%>`를 적용해, InsetDrawable 바깥 여백이 투명해질 위험이 있었다(런처 구현에
 * 따라 마스크 가장자리에 예기치 않은 색/테두리가 보일 수 있음). background를 비트맵이 아니라
 * `@color/ll_paper` 색상 drawable로 직접 연결해 inset 자체를 없앤다 — 전체 마스크 영역이
 * 항상 불투명 paper로 채워진다.
 *
 * P1-2(해상도): `@capacitor/assets`의 adaptive foreground/background 생성 로직은
 * (버전 3.0.5 기준) legacy 아이콘 밀도(mdpi 48px~xxxhdpi 192px)로 PNG를 만든다 — adaptive
 * icon 레이어 표준 밀도(mdpi 108px~xxxhdpi 432px)보다 작다. foreground/monochrome은 이
 * 스크립트가 1024px 마스터(`assets/android-brand/icon-foreground.png`,
 * `icon-monochrome.png`)에서 Android 표준 밀도로 직접 다시 만든다 — 도구가 만든 48~192px
 * PNG를 확대하지 않는다. `windowSplashScreenAnimatedIcon`(styles.xml)도 같은
 * `@mipmap/ic_launcher_foreground`를 참조하므로 이 레이어를 고해상도로 바꾸면 cold-start
 * 스플래시 아이콘도 함께 선명해진다.
 *
 * background는 색상 drawable로 바뀌므로 `@capacitor/assets`가 만든 각 밀도 폴더의
 * `ic_launcher_background.png`는 더 이상 참조되지 않는다 — 이 스크립트가 함께 제거한다.
 *
 * 실행 순서(재현용, cwd: ftweb/):
 *   node scripts/generate-android-brand-sources.mjs
 *   npx capacitor-assets generate --android --assetPath assets/android-brand --androidProject android
 *   node scripts/generate-android-adaptive-layers.mjs   ← 이 스크립트. capacitor-assets를
 *                                                          다시 실행할 때마다 반드시 그 다음에
 *                                                          다시 실행해야 한다(그러지 않으면
 *                                                          foreground/monochrome이 다시
 *                                                          48~192px·구형 XML로 되돌아간다).
 *   npx cap sync android
 */

import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const MASTERS = path.join(ROOT, 'assets/android-brand');
const FOREGROUND_MASTER = path.join(MASTERS, 'icon-foreground.png');
const MONOCHROME_MASTER = path.join(MASTERS, 'icon-monochrome.png');
const RES_DIR = path.join(ROOT, 'android/app/src/main/res');

// Android adaptive icon 레이어 표준 밀도별 픽셀 크기(mdpi=108dp 기준 배율).
// @capacitor/assets 자체의 dist/platforms/android/assets.js "adaptive-icon" 템플릿과 동일값.
const DENSITY_SIZES = {
  ldpi: 81,
  mdpi: 108,
  hdpi: 162,
  xhdpi: 216,
  xxhdpi: 324,
  xxxhdpi: 432,
};

const ADAPTIVE_ICON_XML_FILES = ['ic_launcher.xml', 'ic_launcher_round.xml'];

const ADAPTIVE_ICON_XML = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ll_paper" />
    <foreground>
        <inset android:drawable="@mipmap/ic_launcher_foreground" android:inset="16.7%" />
    </foreground>
    <monochrome>
        <inset android:drawable="@mipmap/ic_launcher_monochrome" android:inset="16.7%" />
    </monochrome>
</adaptive-icon>
`;

async function writeLayerMipmaps(masterPath, filename) {
  const written = [];
  for (const [density, size] of Object.entries(DENSITY_SIZES)) {
    const dir = path.join(RES_DIR, `mipmap-${density}`);
    await mkdir(dir, { recursive: true });
    const dest = path.join(dir, filename);
    await sharp(masterPath).resize(size, size).png().toFile(dest);
    written.push({ density, size, dest: path.relative(ROOT, dest) });
  }
  return written;
}

async function removeBackgroundBitmaps() {
  const removed = [];
  for (const density of Object.keys(DENSITY_SIZES)) {
    const dest = path.join(RES_DIR, `mipmap-${density}`, 'ic_launcher_background.png');
    await rm(dest, { force: true });
    removed.push(path.relative(ROOT, dest));
  }
  return removed;
}

async function writeAdaptiveIconXml() {
  const written = [];
  for (const filename of ADAPTIVE_ICON_XML_FILES) {
    const filePath = path.join(RES_DIR, 'mipmap-anydpi-v26', filename);
    await writeFile(filePath, ADAPTIVE_ICON_XML, 'utf8');
    written.push(path.relative(ROOT, filePath));
  }
  return written;
}

async function main() {
  const fg = await writeLayerMipmaps(FOREGROUND_MASTER, 'ic_launcher_foreground.png');
  for (const f of fg) console.log('WROTE', f.dest, `${f.size}x${f.size}`);

  const mono = await writeLayerMipmaps(MONOCHROME_MASTER, 'ic_launcher_monochrome.png');
  for (const f of mono) console.log('WROTE', f.dest, `${f.size}x${f.size}`);

  const removed = await removeBackgroundBitmaps();
  for (const r of removed) console.log('REMOVED(무참조, 존재했다면)', r);

  const xmlFiles = await writeAdaptiveIconXml();
  for (const f of xmlFiles) console.log('WROTE', f);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
