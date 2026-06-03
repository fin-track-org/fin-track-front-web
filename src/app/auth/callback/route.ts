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

            // 분기 A: 마이페이지에서 소셜 연동(link) 버튼을 통해 온 경우
            if (action === 'link') {
                const identities = user.identities ?? [];
                const linkedProviders = identities.map((id) => id.provider);
                const isKakao = linkedProviders.includes('kakao');

                const availableAvatars: Record<string, string> = {};
                let latestAvatarUrl: string | null = null;

                // 모든 identity를 순회하며 아바타 추출
                identities.forEach((id) => {
                    const url = id.identity_data?.avatar_url ?? id.identity_data?.picture;
                    if (url) {
                        availableAvatars[id.provider] = url;
                        latestAvatarUrl = url; // 배열의 마지막 요소(보통 방금 연동한 계정)의 프사로 덮어쓰기
                    }
                });

                try {
                    await fetch(`${SPRING_BOOT_URL}/api/v1/users/me`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${session.access_token}`,
                        },
                        body: JSON.stringify({ 
                            avatarUrl: latestAvatarUrl, 
                            isKakao,
                            linkedProviders,
                            availableAvatars
                        }),
                    });
                } catch (e) {
                    console.error('카카오 연동 사용자 정보 업데이트 실패:', e);
                }

                return NextResponse.redirect(`${actualOrigin}/home/profile`);
            }

            // 분기 B: 일반 카카오 로그인/회원가입인 경우
            return NextResponse.redirect(`${actualOrigin}${next}`);

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