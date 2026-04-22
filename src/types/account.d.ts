type AccountType = "CASH" | "BANK" | "CREDIT_CARD" | "CHECK_CARD" | "ETC";

interface Account {
  id: string;
  name: string;
  type: AccountType;
  creditLimit: number | null;
  performanceTarget: number | null;
  isDefault: boolean;
  sortOrder: number;
  isActive: boolean;
}

interface AccountCreateReq {
  name: string;
  type: AccountType;
  creditLimit?: number | null;
  performanceTarget?: number | null;
  isDefault?: boolean;
  sortOrder?: number;
}

interface AccountUpdateReq {
  name?: string;
  type?: AccountType;
  creditLimit?: number | null;
  performanceTarget?: number | null;
  sortOrder?: number;
}

interface ApiResponse<T> {
  statusCode: number;
  message: string;
  data: T;
}
