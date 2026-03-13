type CategoryType = "INCOME" | "EXPENSE";

/* 카테고리 */
interface Category {
  id: string;
  name: string;
  type: CategoryType;
  code: string;
  colorCode: string;
  sortOrder: number;
}

interface CategoryApiResponse {
  statusCode: number;
  message: string;
  data: Category[];
}

/* 세부 항목 */
interface SubCategory {
  id: string;
  categoryId: string;
  name: string;
  sortOrder: number;
  isSystem: boolean;
}
interface SubCategoryResponse {
  statusCode: number;
  message: string;
  data: SubCategory[];
}
