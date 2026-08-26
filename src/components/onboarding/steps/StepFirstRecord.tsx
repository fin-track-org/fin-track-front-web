"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { quickAddTransaction } from "@/src/lib/api/transaction/transactions";
import { completeOnboarding } from "@/src/lib/api/userSettingApi";
import { todayISODateSeoul } from "@/src/hook/useTransaction";
import { createClient } from "@/src/lib/supabase/client";
import { AuthError } from "@/src/lib/api/authError";
import { StatePanel } from "@/src/components/ledger/StatePanel";
import { Label } from "@/src/components/ui/label";
import { USER_SETTING_QUERY_KEY } from "@/src/hook/useUserSettings";
import { OnboardingCtaBar } from "../OnboardingCtaBar";
import { StepBackLink } from "../StepBackLink";
import { ONBOARDING_STEP_HEADING_ID } from "../constants";

/**
 * 완료 API 호출이 실패해 재시도할 때 draft를 중복 생성하지 않기 위한 세션 한정 플래그(§6, QA_REVIEW_011 P1-1).
 * 탭 전체가 아니라 "현재 로그인한 사용자 + 지금 입력한 내용" 조합에 묶어야, 같은 탭에서 다른 계정으로
 * 다시 로그인하거나 완료 실패 후 입력을 바꿨을 때 엉뚱한 draft를 재사용(또는 생략)하지 않는다.
 */
const DRAFT_RECORD_KEY_PREFIX = "ll_onboarding_draft_created:";

interface DraftRecord {
  fingerprint: string;
}

function buildDraftFingerprint(input: { type: "EXPENSE" | "INCOME"; amount: number; memo: string; date: string }) {
  return `${input.type}|${input.amount}|${input.memo}|${input.date}`;
}

function readDraftRecord(key: string): DraftRecord | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return typeof parsed?.fingerprint === "string" ? { fingerprint: parsed.fingerprint } : null;
  } catch {
    return null;
  }
}

function writeDraftRecord(key: string, fingerprint: string) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(key, JSON.stringify({ fingerprint }));
  } catch {
    // sessionStorage를 쓸 수 없는 환경(프라이빗 모드 등) — 중복 방지는 못 하지만 흐름은 막지 않는다.
  }
}

function clearDraftRecord(key: string) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(key);
  } catch {
    // no-op
  }
}

async function getCurrentUserIdOrThrow(): Promise<string> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new AuthError();
  return user.id;
}

interface StepFirstRecordProps {
  defaultAccountName: string | null;
  onCompleted: () => void;
  onBack: () => void;
}

/** 3단계 — 첫 기록 + 온보딩 완료 처리(§6). */
export default function StepFirstRecord({ defaultAccountName, onCompleted, onBack }: StepFirstRecordProps) {
  const queryClient = useQueryClient();

  const [type, setType] = useState<"EXPENSE" | "INCOME">("EXPENSE");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [draftError, setDraftError] = useState<string | null>(null);
  const [completeError, setCompleteError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { mutateAsync: mutateQuickAdd } = useMutation({ mutationFn: quickAddTransaction });
  const { mutateAsync: mutateComplete } = useMutation({ mutationFn: completeOnboarding });

  const finishOnboarding = async (draftRecordKey: string | null) => {
    setCompleteError(null);
    try {
      const res = await mutateComplete();
      queryClient.setQueryData(USER_SETTING_QUERY_KEY, res);
      if (draftRecordKey) clearDraftRecord(draftRecordKey);
      onCompleted();
      return true;
    } catch (err) {
      setCompleteError(err instanceof Error ? err.message : "완료 처리에 실패했어요. 다시 시도해 주세요.");
      return false;
    }
  };

  // "완료 다시 시도"는 draft를 다시 만들지 않고 완료 API만 재시도한다. 재시도 시점에도 현재 로그인
  // 사용자를 다시 확인해, 그 사이 계정이 바뀌었다면(같은 탭 재로그인) 남의 플래그를 건드리지 않는다.
  const handleRetryComplete = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const userId = await getCurrentUserIdOrThrow();
      await finishOnboarding(`${DRAFT_RECORD_KEY_PREFIX}${userId}`);
    } catch (err) {
      setCompleteError(err instanceof Error ? err.message : "완료 처리에 실패했어요. 다시 시도해 주세요.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const parsedAmount = Number(amount);
    if (!amount || Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      setDraftError("금액을 확인해 주세요.");
      return;
    }

    setDraftError(null);
    setSubmitting(true);

    try {
      const userId = await getCurrentUserIdOrThrow();
      const draftRecordKey = `${DRAFT_RECORD_KEY_PREFIX}${userId}`;
      const date = todayISODateSeoul();
      const trimmedMemo = memo.trim();
      const fingerprint = buildDraftFingerprint({ type, amount: parsedAmount, memo: trimmedMemo, date });

      const stored = readDraftRecord(draftRecordKey);
      const alreadyCreatedForThisInput = stored?.fingerprint === fingerprint;

      if (!alreadyCreatedForThisInput) {
        await mutateQuickAdd({ date, amount: parsedAmount, description: trimmedMemo, type });
        writeDraftRecord(draftRecordKey, fingerprint);
        queryClient.invalidateQueries({ queryKey: ["drafts"] });
      }

      await finishOnboarding(draftRecordKey);
    } catch (err) {
      setDraftError(err instanceof Error ? err.message : "기록 저장에 실패했어요.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = async () => {
    if (submitting) return;
    setDraftError(null);
    setSubmitting(true);
    try {
      const userId = await getCurrentUserIdOrThrow();
      await finishOnboarding(`${DRAFT_RECORD_KEY_PREFIX}${userId}`);
    } catch (err) {
      setDraftError(err instanceof Error ? err.message : "완료 처리에 실패했어요.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200">
      <StepBackLink onClick={onBack} disabled={submitting} />
      <h1 id={ONBOARDING_STEP_HEADING_ID} tabIndex={-1} className="text-xl font-extrabold text-ll-ink break-keep outline-none">
        오늘 쓴 돈이 있나요?
      </h1>

      <form id="onboarding-first-record-form" className="mt-6 space-y-5" onSubmit={handleSubmitRecord}>
        <div role="group" aria-label="지출 또는 수입" className="flex gap-2">
          {(["EXPENSE", "INCOME"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              aria-pressed={type === t}
              disabled={submitting}
              className={[
                "flex min-h-[44px] flex-1 items-center justify-center rounded-xl text-sm font-bold transition-colors",
                type === t
                  ? t === "EXPENSE"
                    ? "border-2 border-ll-tomato bg-ll-tomato/10 text-ll-tomato"
                    : "border-2 border-ll-periwinkle bg-ll-periwinkle/10 text-ll-periwinkle"
                  : "border border-ll-ink/15 bg-white text-ll-pencil",
              ].join(" ")}
            >
              {t === "EXPENSE" ? "지출" : "수입"}
            </button>
          ))}
        </div>

        <div>
          <Label htmlFor="onboarding-record-amount" className="mb-1.5 block text-xs font-semibold text-ll-pencil">
            금액
          </Label>
          <input
            id="onboarding-record-amount"
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))}
            disabled={submitting}
            placeholder="0"
            className="block w-full rounded-xl border border-ll-ink/15 bg-white px-4 py-3 text-right text-base text-ll-ink placeholder-ll-pencil/40 outline-none transition-colors focus-visible:border-ll-tomato focus-visible:ring-2 focus-visible:ring-ll-tomato/30 disabled:opacity-60"
          />
        </div>

        <div>
          <Label htmlFor="onboarding-record-memo" className="mb-1.5 block text-xs font-semibold text-ll-pencil">
            메모 (선택)
          </Label>
          <input
            id="onboarding-record-memo"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            disabled={submitting}
            placeholder="예: 점심 식사"
            className="block w-full rounded-xl border border-ll-ink/15 bg-white px-4 py-3 text-base text-ll-ink placeholder-ll-pencil/40 outline-none transition-colors focus-visible:border-ll-tomato focus-visible:ring-2 focus-visible:ring-ll-tomato/30 disabled:opacity-60"
          />
        </div>

        {defaultAccountName && (
          <p className="text-xs leading-relaxed text-ll-pencil break-keep [overflow-wrap:break-word]">
            참고: 기본 결제수단 <span className="font-semibold text-ll-ink">&apos;{defaultAccountName}&apos;</span>는
            아직 이 기록과 연결되지 않아요. 나중에 분류할 때 연결할 수 있어요.
          </p>
        )}

        {draftError && <StatePanel tone="warn" title="저장하지 못했어요" description={draftError} />}
        {completeError && (
          <StatePanel
            tone="warn"
            title="완료 처리에 실패했어요"
            description={`${completeError} 입력한 기록은 이미 저장돼 있어요 — 완료만 다시 시도하면 돼요.`}
          />
        )}
      </form>

      <OnboardingCtaBar>
        {completeError ? (
          <button
            type="button"
            onClick={handleRetryComplete}
            disabled={submitting}
            aria-busy={submitting}
            className="flex min-h-[48px] w-full items-center justify-center rounded-xl bg-ll-ink text-base font-bold text-ll-paper transition-colors hover:bg-ll-ink/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "다시 시도하는 중..." : "완료 다시 시도"}
          </button>
        ) : (
          <>
            <button
              type="submit"
              form="onboarding-first-record-form"
              disabled={submitting || !amount}
              aria-busy={submitting}
              className="flex min-h-[48px] w-full items-center justify-center rounded-xl bg-ll-ink text-base font-bold text-ll-paper transition-colors hover:bg-ll-ink/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "저장하는 중..." : "기록하고 시작"}
            </button>
            <button
              type="button"
              onClick={handleSkip}
              disabled={submitting}
              className="flex min-h-[44px] w-full items-center justify-center rounded-xl text-sm font-semibold text-ll-pencil underline underline-offset-2 hover:text-ll-ink disabled:cursor-not-allowed disabled:opacity-50"
            >
              지금은 건너뛰기
            </button>
          </>
        )}
      </OnboardingCtaBar>
    </div>
  );
}
