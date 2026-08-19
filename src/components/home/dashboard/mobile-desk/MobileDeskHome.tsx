"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getQuests } from "@/src/lib/api/questApi";
import { getDashboardBalances } from "@/src/lib/api/dashboard/balance";
import { useQuestStore } from "@/src/store/useQuestStore";
import { useUserSettings } from "@/src/hook/useUserSettings";
import DeskHero from "./DeskHero";
import DraftStickyNote from "./DraftStickyNote";
import DeskCalendar from "./DeskCalendar";
import BudgetEnvelope from "./BudgetEnvelope";
import ReceiptStack from "./ReceiptStack";
import AvailableToSpendCard from "../section/AvailableToSpendCard";
import BalanceCard from "../section/BalanceCard";

type DeskObjectKey = "draft" | "calendar" | "budget" | "receipt";

/** "빠르게 기록하기" 버튼이 GlobalQuickAdd의 quick 모드를 직접 열도록 보내는 이벤트 payload.
 * 기존 `open-quick-add`(payload 없는 단순 toggle, MobileBottomNav가 사용)와 하위 호환된다 —
 * GlobalQuickAdd 쪽에서 detail 유무로 분기한다(IMPLEMENTATION_BRIEF_010 §5). */
export interface OpenQuickAddDetail {
  mode: "quick";
}

/**
 * 책상형 모바일 홈 — `/home`의 lg 미만 레이아웃. 인사·CTA와 책상 위 물건 4개(포스트잇/
 * 탁상 달력/예산 봉투/영수증 묶음)로 구성된다. 각 물건은 자기 자신의 query와 상태를 갖고,
 * 한 번에 하나만 확대된다(§10).
 */
export default function MobileDeskHome() {
  const [openObject, setOpenObject] = useState<DeskObjectKey | null>(null);
  const { userSetting } = useUserSettings();
  const { activeQuestCode, stepIndex, nextStep, quests, setQuests } = useQuestStore();

  // 퀘스트 진행 체크리스트(§12)를 위해 QuestProgressWidget과 같은 query를 유지한다.
  // 데스크톱 전용 위젯을 모바일에 그대로 마운트하지 않는 대신, store를 채우는 최소한의
  // 조회만 별도로 유지해 store/TutorialSpotlight를 건드리지 않는다.
  const { data: fetchedQuests } = useQuery({ queryKey: ["quests"], queryFn: getQuests });
  useEffect(() => {
    if (fetchedQuests) setQuests(fetchedQuests);
  }, [fetchedQuests, setQuests]);

  const isAssetManagement = userSetting?.ledgerMode === "ASSET_MANAGEMENT";

  const { data: balanceData } = useQuery({
    queryKey: ["dashboardBalances"],
    queryFn: () => getDashboardBalances(),
    retry: false,
    enabled: isAssetManagement,
  });

  const completedCount = quests.filter((q) => q.isCompleted).length;
  const totalCount = quests.length;
  const showQuestChecklist = totalCount > 0 && completedCount < totalCount;

  const handleQuickRecord = () => {
    // QA_REVIEW_020 P1-2: FAST_DRAFT 0단계 도중에는 quick 모드로 바로 열지 않는다. 그러면
    // 스포트라이트가 1단계에서 찾는 `#tutorial-quick-add-menu-item`(스피드 다이얼 메뉴 항목)이
    // 화면에 없는 채로 modal만 열려버린다. 이 상태에서는 하단 `+`와 완전히 같은 legacy
    // 흐름(payload 없는 이벤트로 메뉴만 열기)을 따라야 1단계 target이 실제로 나타난다.
    // 그 외(튜토리얼 비활성 또는 이미 다른 단계 진행 중)에는 기존처럼 메뉴를 거치지 않고
    // quick 모드를 바로 연다.
    if (activeQuestCode === "FAST_DRAFT" && stepIndex === 0) {
      window.dispatchEvent(new Event("open-quick-add"));
      setTimeout(() => nextStep(), 350);
      return;
    }
    window.dispatchEvent(
      new CustomEvent<OpenQuickAddDetail>("open-quick-add", { detail: { mode: "quick" } }),
    );
  };

  const close = () => setOpenObject(null);

  return (
    // `/home/layout.tsx`가 {children}을 `p-4 lg:p-8`로 감싸므로, 책상이 화면 끝까지
    // 이어지도록 그 padding을 상쇄한다(edge-to-edge). lg 이상에서는 이 컴포넌트 자체가
    // 마운트되지 않지만(DashboardPage 분기), 리사이즈 경계에서도 안전하도록 lg:m-0을 둔다.
    <div className="-m-4 lg:m-0 lg:hidden">
      <DeskHero onQuickRecord={handleQuickRecord} />

      {showQuestChecklist && (
        <div className="mx-4 mt-3 rounded-xl border border-ll-ink/15 bg-ll-cream px-3.5 py-2.5">
          <p className="mb-1.5 text-[11px] font-bold text-ll-ink/70">
            초보 탈출 퀘스트 {completedCount}/{totalCount}
          </p>
          <ul className="space-y-1">
            {quests
              .filter((q) => !q.isCompleted)
              .slice(0, 3)
              .map((q) => (
                <li key={q.questId} className="flex items-center gap-1.5 text-xs text-ll-ink">
                  <span
                    aria-hidden="true"
                    className="h-1.5 w-1.5 shrink-0 rounded-full border border-ll-ink/40"
                  />
                  <span className="truncate">{q.title}</span>
                </li>
              ))}
          </ul>
        </div>
      )}

      {/* `/home/layout.tsx`가 이미 `<main>`이라 여기서는 `<section>`을 쓴다(중첩 <main> 금지). */}
      <section
        aria-label="나의 가계부 책상"
        className="grid grid-cols-2 gap-3.5 px-4 py-5"
        style={{
          backgroundColor: "var(--color-ll-cream)",
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent 0 31px, rgba(32,40,58,0.025) 32px)",
        }}
      >
        <DraftStickyNote
          isOpen={openObject === "draft"}
          onOpen={() => setOpenObject("draft")}
          onClose={close}
        />
        <DeskCalendar
          isOpen={openObject === "calendar"}
          onOpen={() => setOpenObject("calendar")}
          onClose={close}
        />
        <BudgetEnvelope
          isOpen={openObject === "budget"}
          onOpen={() => setOpenObject("budget")}
          onClose={close}
        />
        <ReceiptStack
          isOpen={openObject === "receipt"}
          onOpen={() => setOpenObject("receipt")}
          onClose={close}
          onQuickRecord={handleQuickRecord}
        />
      </section>

      {/* 자산관리 모드 전용 카드 — 책상 물건(최대 4개, DECISION_010 §2)에 포함하지 않고
          기존 위치·컴포넌트를 그대로 재사용한다. `#tutorial-balance-check`가 모바일에서도
          사라지지 않게 하기 위함이다(§12). */}
      {isAssetManagement && (
        <div className="space-y-4 bg-ll-cream px-4 pb-6">
          <AvailableToSpendCard />
          {balanceData && (
            <BalanceCard totalBalance={balanceData.totalBalance} paymentMethods={balanceData.paymentMethods} />
          )}
        </div>
      )}
    </div>
  );
}
