"use client";

const MIN_LENGTH = 6;

type LengthState = "neutral" | "unmet" | "met";

function getLengthState(password: string): LengthState {
  if (password.length === 0) return "neutral";
  return password.length >= MIN_LENGTH ? "met" : "unmet";
}

interface PasswordLengthHintProps {
  password: string;
}

/**
 * 브리프 §6 "비밀번호 조건" — 입력 전(중립) / 6자 미만(미충족) / 6자 이상(충족) 3단계를
 * 아이콘·문구로 함께 구분한다(색상만으로 구분하지 않음). Supabase 자체 규칙(6자)보다
 * 엄격한 조건은 추가하지 않는다.
 */
export function PasswordLengthHint({ password }: PasswordLengthHintProps) {
  const state = getLengthState(password);

  const style: Record<LengthState, string> = {
    neutral: "text-ll-pencil",
    unmet: "text-ll-tomato",
    met: "font-medium text-ll-ink",
  };
  const label: Record<LengthState, string> = {
    neutral: "· 6자 이상",
    unmet: "· 6자 이상 (아직 부족해요)",
    met: "✓ 6자 이상",
  };

  return (
    <p className={`mt-1.5 text-xs ${style[state]}`} aria-live="polite">
      {label[state]}
    </p>
  );
}

interface PasswordMatchHintProps {
  password: string;
  confirmPassword: string;
}

/** 확인 필드 근처에만 표시되는 일치 여부 안내. 아직 입력 전이면 표시하지 않는다. */
export function PasswordMatchHint({ password, confirmPassword }: PasswordMatchHintProps) {
  if (confirmPassword.length === 0) return null;

  const matches = password === confirmPassword;

  // role="alert"는 이미 assertive live region을 암시하므로, aria-live="polite"를 함께 주지 않는다
  // (QA_REVIEW_006 P2 — 일부 보조기술에서 중복 낭독 가능성).
  return (
    <p
      className={`mt-1.5 text-xs ${matches ? "font-medium text-ll-ink" : "text-ll-tomato"}`}
      role={matches ? undefined : "alert"}
      aria-live={matches ? "polite" : undefined}
    >
      {matches ? "✓ 비밀번호가 일치해요" : "· 비밀번호가 서로 달라요"}
    </p>
  );
}
