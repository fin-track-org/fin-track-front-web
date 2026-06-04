export interface RecurringTransactionPayload {
  title?: string; // DTO에 title이 없으므로 선택사항 혹은 제거 (백엔드는 description만 사용할 가능성 높음)
  type: "INCOME" | "EXPENSE" | "TRANSFER";
  amount: number;
  categoryId?: string;
  subcategoryId?: string;
  accountId?: string;
  description?: string | null;
  
  repeatType: "MONTHLY" | "WEEKLY";
  repeatDay: number; 
  startDate: string;
  endDate?: string | null;
  isActive?: boolean;
}

export interface RecurringTransactionRes extends RecurringTransactionPayload {
  id: string;
  nextExecutionDate?: string;
}
