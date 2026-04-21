interface Account {
  id: string;
  name: string;
  type: "CASH" | "CHECK_CARD" | "CREDIT_CARD" | string;
  creditLimit: number | null;
  performanceTarget: number | null;
  isDefault: boolean;
  sortOrder: number;
  isActive: boolean;
}

interface ApiResponse<T> {
  statusCode: number;
  message: string;
  data: T;
}
