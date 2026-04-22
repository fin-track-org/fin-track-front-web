interface BudgetTemplateRes {
  id: string;
  categoryId: string;
  categoryName: string;
  subCategoryId: string | null;
  subCategoryName: string | null;
  targetAmount: number;
  isActive: boolean;
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
