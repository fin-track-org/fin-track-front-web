#!/usr/bin/env node
/**
 * Android 브랜드 마스터 생성 스크립트 (IMPLEMENTATION_BRIEF_009 §2)
 *
 * `ftweb/public/images/panda-face-transparent.png`(540×540)를 기계적으로 합성·리사이즈해
 * `@capacitor/assets`가 소비할 1024px(아이콘)/2732px(스플래시) 마스터를 재현 가능하게 만든다.
 * 손으로 편집한 최종 PNG를 커밋하지 않고, 이 스크립트를 재실행하면 항상 같은 결과가 나온다.
 *
 * 실행: `node scripts/generate-android-brand-sources.mjs` (cwd: ftweb/)
 *
 * 왜 icon-foreground의 halo/얼굴이 icon-only보다 훨씬 큰가 (DECISION_008 §3의 610/510px과 다름):
 *   `@capacitor/assets`(v3.0.5)의 Android adaptive icon 생성기는 우리가 준 icon-foreground.png를
 *   그대로 mipmap에 저장한 뒤, `mipmap-anydpi-v26/ic_launcher.xml`에서 항상
 *   `<inset android:inset="16.7%">`로 감싼다(도구 소스: dist/platforms/android/index.js
 *   `_generateAdaptiveIconForeground`). 즉 화면에 실제로 보이는 크기는 우리가 준 원본의
 *   (1 - 2*0.167) ≈ 66.6%로 자동 축소된다. icon-only.png(legacy/round)는 이 inset을 거치지
 *   않고 그대로 쓰인다. 두 아이콘이 "동일한 시각 크기"로 보이도록(DECISION_008 §3) icon-only는
 *   DECISION_008의 610/510px 값을 그대로 쓰고, icon-foreground는 그 값을 1/0.666배로 키워
 *   inset 이후 같은 크기로 보이게 보정한다. 최종 미리보기에서 잘림/과소크기를 확인해 필요하면
 *   FOREGROUND_INSET_COMPENSATION만 조정한다.
 */

import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const SOURCE_PANDA = path.join(ROOT, 'public/images/panda-face-transparent.png');
const OUT_DIR = path.join(ROOT, 'assets/android-brand');

const PAPER = '#FFFAF0';
const BUTTER = '#F5CA52';
const MONOCHROME_FILL = '#000000'; // 실제 색은 런처가 테마 색으로 덮어씀

const ICON_CANVAS = 1024;
const SPLASH_CANVAS = 2732;

// DECISION_008 §3 — 1024px 마스터 기준 halo/얼굴 크기(범위 중앙값)
const NOMINAL_HALO = 610;
const NOMINAL_FACE = 510;

// @capacitor/assets가 adaptive icon foreground/background에 자동 적용하는 inset 비율(도구 고정값)
const ADAPTIVE_AUTO_INSET_RATIO = 0.167;
const FOREGROUND_INSET_COMPENSATION = 1 / (1 - 2 * ADAPTIVE_AUTO_INSET_RATIO); // ≈ 1.501

const FOREGROUND_HALO = Math.round(NOMINAL_HALO * FOREGROUND_INSET_COMPENSATION); // ≈ 916
const FOREGROUND_FACE = Math.round(NOMINAL_FACE * FOREGROUND_INSET_COMPENSATION); // ≈ 766

// 스플래시: 결합 폭(halo 지름 기준)이 2732px의 약 20~24% (DECISION_008 §3)
const SPLASH_GROUP_TARGET_RATIO = 0.22;
const SPLASH_GROUP_TARGET_WIDTH = Math.round(SPLASH_CANVAS * SPLASH_GROUP_TARGET_RATIO);

/**
 * 판다 원본은 배경이 halo로 채워지는 것을 전제로 한 라인아트다 — 얼굴 내부(털) 영역이 그
 * 자체로는 거의 투명하고, 귀·비니·눈·윤곽선만 불투명하다. 이 alpha를 themed icon monochrome
 * 실루엣으로 그대로 쓰면 윤곽선만 가늘게 남아 작은 크기에서 "판다 머리" 형태를 알아보기 어렵다
 * (DECISION_008 §3.4 "작은 themed icon에서도 판다 머리·귀가 식별 가능해야 함"에 위배).
 * 그래서 테두리에서 도달 가능한 투명 영역(바깥쪽)만 "배경"으로 간주하는 flood fill로 윤곽선
 * 안쪽 구멍(얼굴 내부)까지 채운 굵은 실루엣을 만든다.
 */
function floodFillOutsideMask(alpha, width, height, threshold = 16) {
  const opaque = new Uint8Array(width * height);
  for (let i = 0; i < opaque.length; i++) opaque[i] = alpha[i] > threshold ? 1 : 0;

  const outside = new Uint8Array(width * height); // 1 = 테두리에서 도달 가능한 투명 영역
  const stack = [];
  const idx = (x, y) => y * width + x;
  const tryPush = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const i = idx(x, y);
    if (opaque[i] === 0 && outside[i] === 0) {
      outside[i] = 1;
      stack.push(i);
    }
  };
  for (let x = 0; x < width; x++) {
    tryPush(x, 0);
    tryPush(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    tryPush(0, y);
    tryPush(width - 1, y);
  }
  while (stack.length > 0) {
    const i = stack.pop();
    const x = i % width;
    const y = (i / width) | 0;
    tryPush(x + 1, y);
    tryPush(x - 1, y);
    tryPush(x, y + 1);
    tryPush(x, y - 1);
  }

  const filled = Buffer.alloc(width * height);
  for (let i = 0; i < filled.length; i++) filled[i] = outside[i] === 1 ? 0 : 255;
  return filled;
}

/** 둥글지만 완전한 정원은 아닌 halo(superellipse/squircle) SVG path. n=4. */
function squirclePathD(cx, cy, r, n = 4, points = 160) {
  const parts = [];
  for (let i = 0; i <= points; i++) {
    const theta = (i / points) * 2 * Math.PI;
    const ct = Math.cos(theta);
    const st = Math.sin(theta);
    const x = cx + r * Math.sign(ct) * Math.abs(ct) ** (2 / n);
    const y = cy + r * Math.sign(st) * Math.abs(st) ** (2 / n);
    parts.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`);
  }
  parts.push('Z');
  return parts.join(' ');
}

async function haloBuffer(canvas, diameter, color) {
  const r = diameter / 2;
  const cx = canvas / 2;
  const cy = canvas / 2;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${canvas}" height="${canvas}">
    <path d="${squirclePathD(cx, cy, r)}" fill="${color}" />
  </svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

/** 판다 원본을 트리밍 후 targetSize(긴 변 기준)로 리사이즈한 alpha PNG 버퍼를 반환한다. */
async function pandaBuffer(targetSize) {
  return sharp(SOURCE_PANDA)
    .trim() // 원본 540px 캔버스의 여분 투명 여백 제거 → 실제 얼굴·귀·비니 바운딩 박스만 남김
    .resize({
      width: targetSize,
      height: targetSize,
      fit: 'inside',
      withoutEnlargement: false,
    })
    .png()
    .toBuffer();
}

/** 투명 canvas × canvas 위에 halo(선택) + 판다를 중앙 정렬로 합성한 버퍼. */
async function composeGroup({ canvas, haloDiameter, faceSize, haloColor }) {
  const layers = [];
  if (haloDiameter > 0) {
    const halo = await haloBuffer(canvas, haloDiameter, haloColor);
    layers.push({ input: halo, gravity: 'center' });
  }
  const panda = await pandaBuffer(faceSize);
  const pandaMeta = await sharp(panda).metadata();
  layers.push({
    input: panda,
    left: Math.round((canvas - pandaMeta.width) / 2),
    top: Math.round((canvas - pandaMeta.height) / 2),
  });

  return sharp({
    create: {
      width: canvas,
      height: canvas,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(layers)
    .png()
    .toBuffer();
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  // --- icon-background.png : paper 전체, 무늬 없음 (DECISION_008 §3.2) ---
  await sharp({
    create: {
      width: ICON_CANVAS,
      height: ICON_CANVAS,
      channels: 4,
      background: PAPER,
    },
  })
    .png()
    .toFile(path.join(OUT_DIR, 'icon-background.png'));

  // --- icon-foreground.png : 투명 + halo + 판다 (adaptive icon 전경, 도구가 16.7% inset 적용) ---
  const foregroundGroup = await composeGroup({
    canvas: ICON_CANVAS,
    haloDiameter: FOREGROUND_HALO,
    faceSize: FOREGROUND_FACE,
    haloColor: BUTTER,
  });
  await sharp(foregroundGroup).toFile(path.join(OUT_DIR, 'icon-foreground.png'));

  // --- icon-only.png : legacy/round 아이콘용, paper 배경에 직접 합성(inset 없음) ---
  const legacyGroup = await composeGroup({
    canvas: ICON_CANVAS,
    haloDiameter: NOMINAL_HALO,
    faceSize: NOMINAL_FACE,
    haloColor: BUTTER,
  });
  await sharp({
    create: {
      width: ICON_CANVAS,
      height: ICON_CANVAS,
      channels: 4,
      background: PAPER,
    },
  })
    .composite([{ input: legacyGroup, gravity: 'center' }])
    .flatten({ background: PAPER })
    .png()
    .toFile(path.join(OUT_DIR, 'icon-only.png'));

  // --- icon-monochrome.png : 판다만의 alpha 기반 단색 실루엣(themed icon) ---
  // halo(squircle)까지 포함해 실루엣을 뽑으면 판다보다 훨씬 큰 halo 알파가 귀·비니 굴곡을
  // 통째로 덮어버려 "귀·비니가 식별 가능한 실루엣"(DECISION_008 §3.4)이 나오지 않는다.
  // 그래서 halo 없이 판다 얼굴만(foreground와 동일한 FOREGROUND_FACE 스케일·중심)으로
  // 실루엣을 만든다.
  const pandaOnlyForMonochrome = await composeGroup({
    canvas: ICON_CANVAS,
    haloDiameter: 0,
    faceSize: FOREGROUND_FACE,
    haloColor: BUTTER,
  });
  const pandaOnlyAlphaRaw = await sharp(pandaOnlyForMonochrome)
    .ensureAlpha()
    .extractChannel('alpha')
    .raw()
    .toBuffer();
  const fgAlpha = floodFillOutsideMask(pandaOnlyAlphaRaw, ICON_CANVAS, ICON_CANVAS);
  const monochromeFillRgb = await sharp({
    create: {
      // channels: 3(RGB, alpha 없음) — joinChannel로 알파를 4번째 채널로 붙이기 위해
      // 여기서 자체 알파를 만들지 않는다(4채널로 만들면 joinChannel이 5채널이 되어버림).
      width: ICON_CANVAS,
      height: ICON_CANVAS,
      channels: 3,
      background: MONOCHROME_FILL,
    },
  })
    .raw()
    .toBuffer();
  await sharp(monochromeFillRgb, { raw: { width: ICON_CANVAS, height: ICON_CANVAS, channels: 3 } })
    .joinChannel(fgAlpha, { raw: { width: ICON_CANVAS, height: ICON_CANVAS, channels: 1 } })
    .png()
    .toFile(path.join(OUT_DIR, 'icon-monochrome.png'));

  // --- splash.png : paper 전체 + 중앙 halo+판다(결합 폭 ≈ 캔버스의 20~24%) ---
  const splashGroup = await composeGroup({
    canvas: ICON_CANVAS,
    haloDiameter: NOMINAL_HALO,
    faceSize: NOMINAL_FACE,
    haloColor: BUTTER,
  });
  const splashGroupResized = await sharp(splashGroup)
    .resize({ width: SPLASH_GROUP_TARGET_WIDTH, height: SPLASH_GROUP_TARGET_WIDTH, fit: 'contain' })
    .png()
    .toBuffer();
  await sharp({
    create: {
      width: SPLASH_CANVAS,
      height: SPLASH_CANVAS,
      channels: 4,
      background: PAPER,
    },
  })
    .composite([{ input: splashGroupResized, gravity: 'center' }])
    .flatten({ background: PAPER })
    .png()
    .toFile(path.join(OUT_DIR, 'splash.png'));

  console.log('생성 완료:', OUT_DIR);
  console.log({
    NOMINAL_HALO,
    NOMINAL_FACE,
    FOREGROUND_HALO,
    FOREGROUND_FACE,
    SPLASH_GROUP_TARGET_WIDTH,
  });
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
