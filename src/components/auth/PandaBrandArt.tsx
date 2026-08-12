"use client";

// 원본 캐릭터 시트 크기 (design-package/assets/panda-character-sheet.png, ftweb/public/images에 복사본 사용).
const SHEET_WIDTH = 1402;
const SHEET_HEIGHT = 1122;

// 시트 좌측의 "얼굴만" 포즈를 정사각형으로 잘라내는 좌표(px, 원본 기준).
// 새 그림을 그리지 않고, 기존 시트에서 CSS 배경 위치만 옮겨 포즈 하나만 노출한다.
const CROP = { x: 60, y: 300, w: 520, h: 520 };

interface PandaBrandArtProps {
  /** 렌더링될 정사각형 한 변의 길이(px) */
  size?: number;
  className?: string;
}

/**
 * 로그인/회원가입 화면의 브랜드 영역에 최대 1회 사용하는 판다 장식.
 * IMPLEMENTATION_BRIEF_002 §4 "판다 사용" — 시트 전체를 그대로 넣지 않고,
 * 기존 자산에서 얼굴 포즈 하나만 잘라 보여준다(신규 이미지 생성 없음).
 */
export function PandaBrandArt({ size = 112, className = "" }: PandaBrandArtProps) {
  const scale = size / CROP.w;

  return (
    <div
      aria-hidden="true"
      className={["rounded-full bg-ll-cream", className].join(" ")}
      style={{
        width: size,
        height: size,
        backgroundImage: "url(/images/panda-character-sheet.png)",
        backgroundRepeat: "no-repeat",
        backgroundSize: `${SHEET_WIDTH * scale}px ${SHEET_HEIGHT * scale}px`,
        backgroundPosition: `${-CROP.x * scale}px ${-CROP.y * scale}px`,
      }}
    />
  );
}

export default PandaBrandArt;
