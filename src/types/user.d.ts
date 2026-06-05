interface MeResponse {
  id: string;
  email: string;
  nickname: string;
  avatarUrl?: string | null;
  linkedProviders?: string[];
  availableAvatars?: Record<string, string>;
  createdAt: string | null;
  updatedAt: string | null;
  pointBalance: number;
}

interface UserUpdateReq {
  nickname?: string;
  linkedProviders?: string[];
  availableAvatars?: Record<string, string>;
  avatarUrl?: string | null;
}

interface ApiResponse<T> {
  statusCode: number;
  message: string;
  data: T;
}

type LedgerMode = "SIMPLE" | "ASSET_MANAGEMENT";

interface UserSettingRes {
  ledgerMode: LedgerMode;
}

interface UserSettingModeUpdateReq {
  ledgerMode: LedgerMode;
}
