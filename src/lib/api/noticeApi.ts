import { Notice } from "@/src/types/notice";

const SPRING_BOOT_URL = process.env.NEXT_PUBLIC_SPRING_BOOT_URL!;

export async function getNotices(): Promise<Notice[]> {
  try {
    const res = await fetch(`${SPRING_BOOT_URL}/api/v1/notices`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      // 공지사항은 자주 바뀌지 않으므로 적절히 캐싱을 하거나 ISR을 사용할 수 있습니다.
      // 여기서는 항상 최신을 가져오도록 설정합니다.
      cache: "no-store", 
    });

    if (!res.ok) throw new Error("공지사항 조회 실패");
    
    // 백엔드의 CommonResponse<List<NoticeRes>> 형태라고 가정
    const json = await res.json();
    return json.data ?? [];
  } catch (error) {
    console.error("Failed to fetch notices:", error);
    return [];
  }
}
