"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getQuests, claimQuestReward } from "@/src/lib/api/questApi";
import { useQuestStore } from "@/src/store/useQuestStore";
import { ChevronDown, ChevronUp, Gift, Play, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import confetti from "canvas-confetti";

export default function QuestProgressWidget() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isExpanded, setIsExpanded] = useState(false);
  
  const { quests, setQuests, startQuest } = useQuestStore();

  const { data: fetchedQuests } = useQuery({
    queryKey: ["quests"],
    queryFn: getQuests,
  });

  useEffect(() => {
    if (fetchedQuests) {
      setQuests(fetchedQuests);
    }
  }, [fetchedQuests, setQuests]);

  const claimMutation = useMutation({
    mutationFn: claimQuestReward,
    onSuccess: (_, questCode) => {
      // 폭죽 효과
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
      // 퀘스트 상태 갱신
      queryClient.invalidateQueries({ queryKey: ["quests"] });
      // 포인트 등 유저 정보도 갱신
      queryClient.invalidateQueries({ queryKey: ["userProfile"] });
    },
    onError: (error) => {
      alert(error.message || "보상 수령에 실패했습니다.");
    }
  });

  if (!quests || quests.length === 0) return null;

  const completedCount = quests.filter(q => q.isCompleted).length;
  const totalCount = quests.length;
  const progressPercent = Math.round((completedCount / totalCount) * 100);

  const handleStartQuest = (questCode: string) => {
    // 퀘스트 종류에 따른 라우팅
    if (questCode === "FAST_DRAFT" || questCode === "CHECK_BALANCE") {
      // 대시보드에서 진행되는 경우
      startQuest(questCode);
    } else if (questCode === "CATEGORIZE_DRAFT") {
      router.push("/transactions");
      startQuest(questCode);
    } else if (questCode === "SET_BUDGET") {
      router.push("/profile"); // 프로필/예산 탭으로
      startQuest(questCode);
    } else {
      startQuest(questCode);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/50 overflow-hidden mt-4">
      {/* 요약 헤더 (클릭 시 펼치기/접기) */}
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 focus:outline-none transition-colors hover:bg-slate-50 dark:hover:bg-slate-750"
      >
        <div className="flex flex-col items-start gap-1 w-full max-w-[80%]">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">초보 탈출 퀘스트 🏆</h3>
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 px-2 py-0.5 rounded-full">
              {completedCount}/{totalCount} 완료
            </span>
          </div>
          {/* Progress Bar */}
          <div className="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full mt-1 overflow-hidden">
            <div 
              className="h-full bg-emerald-500 transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
        
        <div className="text-slate-400">
          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
      </button>

      {/* 미션 목록 펼침 영역 */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-slate-100 dark:border-slate-700/50 divide-y divide-slate-50 dark:divide-slate-700/50">
          {quests.map((quest) => (
            <div key={quest.questId} className="py-3 flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h4 className={`text-sm font-semibold truncate ${quest.isCompleted ? "text-slate-400 line-through" : "text-slate-700 dark:text-slate-300"}`}>
                    {quest.title}
                  </h4>
                  <span className="flex-shrink-0 flex items-center text-xs font-medium text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-1.5 py-0.5 rounded">
                    +{quest.rewardPoints}P
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {quest.description}
                </p>
              </div>

              {/* 우측 버튼 */}
              <div className="flex-shrink-0">
                {quest.isRewardClaimed ? (
                  <span className="flex items-center text-xs font-bold text-slate-400 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg">
                    <CheckCircle2 size={14} className="mr-1" />
                    수령완료
                  </span>
                ) : quest.isCompleted ? (
                  <button
                    onClick={() => claimMutation.mutate(quest.questCode)}
                    disabled={claimMutation.isPending}
                    className="flex items-center text-xs font-bold text-white px-3 py-1.5 bg-amber-500 hover:bg-amber-600 rounded-lg shadow-sm transition-colors shadow-amber-500/20"
                  >
                    <Gift size={14} className="mr-1" />
                    보상받기
                  </button>
                ) : (
                  <button
                    onClick={() => handleStartQuest(quest.questCode)}
                    className="flex items-center text-xs font-bold text-slate-700 dark:text-slate-200 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-lg transition-colors"
                  >
                    <Play size={14} className="mr-1" />
                    진행하기
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
