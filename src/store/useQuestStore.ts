import { create } from "zustand";
import { persist } from "zustand/middleware";
import { QuestResponseDto } from "../lib/api/questApi";

interface QuestState {
  quests: QuestResponseDto[];
  setQuests: (quests: QuestResponseDto[]) => void;
  updateQuestStatus: (questCode: string, updates: Partial<QuestResponseDto>) => void;
  
  // Tutorial Spotlight State
  activeQuestCode: string | null;
  isRunning: boolean;
  stepIndex: number;
  
  startQuest: (questCode: string) => void;
  stopQuest: () => void;
  nextStep: () => void;
  setStepIndex: (index: number) => void;
}

export const useQuestStore = create<QuestState>()(
  persist(
    (set) => ({
      quests: [],
      setQuests: (quests) => set({ quests }),
      updateQuestStatus: (questCode, updates) =>
        set((state) => ({
          quests: state.quests.map((q) =>
            q.questCode === questCode ? { ...q, ...updates } : q
          ),
        })),
      
      activeQuestCode: null,
      isRunning: false,
      stepIndex: 0,
      
      startQuest: (questCode) => set({ activeQuestCode: questCode, isRunning: true, stepIndex: 0 }),
      stopQuest: () => set({ activeQuestCode: null, isRunning: false, stepIndex: 0 }),
      nextStep: () => set((state) => ({ stepIndex: state.stepIndex + 1 })),
      setStepIndex: (index) => set({ stepIndex: index }),
    }),
    {
      name: "quest-store",
    }
  )
);
