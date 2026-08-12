/**
 * Supabase Auth가 돌려주는 원문 에러를, 사용자에게 그대로 노출하지 않고
 * IMPLEMENTATION_BRIEF_002 §5가 정의한 한글 카피로 변환한다.
 *
 * 원문 메시지는 콘솔 로그에만 남기고 화면에는 절대 노출하지 않는다.
 */

export type LoginErrorReason =
  | "invalid_credentials"
  | "email_not_confirmed"
  | "session_expired"
  | "network_or_unknown";

const LOGIN_ERROR_COPY: Record<LoginErrorReason, string> = {
  invalid_credentials: "이메일이나 비밀번호를 다시 확인해 주세요.",
  email_not_confirmed: "이메일 인증을 마친 뒤 로그인할 수 있어요.",
  session_expired: "로그인이 만료됐어요. 다시 로그인하면 이어서 사용할 수 있어요.",
  network_or_unknown: "지금은 로그인하지 못했어요. 잠시 후 다시 시도해 주세요.",
};

function extractMessage(error: unknown): string {
  if (!error) return "";
  if (typeof error === "object" && "message" in error) {
    const m = (error as { message?: unknown }).message;
    return typeof m === "string" ? m : "";
  }
  return "";
}

/** signInWithPassword 등 로그인 시도 중 발생한 에러를 4가지 사유로 분류한다. */
export function classifyLoginError(error: unknown): LoginErrorReason {
  const message = extractMessage(error).toLowerCase();
  if (!message) return "network_or_unknown";

  if (message.includes("invalid login credentials")) return "invalid_credentials";
  if (message.includes("email not confirmed")) return "email_not_confirmed";
  if (
    (message.includes("session") || message.includes("token") || message.includes("refresh")) &&
    message.includes("expired")
  ) {
    return "session_expired";
  }
  if (message.includes("invalid refresh token") || message.includes("session missing")) {
    return "session_expired";
  }

  return "network_or_unknown";
}

export function getLoginErrorMessage(error: unknown): string {
  return LOGIN_ERROR_COPY[classifyLoginError(error)];
}

export function getLoginErrorMessageForReason(reason: LoginErrorReason): string {
  return LOGIN_ERROR_COPY[reason];
}

/**
 * OAuth 콜백(`/auth/callback`)이 안전하게 전달하는 `reason` 쿼리 값을 해석한다.
 * `oauth_cancelled`는 사용자가 스스로 취소한 경우라 에러 문구를 띄우지 않는다(null 반환).
 */
export function getOAuthCallbackReasonMessage(reason: string | null): string | null {
  if (reason === "session_failed") return LOGIN_ERROR_COPY.session_expired;
  if (reason === "oauth_cancelled") return null;
  return null;
}

// ---- 회원가입 ----

export type SignupErrorReason =
  | "password_mismatch"
  | "password_too_short"
  | "already_registered"
  | "network_or_unknown";

const SIGNUP_ERROR_COPY: Record<SignupErrorReason, string> = {
  password_mismatch: "비밀번호가 서로 달라요. 다시 확인해 주세요.",
  password_too_short: "비밀번호는 최소 6자 이상이어야 해요.",
  already_registered: "이미 가입된 이메일이에요. 로그인해 주세요.",
  network_or_unknown: "지금은 가입하지 못했어요. 잠시 후 다시 시도해 주세요.",
};

export function classifySignupError(error: unknown): SignupErrorReason {
  const message = extractMessage(error).toLowerCase();
  if (!message) return "network_or_unknown";

  if (message.includes("already registered") || message.includes("already exists") || message.includes("already been registered")) {
    return "already_registered";
  }
  if (message.includes("password") && (message.includes("short") || message.includes("at least"))) {
    return "password_too_short";
  }

  return "network_or_unknown";
}

export function getSignupErrorMessage(error: unknown): string {
  return SIGNUP_ERROR_COPY[classifySignupError(error)];
}

export function getSignupErrorMessageForReason(reason: SignupErrorReason): string {
  return SIGNUP_ERROR_COPY[reason];
}

// IMPLEMENTATION_BRIEF_002 §7 "재발송" 절 원문 그대로.
export const RESEND_SUCCESS_MESSAGE = "인증 메일을 다시 보냈어요.";
export const RESEND_FAILURE_MESSAGE = "메일을 다시 보내지 못했어요. 잠시 후 다시 시도해 주세요.";
