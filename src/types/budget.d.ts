interface BudgetTemplateRes {
  id: string;
  categoryId: string;
  categoryName: string;
  subCategoryId: string | null;
  subCategoryName: string | null;
  targetAmount: number;
  isActive: boolean;
  isFixed: boolean;
}

interface BudgetTemplateItemRes {
  id: string;
  categoryId: string;
  categoryName: string;
  subCategoryId: string;
  subCategoryName: string;
  targetAmount: number;
  isFixed: boolean;
}

interface BudgetTemplateGroupRes {
  categoryId: string;
  categoryName: string;
  id: string | null;
  targetAmount: number | null;
  isFixed: boolean;
  items: BudgetTemplateItemRes[];
}

interface BudgetTemplateCreateReq {
  categoryId: string;
  subCategoryId?: string | null;
  targetAmount: number;
  isFixed: boolean;
}

interface BudgetTemplateUpdateReq {
  targetAmount: number;
  isFixed: boolean;
}

interface BudgetTemplateUpsertItem {
  id?: string;
  categoryId: string;
  subCategoryId?: string | null;
  targetAmount: number;
  isFixed: boolean;
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
