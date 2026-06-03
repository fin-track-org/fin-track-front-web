import { NextResponse } from 'next/server';
import { createClient } from '@/src/lib/supabase/server';

const SPRING_BOOT_URL = process.env.NEXT_PUBLIC_SPRING_BOOT_URL!;

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const next = searchParams.get('next') ?? '/home';
    const action = searchParams.get('action');

    const host = request.headers.get('host');
    const protocol = request.headers.get('x-forwarded-proto') ?? 'http';
    const actualOrigin = `${protocol}://${host}`;

    if (code) {
        const supabase = await createClient();

        let { data: { user, session }, error } = await supabase.auth.exchangeCodeForSession(code);

        // 💡 [심폐소생술 로직]: PKCE 에러가 났지만, 이미 로그인된 유저라면 기존 세션을 강제로 끌어옵니다!
        if (error) {
            console.warn('세션 교환 중 에러 발생 (PKCE 증발 등), 기존 세션으로 복구를 시도합니다:', error.message);
            const { data: existingAuth } = await supabase.auth.getSession();

            if (existingAuth.session && existingAuth.session.user) {
                user = existingAuth.session.user;
                session = existingAuth.session;
                error = null; // 에러 무효화!
            }
        }

        if (!error && user && session) {

            // 💡 [핵심 버그 수정]: 'link' 액션 여부와 상관없이 무조건 현재 user.identities를 파싱합니다.
            // (동일 이메일로 가입해 Supabase가 자동 연동(Update)한 경우에도 DB를 최신 상태로 동기화하기 위함)
            const identities = user.identities ?? [];
            const linkedProviders = identities.map((id) => id.provider);

            const availableAvatars: Record<string, string> = {};
            let latestAvatarUrl: string | null = null;

            // 모든 identity를 순회하며 아바타 추출
            identities.forEach((id) => {
                const url = id.identity_data?.avatar_url ?? id.identity_data?.picture;
                if (url) {
                    availableAvatars[id.provider] = url;
                    latestAvatarUrl = url;
                }
            });

            // PUT 요청 Payload 구성
            const payload: any = {
                linkedProviders,
                availableAvatars
            };
            
            // 마이페이지에서 명시적으로 연동(link)을 누른 경우에만, 프사를 새로 연동한 계정 프사로 덮어씌웁니다.
            if (action === 'link') {
                payload.avatarUrl = latestAvatarUrl;
            }

            try {
                // 백엔드에 최신 소셜 계정 상태 동기화
                await fetch(`${SPRING_BOOT_URL}/api/v1/users/me`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session.access_token}`,
                    },
                    body: JSON.stringify(payload),
                });
            } catch (e) {
                console.error('소셜 계정 상태 동기화 실패:', e);
            }

            // 분기 처리: 마이페이지 연동 vs 일반 로그인
            if (action === 'link') {
                return NextResponse.redirect(`${actualOrigin}/home/profile`);
            } else {
                return NextResponse.redirect(`${actualOrigin}${next}`);
            }

        } else {
            console.error('세션 교환 에러:', error?.message);
            // 연동 중 세션 교환 실패 시 프로필로 복귀
            if (action === 'link') {
                return NextResponse.redirect(`${actualOrigin}/home/profile`);
            }
        }
    } else if (action === 'link') {
        // code가 없는 경우 (카카오 인증 취소 또는 에러) → 프로필로 복귀
        return NextResponse.redirect(`${actualOrigin}/home/profile`);
    }

    return NextResponse.redirect(`${actualOrigin}/login`);
}