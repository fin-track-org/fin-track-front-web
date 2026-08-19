/**
 * OAuth 성공 후 ftapi `PUT /api/v1/users/me`에 보낼 payload를 `user.identities`로부터 계산한다.
 *
 * 기존 웹 `/auth/callback`(Route Handler)과 Capacitor 앱 전용 딥링크 콜백이 이 함수 하나를
 * 공유해, 두 경로의 동기화 결과가 갈라지지 않게 한다(DECISION_006 §4).
 * 입력은 Supabase user 객체의 `identities` 배열만 있으면 되므로, 서버(Node)·클라이언트(브라우저)
 * 양쪽에서 그대로 쓸 수 있다 — Supabase client나 토큰을 이 함수 안에서 다루지 않는다.
 */

interface IdentityLike {
  provider: string;
  identity_data?: { [key: string]: unknown } | null;
}

interface UserWithIdentities {
  identities?: IdentityLike[] | null;
}

export interface IdentitySyncPayload {
  linkedProviders: string[];
  availableAvatars: Record<string, string>;
  avatarUrl?: string | null;
}

export function buildIdentitySyncPayload(
  user: UserWithIdentities,
  options: { includeAvatarUrl?: boolean } = {}
): IdentitySyncPayload {
  const identities = user.identities ?? [];
  const linkedProviders = identities.map((identity) => identity.provider);

  const availableAvatars: Record<string, string> = {};
  let latestAvatarUrl: string | null = null;

  identities.forEach((identity) => {
    const data = identity.identity_data;
    const url = (data?.avatar_url as string | undefined) ?? (data?.picture as string | undefined);
    if (url) {
      availableAvatars[identity.provider] = url;
      latestAvatarUrl = url;
    }
  });

  const payload: IdentitySyncPayload = { linkedProviders, availableAvatars };
  if (options.includeAvatarUrl) {
    payload.avatarUrl = latestAvatarUrl;
  }
  return payload;
}
