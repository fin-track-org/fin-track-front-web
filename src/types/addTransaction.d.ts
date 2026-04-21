interface SubCategory {
  id: string;
  name: string;
}

interface PaymentMethod {
  id: string;
  type: PaymentMethodType | string;
  name: string;
  provider?: string;
  isActive?: boolean;
}

interface CreateTransactionPayload {
  date: string; // YYYY-MM-DD
  type: TransactionType; // 모달에서 결정
  amount: number; // ✅ 서버에 보낼 최종 amount(지출 음수, 수입 양수)
  categoryId: string; // (현재 서버 DTO 기준 문자열)
  subCategoryId: string;
  accountId: string;

  // 아래는 지금 당장 서버에 안 보내도 됨.
  // TODO(api 확장): 서버 DTO에 추가되면 body에 포함시키면 됨.
  merchantText?: string | null;
  description?: string | null;
}

interface AddTransactionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  categories: Category[];
  accounts: Account[];

  onSubmit: (payload: CreateTransactionPayload) => Promise<void>;
  defaultValues?: Partial<CreateTransactionPayload>;
  mode: "create" | "edit";
}
