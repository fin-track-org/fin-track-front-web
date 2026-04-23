import { createClient } from "@/src/lib/supabase/client";
import { AuthError } from "@/src/lib/api/authError";

const SPRING_BOOT_URL = process.env.NEXT_PUBLIC_SPRING_BOOT_URL!;

export const fetchMe = async (): Promise<MeResponse> => {
  const supabase = createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new AuthError();
  }

  const response = await fetch(`${SPRING_BOOT_URL}/api/v1/users/me`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (response.status === 401) {
    throw new AuthError();
  }

  if (!response.ok) {
    throw new Error("사용자 정보를 불러오는데 실패했습니다.");
  }

  const result: ApiResponse<MeResponse> = await response.json();

  if (!result.data) {
    throw new Error("사용자 정보 응답이 올바르지 않습니다.");
  }

  return result.data;
};

export const updateMe = async (body: UserUpdateReq): Promise<MeResponse> => {
  const supabase = createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new AuthError();
  }

  const response = await fetch(`${SPRING_BOOT_URL}/api/v1/users/me`, {
    method: "PUT",
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
    throw new Error("사용자 정보 수정에 실패했습니다.");
  }

  const result: ApiResponse<MeResponse> = await response.json();

  if (!result.data) {
    throw new Error("사용자 정보 응답이 올바르지 않습니다.");
  }

  return result.data;
};
