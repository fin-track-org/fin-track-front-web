// src/app/api/link-kakao/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/src/lib/supabase/server';

export async function GET(request: Request) {
    // 1. 서버용 Supabase 클라이언트 (HttpOnly 보안 쿠키를 알아서 다 읽어옵니다!)
    const supabase = await createClient();

    // 2. 현재 접속 중인 진짜 주소 파악 (localhost 또는 172.x.x.x 등)
    const host = request.headers.get('host');
    const protocol = request.headers.get('x-forwarded-proto') ?? 'http';
    const actualOrigin = `${protocol}://${host}`;

    // 3. 서버 단에서 카카오 연동 URL 생성
    const { data, error } = await supabase.auth.linkIdentity({
        provider: 'kakao',
        options: {
            redirectTo: `${actualOrigin}/auth/callback`,
        },
    });

    // 4. 에러 발생 시 원래 페이지로 튕겨냄
    if (error) {
        console.error("카카오 연동 에러:", error.message);

        // 진짜로 이미 연동된 경우
        if (error.message.includes("already linked")) {
            return NextResponse.redirect(`${actualOrigin}/home/profile?error=already_linked`);
        }
        // 그 외의 알 수 없는 에러인 경우
        else {
            return NextResponse.redirect(`${actualOrigin}/home/profile?error=link_failed`);
        }
    }

    // 5. 성공적으로 발급받은 카카오 로그인 페이지로 유저를 날려버림!
    if (data.url) {
        return NextResponse.redirect(data.url);
    }

    return NextResponse.redirect(`${actualOrigin}/profile`);
}