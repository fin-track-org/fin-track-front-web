import { createClient } from "@/src/lib/supabase/client";
import { AuthError } from "@/src/lib/api/authError";

const SPRING_BOOT_URL = process.env.NEXT_PUBLIC_SPRING_BOOT_URL!;

export interface QuestResponseDto {
  questId: number;
  title: string;
  description: string;
  rewardPoints: number;
  questCode: string;
  displayOrder: number;
  isCompleted: boolean;
  isRewardClaimed: boolean;
  completedAt: string | null;
}

export const getQuests = async (): Promise<QuestResponseDto[]> => {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new AuthError();

  const response = await fetch(`${SPRING_BOOT_URL}/api/quests`, {
    method: "GET",
    headers: { Authorization: `Bearer ${session.access_token}` },
  });

  if (!response.ok) throw new Error("퀘스트 목록을 불러오는데 실패했습니다.");
  
  const result = await response.json();
  return result.data.map((q: any) => ({
    ...q,
    isCompleted: q.isCompleted ?? q.completed ?? false,
    isRewardClaimed: q.isRewardClaimed ?? q.rewardClaimed ?? false,
  }));
};

export const completeQuest = async (questCode: string): Promise<void> => {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new AuthError();

  const response = await fetch(`${SPRING_BOOT_URL}/api/quests/${questCode}/complete`, {
    method: "POST",
    headers: { Authorization: `Bearer ${session.access_token}` },
  });

  if (!response.ok) throw new Error("미션 완료 처리에 실패했습니다.");
};

export const claimQuestReward = async (questCode: string): Promise<void> => {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new AuthError();

  const response = await fetch(`${SPRING_BOOT_URL}/api/quests/${questCode}/claim`, {
    method: "POST",
    headers: { Authorization: `Bearer ${session.access_token}` },
  });

  if (!response.ok) throw new Error("미션 보상 수령에 실패했습니다.");
};
