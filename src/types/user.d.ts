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
type LedgerTheme = "DEFAULT" | "EXCEL";

interface UserSettingRes {
  ledgerMode: LedgerMode;
  ledgerTheme: LedgerTheme;
  /** 첫 설정 온보딩 완료 여부. onboardingCompletedAt이 null이 아니면 true. */
  onboardingCompleted: boolean;
  /** 온보딩 완료(또는 전체 건너뛰기) 시각. 미완료면 null. */
  onboardingCompletedAt: string | null;
}

interface UserSettingModeUpdateReq {
  ledgerMode: LedgerMode;
}

interface UserSettingThemeUpdateReq {
  ledgerTheme: LedgerTheme;
}
