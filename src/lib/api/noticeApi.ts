import { Notice } from "@/src/types/notice";
import { createClient } from "@/src/lib/supabase/client";

const SPRING_BOOT_URL = process.env.NEXT_PUBLIC_SPRING_BOOT_URL!;

async function getToken(): Promise<string> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("No active session");
  return session.access_token;
}

export async function getNotices(): Promise<Notice[]> {
  try {
    const token = await getToken();
    const res = await fetch(`${SPRING_BOOT_URL}/api/v1/notices`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      cache: "no-store", 
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => "No text");
      console.error(`Backend returned ${res.status}: ${errorText}`);
      throw new Error(`공지사항 조회 실패 (${res.status})`);
    }
    
    // 백엔드의 CommonResponse<List<NoticeRes>> 형태라고 가정
    const json = await res.json();
    return json.data ?? [];
  } catch (error) {
    console.error("Failed to fetch notices:", error);
    return [];
  }
}
