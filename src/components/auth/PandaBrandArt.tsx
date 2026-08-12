"use client";

import Image from "next/image";

interface PandaBrandArtProps {
  size?: number;
  className?: string;
}

/**
 * 로그인/회원가입 화면의 브랜드 영역에 최대 1회 사용하는 판다 장식.
 * IMPLEMENTATION_BRIEF_002 §4 "판다 사용" — 원본 시트(design-package/assets/panda-character-sheet.png)에서
 * 새 그림을 그리지 않고, 얼굴 포즈 영역만 잘라낸 뒤 시트에 칠해져 있던 평평한 크림색 배경만
 * 기계적으로 투명 처리했다(색상 임계값 기반 알파 처리, 신규 일러스트 없음).
 * 결과 파일: ftweb/public/images/panda-face-transparent.png (정사각형, 원본 크롭 540×540).
 */
export function PandaBrandArt({ size = 112, className = "" }: PandaBrandArtProps) {
  return (
    <Image
      src="/images/panda-face-transparent.png"
      alt=""
      aria-hidden="true"
      width={540}
      height={540}
      style={{ width: size, height: size }}
      className={className}
      priority
    />
  );
}

export default PandaBrandArt;
