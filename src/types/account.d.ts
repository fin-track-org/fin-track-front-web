type AccountType = "CASH" | "BANK" | "CREDIT_CARD" | "CHECK_CARD" | "SAVINGS_INVESTMENT" | "ETC";

interface Account {
  id: string;
  name: string;
  type: AccountType;
  creditLimit: number | null;
  performanceTarget: number | null;
  isDefault: boolean;
  sortOrder: number;
  isActive: boolean;
  isSystem: boolean;
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

type AdjustMode = "ABSOLUTE" | "DELTA";

interface AccountAdjustReq {
  mode: AdjustMode;
  actualBalance?: number;
  amount?: number; // DELTA 모드: 양수=추가, 음수=차감
  reason?: string;
}
