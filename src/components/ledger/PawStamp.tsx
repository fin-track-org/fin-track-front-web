"use client";

interface PawStampProps {
  /** 위 줄 / 아래 줄 텍스트 (기본: PAW / DONE) */
  lines?: [string, string];
  size?: "sm" | "lg";
  className?: string;
}

/**
 * 완료·연속 기록을 축하하는 도장 컴포넌트.
 * 브랜드 가이드상 "빠른 기록 완료", "나중에 분류 시작/완료"에만 제한적으로 사용한다.
 * 거래 행, 표, 설정 화면 등에는 사용하지 않는다.
 */
export function PawStamp({ lines = ["PAW", "DONE"], size = "lg", className = "" }: PawStampProps) {
  const dimension = size === "lg" ? "h-16 w-16 text-[10px]" : "h-11 w-11 text-[8px]";

  return (
    <div
      aria-hidden="true"
      style={{ transform: "rotate(-10deg)" }}
      className={[
        "grid place-items-center rounded-full border-2 border-ll-tomato text-center font-extrabold text-ll-tomato",
        dimension,
        className,
      ].join(" ")}
    >
      <span>
        {lines[0]}
        <br />
        {lines[1]}
      </span>
    </div>
  );
}

export default PawStamp;
