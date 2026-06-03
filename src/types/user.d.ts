interface MeResponse {
  id: string;
  email: string;
  nickname: string;
  profileImageUrl?: string | null;
  isKakao?: boolean | null;
  linkedProviders?: string[];
  availableAvatars?: Record<string, string>;
  createdAt: string | null;
  updatedAt: string | null;
}

interface UserUpdateReq {
  nickname?: string;
  isKakao?: boolean | null;
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
