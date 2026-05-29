import { NextResponse } from 'next/server';
import { createClient } from '@/src/lib/supabase/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const next = searchParams.get('next') ?? '/home';

    // 🔥 [수정됨] Next.js가 착각하는 URL 대신, 헤더에서 '진짜 접속 주소'를 강제로 뜯어옵니다.
    const host = request.headers.get('host'); // 예: 172.30.1.32:3000
    const protocol = request.headers.get('x-forwarded-proto') ?? 'http';
    const actualOrigin = `${protocol}://${host}`;

    if (code) {
        const supabase = await createClient();

        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (!error) {
            // origin 대신 actualOrigin을 사용하여 리다이렉트
            return NextResponse.redirect(`${actualOrigin}${next}`);
        } else {
            console.error('세션 교환 에러:', error.message);
        }
    }

    // 에러 시에도 실제 주소로 리다이렉트
    return NextResponse.redirect(`${actualOrigin}/login`);
}