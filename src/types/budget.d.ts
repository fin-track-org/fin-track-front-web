interface BudgetTemplateRes {
  id: string;
  categoryId: string;
  categoryName: string;
  subCategoryId: string | null;
  subCategoryName: string | null;
  targetAmount: number;
  isActive: boolean;
}

interface BudgetTemplateItemRes {
  id: string;
  categoryId: string;
  categoryName: string;
  subCategoryId: string;
  subCategoryName: string;
  targetAmount: number;
}

interface BudgetTemplateGroupRes {
  categoryId: string;
  categoryName: string;
  id: string | null;
  targetAmount: number | null;
  items: BudgetTemplateItemRes[];
}

interface BudgetTemplateCreateReq {
  categoryId: string;
  subCategoryId?: string | null;
  targetAmount: number;
}

interface BudgetTemplateUpdateReq {
  targetAmount: number;
}

interface BudgetTemplateUpsertItem {
  id?: string;
  categoryId: string;
  subCategoryId?: string | null;
  targetAmount: number;
}

interface BudgetTemplateBulkUpsertReq {
  templates: BudgetTemplateUpsertItem[];
}

interface BudgetUsageRes {
  categoryId: string;
  categoryName: string;
  subcategoryId: string | null;
  subcategoryName: string | null;
  targetAmount: number;
  spentAmount: number;
  source: string;
}
