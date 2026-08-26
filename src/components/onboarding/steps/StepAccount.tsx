"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Wallet, Landmark, CreditCard, Building2, Shapes } from "lucide-react";
import { getAccounts, createAccount, setDefaultAccount, adjustAccountBalance } from "@/src/lib/api/accountApi";
import { AuthError } from "@/src/lib/api/authError";
import { StatePanel } from "@/src/components/ledger/StatePanel";
import { Label } from "@/src/components/ui/label";
import { useToast } from "@/src/hook/useToast";
import { OnboardingCtaBar } from "../OnboardingCtaBar";
import { StepBackLink } from "../StepBackLink";
import { ONBOARDING_STEP_HEADING_ID } from "../constants";

const ACCOUNT_TYPE_LABEL: Record<AccountType, string> = {
  CASH: "현금",
  BANK: "은행 계좌",
  CREDIT_CARD: "신용카드",
  CHECK_CARD: "체크카드",
  SAVINGS_INVESTMENT: "저축/투자",
  ETC: "기타",
};

const ACCOUNT_TYPE_ICONS: Record<AccountType, React.ReactNode> = {
  CASH: <Wallet size={16} />,
  BANK: <Landmark size={16} />,
  CREDIT_CARD: <CreditCard size={16} />,
  CHECK_CARD: <CreditCard size={16} />,
  SAVINGS_INVESTMENT: <Building2 size={16} />,
  ETC: <Shapes size={16} />,
};

interface StepAccountProps {
  ledgerMode: LedgerMode;
  /** 다음 단계로 넘어갈 때 확정된 기본 결제수단 이름(없으면 null) — 3단계 안내 문구용. */
  onDone: (defaultAccountName: string | null) => void;
  onBack: () => void;
}

/** 2단계 — 기본 결제수단 등록(§5). */
export default function StepAccount({ ledgerMode, onDone, onBack }: StepAccountProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const typeOptions: AccountType[] = ledgerMode === "SIMPLE"
    ? ["CASH", "BANK", "CREDIT_CARD", "CHECK_CARD", "ETC"]
    : ["CASH", "BANK", "CREDIT_CARD", "CHECK_CARD", "SAVINGS_INVESTMENT", "ETC"];

  // data에 `= []` 기본값을 주지 않는다(QA_REVIEW_011 P1-2) — 조회 실패를 "결제수단 없음"으로
  // 오인하면 기존 기본 결제수단이 있어도 신규 등록 폼을 보여줘 중복 계좌를 만들 수 있다.
  const {
    data: accounts,
    isLoading: isAccountsLoading,
    isError: isAccountsError,
    error: accountsError,
    refetch: refetchAccounts,
  } = useQuery({
    queryKey: ["accounts"],
    queryFn: getAccounts,
  });
  const existingDefault = accounts?.find((a) => a.isDefault) ?? null;

  // 인증 오류는 이 페이지 전용 처리를 만들지 않고 앱의 기존 공통 방식(다른 홈 하위 화면들이
  // AuthError를 만나면 /login으로 보내는 방식)과 동일하게 맞춘다.
  useEffect(() => {
    if (accountsError instanceof AuthError) {
      router.replace("/login");
    }
  }, [accountsError, router]);

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>(ledgerMode === "SIMPLE" ? "CREDIT_CARD" : "SAVINGS_INVESTMENT");
  const [balanceInput, setBalanceInput] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { mutateAsync: mutateCreate } = useMutation({ mutationFn: createAccount });
  const { mutateAsync: mutateSetDefault } = useMutation({ mutationFn: setDefaultAccount });
  const { mutateAsync: mutateAdjust } = useMutation({
    mutationFn: (args: { id: string; body: AccountAdjustReq }) => adjustAccountBalance(args.id, args.body),
  });

  // 조회가 끝나 성공적으로 응답을 받았을 때만 "기존 결제수단 이어가기 또는 신규 등록"을 고를 수 있게 한다.
  const accountsReady = !isAccountsLoading && !isAccountsError;
  const displayForm = accountsReady && (!existingDefault || showForm);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || submitting) return; // 같은 버튼 연타로 중복 계좌 생성 방지.

    setSubmitError(null);
    setSubmitting(true);

    try {
      let created = await mutateCreate({ name: name.trim(), type, isDefault: true });

      if (!created.isDefault) {
        try {
          created = await mutateSetDefault(created.id);
        } catch {
          // create는 성공했으니 막지 않고, 부분 성공 상태를 토스트로 숨기지 않고 안내한다(§5).
          toast.error("결제수단은 등록했지만 기본으로 설정하진 못했어요. 프로필에서 다시 설정할 수 있어요.");
        }
      }

      if (ledgerMode === "ASSET_MANAGEMENT" && balanceInput.trim()) {
        const amount = Number(balanceInput.replace(/[^0-9-]/g, ""));
        if (!Number.isNaN(amount)) {
          try {
            await mutateAdjust({
              id: created.id,
              body: { mode: "ABSOLUTE", actualBalance: amount, reason: "온보딩 초기 잔액" },
            });
          } catch {
            toast.error("결제수단은 등록했지만 잔액은 반영하지 못했어요. 잔액 조정에서 다시 설정할 수 있어요.");
          }
        }
      }

      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      onDone(created.name);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "결제수단 등록에 실패했어요.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200">
      <StepBackLink onClick={onBack} disabled={submitting} />
      <h1 id={ONBOARDING_STEP_HEADING_ID} tabIndex={-1} className="text-xl font-extrabold text-ll-ink break-keep outline-none">
        가장 자주 쓰는 결제수단이 있나요?
      </h1>

      {isAccountsLoading && (
        <div className="mt-6">
          <StatePanel tone="neutral" loading title="이미 등록한 결제수단이 있는지 확인하고 있어요" />
        </div>
      )}

      {isAccountsError && !(accountsError instanceof AuthError) && (
        <div className="mt-6">
          <StatePanel
            tone="warn"
            title="결제수단을 불러오지 못했어요"
            description="이미 등록된 결제수단이 있는지 확인해야 중복 등록을 막을 수 있어요. 네트워크 상태를 확인한 뒤 다시 시도해 주세요."
            action={{ label: "다시 시도", onClick: () => refetchAccounts() }}
          />
        </div>
      )}

      {accountsReady && existingDefault && !showForm && (
        <div className="mt-6 rounded-2xl border border-ll-mint bg-ll-mint/10 p-4">
          <p className="text-xs font-semibold text-ll-pencil">이미 등록해두신 기본 결제수단이 있어요</p>
          <p className="mt-1 text-sm font-bold text-ll-ink break-keep">
            {ACCOUNT_TYPE_LABEL[existingDefault.type]} · {existingDefault.name}
          </p>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="mt-3 flex min-h-[36px] items-center text-xs font-semibold text-ll-pencil underline underline-offset-2 hover:text-ll-ink"
          >
            다른 결제수단을 새로 등록할게요
          </button>
        </div>
      )}

      {displayForm && (
        <form id="onboarding-account-form" className="mt-6 space-y-5" onSubmit={handleSubmit}>
          <div>
            <Label className="mb-2 block text-xs font-semibold text-ll-pencil">종류</Label>
            <div className="flex flex-wrap gap-2" role="group" aria-label="결제수단 종류">
              {typeOptions.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  aria-pressed={type === t}
                  disabled={submitting}
                  className={[
                    "flex min-h-[44px] items-center gap-1.5 rounded-xl px-3 text-sm font-medium transition-colors",
                    type === t
                      ? "border-2 border-ll-tomato bg-ll-cream text-ll-ink"
                      : "border border-ll-ink/15 bg-white text-ll-pencil hover:border-ll-ink/30",
                  ].join(" ")}
                >
                  {ACCOUNT_TYPE_ICONS[t]}
                  {ACCOUNT_TYPE_LABEL[t]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="onboarding-account-name" className="mb-1.5 block text-xs font-semibold text-ll-pencil">
              이름
            </Label>
            <input
              id="onboarding-account-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={submitting}
              required
              placeholder="예: 신한 딥드림 카드"
              className="block w-full rounded-xl border border-ll-ink/15 bg-white px-4 py-3 text-base text-ll-ink placeholder-ll-pencil/40 outline-none transition-colors focus-visible:border-ll-tomato focus-visible:ring-2 focus-visible:ring-ll-tomato/30 disabled:opacity-60"
            />
          </div>

          {ledgerMode === "ASSET_MANAGEMENT" && (
            <div>
              <Label htmlFor="onboarding-account-balance" className="mb-1.5 block text-xs font-semibold text-ll-pencil">
                현재 잔액 (선택)
              </Label>
              <input
                id="onboarding-account-balance"
                inputMode="numeric"
                value={balanceInput}
                onChange={(e) => setBalanceInput(e.target.value.replace(/[^0-9]/g, ""))}
                disabled={submitting}
                placeholder="0"
                className="block w-full rounded-xl border border-ll-ink/15 bg-white px-4 py-3 text-right text-base text-ll-ink placeholder-ll-pencil/40 outline-none transition-colors focus-visible:border-ll-tomato focus-visible:ring-2 focus-visible:ring-ll-tomato/30 disabled:opacity-60"
              />
            </div>
          )}

          {submitError && <StatePanel tone="warn" title="등록하지 못했어요" description={submitError} />}
        </form>
      )}

      <OnboardingCtaBar>
        {isAccountsLoading || accountsError instanceof AuthError ? (
          <button
            type="button"
            disabled
            aria-busy="true"
            className="flex min-h-[48px] w-full items-center justify-center rounded-xl bg-ll-ink text-base font-bold text-ll-paper opacity-50"
          >
            확인하는 중...
          </button>
        ) : isAccountsError ? (
          <button
            type="button"
            onClick={() => refetchAccounts()}
            className="flex min-h-[48px] w-full items-center justify-center rounded-xl bg-ll-ink text-base font-bold text-ll-paper transition-colors hover:bg-ll-ink/90"
          >
            다시 시도
          </button>
        ) : displayForm ? (
          <button
            type="submit"
            form="onboarding-account-form"
            disabled={!name.trim() || submitting}
            aria-busy={submitting}
            className="flex min-h-[48px] w-full items-center justify-center rounded-xl bg-ll-ink text-base font-bold text-ll-paper transition-colors hover:bg-ll-ink/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "등록하는 중..." : "등록하고 다음"}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onDone(existingDefault?.name ?? null)}
            className="flex min-h-[48px] w-full items-center justify-center rounded-xl bg-ll-ink text-base font-bold text-ll-paper transition-colors hover:bg-ll-ink/90"
          >
            이미 등록한 결제수단으로 계속
          </button>
        )}
        {/* "나중에 등록"은 새로 만들지 않고 건너뛰는 동작이라, 조회가 아직 안 끝났거나(중복 여부를 모름)
            이미 기본 결제수단이 있어 위 버튼과 의미가 같아지는 경우(폼이 안 보일 때)에는 노출하지 않는다. */}
        {displayForm && (
          <button
            type="button"
            onClick={() => onDone(existingDefault?.name ?? null)}
            disabled={submitting}
            className="flex min-h-[44px] w-full items-center justify-center rounded-xl text-sm font-semibold text-ll-pencil underline underline-offset-2 hover:text-ll-ink disabled:cursor-not-allowed disabled:opacity-50"
          >
            나중에 등록
          </button>
        )}
      </OnboardingCtaBar>
    </div>
  );
}
