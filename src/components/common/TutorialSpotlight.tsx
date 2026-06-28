"use client";

import { useEffect, useState } from "react";
import { Joyride, Step, EventData } from "react-joyride";
import { useQuestStore } from "@/src/store/useQuestStore";
import { useTheme } from "next-themes";
import { completeQuest } from "@/src/lib/api/questApi";
import { useQueryClient } from "@tanstack/react-query";

const GET_QUEST_STEPS = (isMobile: boolean): Record<string, Step[]> => ({
  "FAST_DRAFT": [
    {
      target: isMobile ? "#tutorial-quick-add-mobile" : "#tutorial-quick-add-desktop",
      content: "우측 하단의 + 버튼을 직접 눌러보세요!",
      skipBeacon: true,
      placement: "top",
      overlayClickAction: false,
      buttons: [],
      isFixed: true,
    },
    {
      target: "#tutorial-quick-add-menu-item",
      content: "빠른 등록을 선택하세요.",
      skipBeacon: true,
      placement: isMobile ? "top" : "left",
      overlayClickAction: false,
      buttons: [],
      isFixed: true,
    },
    {
      target: "#tutorial-quick-add-modal",
      content: "금액과 간단한 메모를 입력하고 저장 버튼을 눌러보세요.",
      skipBeacon: true,
      placement: "bottom",
      overlayClickAction: false,
      isFixed: true,
    },
    {
      target: isMobile ? "#tutorial-nav-ledger-mobile" : "#tutorial-nav-ledger-desktop",
      content: "성공! 방금 던져둔 내역을 확인하러 가볼까요? 가계부 메뉴를 클릭하세요.",
      skipBeacon: true,
      placement: isMobile ? "top" : "right",
      overlayClickAction: false,
      buttons: [],
      isFixed: true,
    },
    {
      target: "#tutorial-draft-tab",
      content: "상단 메뉴에 알림이 뜬 '임시 보관함' 버튼이 보이시나요? 직접 눌러보세요!",
      skipBeacon: true,
      placement: "bottom",
      overlayClickAction: false,
      buttons: [], // 유저가 직접 탭을 눌러야만 스텝이 넘어가도록 버튼 숨김
    }
  ],
  "CATEGORIZE_DRAFT": [
    {
      target: "#tutorial-draft-tab",
      content: "임시 보관함에 던져둔 내역을 이 탭에서 확인하고 분류할 수 있어요.",
      skipBeacon: true,
      placement: "bottom",
      overlayClickAction: false,
    }
  ],
  "SET_BUDGET": [
    {
      target: "#tutorial-budget-setting",
      content: "이번 달 예산을 설정해두면 텅장을 방지할 수 있습니다!",
      skipBeacon: true,
      placement: "top",
      overlayClickAction: false,
    }
  ],
  "CHECK_BALANCE": [
    {
      target: "#tutorial-balance-check",
      content: "현재 잔액을 한눈에 스캔해보세요.",
      skipBeacon: true,
      placement: "top",
      overlayClickAction: false,
    }
  ]
});

export default function TutorialSpotlight() {
  const { activeQuestCode, isRunning, stepIndex, setStepIndex, stopQuest, nextStep } = useQuestStore();
  const { resolvedTheme } = useTheme();
  const queryClient = useQueryClient();
  const [steps, setSteps] = useState<Step[]>([]);

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    handleResize(); // 초기값 셋팅
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (activeQuestCode) {
      const stepConfig = GET_QUEST_STEPS(isMobile);
      if (stepConfig[activeQuestCode]) {
        setSteps(stepConfig[activeQuestCode]);
      }
    } else {
      setSteps([]);
    }
  }, [activeQuestCode, isMobile]);

  const handleJoyrideCallback = async (data: EventData) => {
    const { status, action, index, type } = data;
    
    // 종료 또는 건너뛰기
    if (status === "finished" || status === "skipped" || action === "close") {
      stopQuest();
      
      // 사용자가 정상적으로 가이드를 완료한 경우
      if (status === "finished" && activeQuestCode) {
        try {
          await completeQuest(activeQuestCode);
          queryClient.invalidateQueries({ queryKey: ["quests"] });
        } catch (e) {
          console.error("Failed to complete quest:", e);
        }
      }
    }
  };

  const isDarkMode = resolvedTheme === "dark";

  return (
    <>
      {/* 긴급 탈출(그만하기) 버튼: 튜토리얼 진행 중일 때 항상 화면 상단 중앙에 고정 */}
      {isRunning && (
        <button
          onClick={stopQuest}
          className="fixed top-20 left-1/2 -translate-x-1/2 z-[10001] bg-rose-500 hover:bg-rose-600 text-white font-bold py-2 px-6 rounded-full shadow-2xl animate-bounce"
        >
          🚨 튜토리얼 그만하기
        </button>
      )}

      <Joyride
        steps={steps}
        stepIndex={stepIndex}
        run={isRunning && steps.length > 0}
        continuous
        scrollToFirstStep
        onEvent={handleJoyrideCallback}
        options={{
          zIndex: 10000,
          primaryColor: "#10b981", // emerald-500
          backgroundColor: isDarkMode ? "#1e293b" : "#ffffff", // slate-800 or white
          textColor: isDarkMode ? "#f8fafc" : "#334155", // slate-50 or slate-700
          overlayColor: "rgba(0, 0, 0, 0.6)",
          disableFocusTrap: true,
          showProgress: true,
          buttons: ["back", "close", "primary", "skip"],
        }}
      styles={{
        tooltipContainer: {
          textAlign: "left",
        },
        buttonPrimary: {
          backgroundColor: "#10b981",
          borderRadius: "8px",
          padding: "8px 16px",
          fontWeight: "bold",
        },
        buttonSkip: {
          color: isDarkMode ? "#94a3b8" : "#64748b",
          fontWeight: 500,
        },
      }}
      locale={{
        back: "이전",
        close: "닫기",
        last: "미션 완료!",
        next: "다음",
        skip: "건너뛰기",
      }}
    />
    </>
  );
}
