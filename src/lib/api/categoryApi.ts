import { createClient } from "@/src/lib/supabase/client";
import { AuthError } from "./authError";

const SPRING_BOOT_URL = process.env.NEXT_PUBLIC_SPRING_BOOT_URL!;

/**
 * 카테고리 목록 조회 (대분류)
 * @param type INCOME | EXPENSE
 */
export const getCategories = async (
  type?: CategoryType,
): Promise<Category[]> => {
  const supabase = createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new AuthError();
  }

  const query = type ? `?type=${type}` : "";

  const response = await fetch(`${SPRING_BOOT_URL}/api/v1/categories${query}`, {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (response.status === 401) {
    throw new AuthError();
  }

  if (!response.ok) {
    throw new Error("카테고리 목록을 불러오는데 실패했습니다.");
  }

  const result: CategoryApiResponse = await response.json();

  return result.data ?? [];
};

/* 세부 항목 (소분류) */
export const getSubCategories = async (
  categoryId: string,
): Promise<SubCategory[]> => {
  const supabase = createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new AuthError();
  }

  const response = await fetch(
    `${SPRING_BOOT_URL}/api/v1/subcategories?categoryId=${categoryId}`,
    { headers: { Authorization: `Bearer ${session.access_token}` } },
  );

  if (response.status === 401) {
    throw new AuthError();
  }

  if (!response.ok) {
    throw new Error("소분류 목록을 불러오는데 실패했습니다.");
  }

  const result: SubCategoryResponse = await response.json();

  return result.data ?? [];
};
