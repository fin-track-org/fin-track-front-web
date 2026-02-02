import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  // 1. .env.local 파일에서 환경 변수를 읽어옵니다.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  // 2. 브라우저용 Supabase 클라이언트(접속기)를 생성해서 반환합니다.
  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}