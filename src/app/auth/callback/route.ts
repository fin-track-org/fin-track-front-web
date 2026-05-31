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

        const { data: { user, session }, error } = await supabase.auth.exchangeCodeForSession(code);

        if (!error && user && session) {

            // 분기 A: 마이페이지에서 카카오 연동 버튼을 통해 온 경우
            if (action === 'link') {
                const kakaoIdentity = user.identities?.find((id: { provider: string }) => id.provider === 'kakao');
                const avatarUrl =
                    kakaoIdentity?.identity_data?.avatar_url ??
                    kakaoIdentity?.identity_data?.picture ??
                    null;

                try {
                    await fetch(`${SPRING_BOOT_URL}/api/v1/users/me`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${session.access_token}`,
                        },
                        body: JSON.stringify({ avatarUrl, isKakao: true }),
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
        }
    }

    return NextResponse.redirect(`${actualOrigin}/login`);
}