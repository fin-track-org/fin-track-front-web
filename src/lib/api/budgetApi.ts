import { createClient } from "@/src/lib/supabase/client";
import { AuthError } from "@/src/lib/api/authError";

const SPRING_BOOT_URL = process.env.NEXT_PUBLIC_SPRING_BOOT_URL!;

async function getToken(): Promise<string> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new AuthError();
  return session.access_token;
}

/** 예산 템플릿 목록 조회 */
export const getBudgetTemplates = async (): Promise<BudgetTemplateRes[]> => {
  const token = await getToken();
  const response = await fetch(`${SPRING_BOOT_URL}/api/v1/budgets/defaults`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (response.status === 401) throw new AuthError();
  if (!response.ok) throw new Error("예산 템플릿 목록을 불러오는데 실패했습니다.");
  const result: ApiResponse<BudgetTemplateRes[]> = await response.json();
  return result.data ?? [];
};

/** 예산 템플릿 생성 */
export const createBudgetTemplate = async (
  body: BudgetTemplateCreateReq,
): Promise<BudgetTemplateRes> => {
  const token = await getToken();
  const response = await fetch(`${SPRING_BOOT_URL}/api/v1/budgets/defaults`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (response.status === 401) throw new AuthError();
  if (!response.ok) throw new Error("예산 템플릿 생성에 실패했습니다.");
  const result: ApiResponse<BudgetTemplateRes> = await response.json();
  return result.data!;
};

/** 예산 템플릿 수정 */
export const updateBudgetTemplate = async (
  templateId: string,
  body: BudgetTemplateUpdateReq,
): Promise<BudgetTemplateRes> => {
  const token = await getToken();
  const response = await fetch(
    `${SPRING_BOOT_URL}/api/v1/budgets/defaults/${templateId}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );
  if (response.status === 401) throw new AuthError();
  if (!response.ok) throw new Error("예산 템플릿 수정에 실패했습니다.");
  const result: ApiResponse<BudgetTemplateRes> = await response.json();
  return result.data!;
};

/** 예산 템플릿 비활성화 (soft delete) */
export const deleteBudgetTemplate = async (
  templateId: string,
): Promise<void> => {
  const token = await getToken();
  const response = await fetch(
    `${SPRING_BOOT_URL}/api/v1/budgets/defaults/${templateId}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  if (response.status === 401) throw new AuthError();
  if (!response.ok) throw new Error("예산 템플릿 삭제에 실패했습니다.");
};
