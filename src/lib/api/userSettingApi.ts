import { createClient } from "@/src/lib/supabase/client";
import { AuthError } from "@/src/lib/api/authError";

const SPRING_BOOT_URL = process.env.NEXT_PUBLIC_SPRING_BOOT_URL!;

export const fetchMySetting = async (): Promise<UserSettingRes> => {
  const supabase = createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new AuthError();
  }

  const response = await fetch(`${SPRING_BOOT_URL}/api/v1/users/me/settings`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (response.status === 401) {
    throw new AuthError();
  }

  if (!response.ok) {
    throw new Error("설정 정보를 불러오는데 실패했습니다.");
  }

  const result: ApiResponse<UserSettingRes> = await response.json();

  if (!result.data) {
    throw new Error("설정 정보 응답이 올바르지 않습니다.");
  }

  return result.data;
};

export const updateLedgerMode = async (
  body: UserSettingModeUpdateReq
): Promise<UserSettingRes> => {
  const supabase = createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new AuthError();
  }

  const response = await fetch(`${SPRING_BOOT_URL}/api/v1/users/me/settings/mode`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (response.status === 401) {
    throw new AuthError();
  }

  if (!response.ok) {
    throw new Error("가계부 모드 변경에 실패했습니다.");
  }

  const result: ApiResponse<UserSettingRes> = await response.json();

  if (!result.data) {
    throw new Error("가계부 모드 변경 응답이 올바르지 않습니다.");
  }

  return result.data;
};

export const updateLedgerTheme = async (
  body: UserSettingThemeUpdateReq
): Promise<UserSettingRes> => {
  const supabase = createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new AuthError();
  }

  const response = await fetch(`${SPRING_BOOT_URL}/api/v1/users/me/settings/theme/ledger`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (response.status === 401) {
    throw new AuthError();
  }

  if (!response.ok) {
    throw new Error("가계부 테마 변경에 실패했습니다.");
  }

  const result: ApiResponse<UserSettingRes> = await response.json();

  if (!result.data) {
    throw new Error("가계부 테마 변경 응답이 올바르지 않습니다.");
  }

  return result.data;
};

/**
 * 첫 설정 온보딩 완료 처리. 전체 건너뛰기도 완료로 취급한다.
 * 이미 완료된 사용자가 다시 호출해도 기존 완료 시각을 유지한 채 성공한다(멱등).
 */
export const completeOnboarding = async (): Promise<UserSettingRes> => {
  const supabase = createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new AuthError();
  }

  const response = await fetch(`${SPRING_BOOT_URL}/api/v1/users/me/settings/onboarding/complete`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (response.status === 401) {
    throw new AuthError();
  }

  if (!response.ok) {
    throw new Error("첫 설정 완료 처리에 실패했습니다.");
  }

  const result: ApiResponse<UserSettingRes> = await response.json();

  if (!result.data) {
    throw new Error("첫 설정 완료 처리 응답이 올바르지 않습니다.");
  }

  return result.data;
};
