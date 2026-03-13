type CategoryType = "INCOME" | "EXPENSE";

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
