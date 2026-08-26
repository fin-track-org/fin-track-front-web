"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import OnboardingShell from "./OnboardingShell";
import SkipAllConfirm from "./SkipAllConfirm";
import StepMode from "./steps/StepMode";
import StepAccount from "./steps/StepAccount";
import StepFirstRecord from "./steps/StepFirstRecord";
import StepComplete from "./steps/StepComplete";
import { invalidateAfterOnboarding } from "./invalidateAfterOnboarding";
import { updateLedgerMode, completeOnboarding } from "@/src/lib/api/userSettingApi";
import { USER_SETTING_QUERY_KEY } from "@/src/hook/useUserSettings";
import { useToast } from "@/src/hook/useToast";
import { ONBOARDING_STEP_HEADING_ID } from "./constants";

type WizardStep = 1 | 2 | 3 | "complete";

interface OnboardingFlowProps {
  initialLedgerMode: LedgerMode;
}

/**
 * 3단계 온보딩 위저드 오케스트레이터. 서버에 이미 저장된 모드·결제수단은 각 단계 컴포넌트가
 * 직접 조회해 새로고침·뒤로가기 후 재진입 시에도 중복 생성을 막는다(§3).
 * 온보딩 완료 상태 자체는 어디에도 로컬 저장하지 않고, 완료 API 응답만을 기준으로 삼는다.
 */
export default function OnboardingFlow({ initialLedgerMode }: OnboardingFlowProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [step, setStep] = useState<WizardStep>(1);
  const [ledgerMode, setLedgerMode] = useState<LedgerMode>(initialLedgerMode ?? "SIMPLE");
  const [defaultAccountName, setDefaultAccountName] = useState<string | null>(null);
  const [skipConfirmOpen, setSkipConfirmOpen] = useState(false);

  // 단계가 바뀔 때마다 새 h1으로 초점을 옮긴다(뒤로가기 포함).
  useEffect(() => {
    if (step === "complete") return;
    document.getElementById(ONBOARDING_STEP_HEADING_ID)?.focus();
  }, [step]);

  const { mutateAsync: mutateSkipAllMode, isPending: isSkipAllModePending } = useMutation({
    mutationFn: updateLedgerMode,
  });
  const { mutateAsync: mutateSkipAllComplete, isPending: isSkipAllCompletePending } = useMutation({
    mutationFn: completeOnboarding,
  });
  const skipAllPending = isSkipAllModePending || isSkipAllCompletePending;

  const handleConfirmSkipAll = async () => {
    try {
      await mutateSkipAllMode({ ledgerMode: "SIMPLE" });
      const res = await mutateSkipAllComplete();
      queryClient.setQueryData(USER_SETTING_QUERY_KEY, res);
      invalidateAfterOnboarding(queryClient);
      setSkipConfirmOpen(false);
      router.replace("/home");
    } catch (err) {
      setSkipConfirmOpen(false);
      toast.error(err instanceof Error ? err.message : "건너뛰기에 실패했어요. 다시 시도해 주세요.");
    }
  };

  if (step === "complete") {
    return (
      <StepComplete
        onOpenHome={() => {
          invalidateAfterOnboarding(queryClient);
          router.replace("/home");
        }}
      />
    );
  }

  return (
    <>
      <OnboardingShell step={step} onSkipAll={() => setSkipConfirmOpen(true)} skipDisabled={skipAllPending}>
        {step === 1 && (
          <StepMode
            initialMode={ledgerMode}
            onSaved={(mode) => {
              setLedgerMode(mode);
              setStep(2);
            }}
          />
        )}
        {step === 2 && (
          <StepAccount
            ledgerMode={ledgerMode}
            onDone={(accountName) => {
              setDefaultAccountName(accountName);
              setStep(3);
            }}
            onBack={() => setStep(1)}
          />
        )}
        {step === 3 && (
          <StepFirstRecord
            defaultAccountName={defaultAccountName}
            onCompleted={() => setStep("complete")}
            onBack={() => setStep(2)}
          />
        )}
      </OnboardingShell>

      <SkipAllConfirm
        open={skipConfirmOpen}
        pending={skipAllPending}
        onCancel={() => setSkipConfirmOpen(false)}
        onConfirm={handleConfirmSkipAll}
      />
    </>
  );
}
