"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getDrafts } from "@/src/lib/api/transaction/transactions";
import { getCategories } from "@/src/lib/api/categoryApi";
import { getAccounts } from "@/src/lib/api/accountApi";
import { StickyNote } from "@/src/components/ledger/StickyNote";
import SequentialCategorizer from "@/src/components/home/transactions/SequentialCategorizer";

const MAX_VISIBLE = 3;
const ROTATIONS = [-1.5, 1, -0.5];

/**
 * 홈의 "책상 위 메모" 영역 — 미분류(임시) 거래를 포스트잇으로 보여주고
 * 내역의 "나중에 분류" 탭과 동일한 연속 분류 플로우로 진입한다.
 *
 * 표시 규칙 (IMPLEMENTATION_BRIEF_01.md §4.4)
 * - 0건: 숨김
 * - 1~3건: 각 항목을 포스트잇으로 표시
 * - 4건 이상: 3건만 미리 보여주고 "N건 정리하기" CTA
 */
export default function UnclassifiedNotes() {
  const [flowOpen, setFlowOpen] = useState(false);
  const [startIndex, setStartIndex] = useState(0);

  const { data: drafts = [], isLoading } = useQuery({
    queryKey: ["drafts"],
    queryFn: getDrafts,
  });

  // DESIGN_QA_01.md P2-2: 분류 플로우를 실제로 열기 전에는 요청하지 않는다.
  // (이미 다른 화면에서 캐시돼 있다면 즉시 재사용되고, 홈 최초 진입 시 추가 요청은 없다)
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: () => getCategories(),
    enabled: flowOpen,
  });
  const { data: accounts = [] } = useQuery({
    queryKey: ["accounts"],
    queryFn: getAccounts,
    enabled: flowOpen,
  });

  const visible = useMemo(() => drafts.slice(0, MAX_VISIBLE), [drafts]);
  const remainingCount = drafts.length - visible.length;

  if (isLoading || drafts.length === 0) return null;

  const openFlow = (index: number) => {
    setStartIndex(index);
    setFlowOpen(true);
  };

  return (
    // 카드로 감싸지 않고 종이 배경 위에 포스트잇을 그대로 흩뿌려 놓는다.
    // (DESIGN_SYSTEM.md "카드 반복 대신 구분선, 여백, 종이 형태를 혼합한다" / 하이파이 시안의 "책상 위 메모" 참고)
    <section>
      <div className="mb-3 flex items-center justify-between px-1">
        <h2 className="text-base font-bold text-gray-900 md:text-lg">책상 위 메모</h2>
        {/* DESIGN_QA_01.md P2-5: 같은 동작을 하는 CTA를 화면에 하나만 남긴다.
            미리보기에 다 보이는 1~3건은 헤더 링크가 주 행동, 4건 이상이면 하단 CTA가 주 행동. */}
        {remainingCount === 0 && (
          <button
            type="button"
            onClick={() => openFlow(0)}
            className="text-xs font-semibold text-ll-tomato hover:underline md:text-sm"
          >
            {drafts.length}건 정리
          </button>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {visible.map((draft, i) => (
          <StickyNote
            key={draft.id}
            as="button"
            tone={i % 2 === 0 ? "coral" : "mint"}
            rotate={ROTATIONS[i % ROTATIONS.length]}
            onClick={() => openFlow(i)}
            aria-label={`${Math.abs(draft.amount).toLocaleString()}원, ${draft.description || "메모 없음"} 분류하기`}
          >
            <p className="text-sm font-bold text-ll-ink break-keep">
              {Math.abs(draft.amount).toLocaleString()}원 · {draft.description || "메모 없음"}
            </p>
            <p className="mt-0.5 text-xs text-ll-pencil break-keep">
              무엇을 위해 쓴 돈인지 알려주세요.
            </p>
          </StickyNote>
        ))}

        {remainingCount > 0 && (
          <button
            type="button"
            // "N건 정리하기"는 미리보기에 없는 나머지만이 아니라 전체 N건을 순서대로 처리한다.
            onClick={() => openFlow(0)}
            className="min-h-[44px] rounded-md border border-dashed border-ll-ink/25 py-2.5 text-xs font-semibold text-ll-pencil hover:bg-ll-cream/60 md:text-sm"
          >
            {drafts.length}건 정리하기 →
          </button>
        )}
      </div>

      <SequentialCategorizer
        open={flowOpen}
        onOpenChange={setFlowOpen}
        drafts={drafts}
        startIndex={startIndex}
        categories={categories}
        accounts={accounts}
      />
    </section>
  );
}
