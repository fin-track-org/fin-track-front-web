"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CreditCard, Plus, Check, X, Star, Pencil, Trash2, Wallet, Building2, Landmark, Shapes } from "lucide-react";
import { getAccounts, createAccount, updateAccount, deleteAccount, setDefaultAccount } from "@/src/lib/api/accountApi";
import { useUserSettings } from "@/src/hook/useUserSettings";

const Skeleton = ({ className }: { className?: string }) => (
  <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
);

const ACCOUNT_TYPE_LABEL: Record<AccountType, string> = {
  CASH: "현금",
  BANK: "은행 계좌",
  CREDIT_CARD: "신용카드",
  CHECK_CARD: "체크카드",
  SAVINGS_INVESTMENT: "저축/투자",
  ETC: "기타",
};

const ACCOUNT_TYPE_ICONS: Record<AccountType, React.ReactNode> = {
  CASH: <Wallet className="w-4 h-4" />,
  BANK: <Landmark className="w-4 h-4" />,
  CREDIT_CARD: <CreditCard className="w-4 h-4" />,
  CHECK_CARD: <CreditCard className="w-4 h-4" />,
  SAVINGS_INVESTMENT: <Building2 className="w-4 h-4" />,
  ETC: <Shapes className="w-4 h-4" />,
};

const ACCOUNT_TYPE_OPTIONS: AccountType[] = [
  "CASH",
  "BANK",
  "CREDIT_CARD",
  "CHECK_CARD",
  "SAVINGS_INVESTMENT",
  "ETC",
];

function NumberInput({ value, onChange, placeholder }: { value: number | null, onChange: (v: number | null) => void, placeholder: string }) {
  const [str, setStr] = useState(value != null ? value.toLocaleString() : "");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, "");
    if (!raw) {
      setStr("");
      onChange(null);
      return;
    }
    const num = parseInt(raw, 10);
    setStr(num.toLocaleString());
    onChange(num);
  };

  return (
    <div className="relative">
      <input
        type="text"
        value={str}
        onChange={handleChange}
        placeholder={placeholder}
        className="w-full text-sm border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-4 focus:ring-sky-100 focus:border-sky-400 bg-white transition-all text-right pr-8"
      />
      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-medium pointer-events-none">원</span>
    </div>
  );
}

function AccountForm({ 
  initialData, 
  onSave, 
  onCancel, 
  isSubmitting,
  ledgerMode
}: { 
  initialData?: Account; 
  onSave: (data: any) => void; 
  onCancel: () => void;
  isSubmitting?: boolean;
  ledgerMode?: string;
}) {
  const [name, setName] = useState(initialData?.name || "");
  const [type, setType] = useState<AccountType>(initialData?.type || (ledgerMode === "SIMPLE" ? "CREDIT_CARD" : "SAVINGS_INVESTMENT"));

  // Ensure default type is valid if initialData is not provided and ledgerMode is SIMPLE
  useState(() => {
    if (!initialData && ledgerMode === "SIMPLE" && type === "SAVINGS_INVESTMENT") {
      setType("CREDIT_CARD");
    }
  });

  const [creditLimit, setCreditLimit] = useState<number | null>(initialData?.creditLimit ?? null);
  const [performanceTarget, setPerformanceTarget] = useState<number | null>(initialData?.performanceTarget ?? null);

  return (
    <div className="p-5 lg:p-6 bg-gray-50/50 rounded-2xl border border-sky-100 shadow-sm mt-2 mb-4">
      <div className="space-y-5">
        {/* 결제수단 종류 */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-2">결제수단 종류</label>
          <div className="flex flex-wrap gap-2">
            {ACCOUNT_TYPE_OPTIONS.filter((t) => !(ledgerMode === "SIMPLE" && t === "SAVINGS_INVESTMENT")).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                  type === t 
                    ? "bg-sky-500 text-white shadow-md ring-2 ring-sky-500 ring-offset-1" 
                    : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 hover:border-gray-300"
                }`}
              >
                {ACCOUNT_TYPE_ICONS[t]}
                {ACCOUNT_TYPE_LABEL[t]}
              </button>
            ))}
          </div>
        </div>

        {/* 이름 입력 */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-2">결제수단 이름 <span className="text-red-400">*</span></label>
          <input
            autoFocus
            placeholder="예: 신한 딥드림 카드, 국민은행 월급통장 등"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full text-sm border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-4 focus:ring-sky-100 focus:border-sky-400 bg-white transition-all shadow-sm"
          />
        </div>

        {/* 선택적 입력: 결제 한도 및 실적 목표 */}
        {type !== "SAVINGS_INVESTMENT" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-2">결제 한도 (선택)</label>
              <NumberInput value={creditLimit} onChange={setCreditLimit} placeholder="한도 금액" />
              <p className="text-[11px] text-gray-400 mt-1.5">월 결제 한도나 예산 목표액을 적어두세요.</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-2">실적 목표 (선택)</label>
              <NumberInput value={performanceTarget} onChange={setPerformanceTarget} placeholder="목표 금액" />
              <p className="text-[11px] text-gray-400 mt-1.5">카드 전월 실적 조건 등을 기록해두세요.</p>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4 border-t border-gray-200/60 mt-4">
          <button 
            type="button" 
            onClick={onCancel} 
            className="px-5 py-2.5 text-sm font-semibold text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors shadow-sm"
          >
            취소
          </button>
          <button
            type="button"
            disabled={!name.trim() || isSubmitting}
            onClick={() => onSave({ 
              name: name.trim(), 
              type, 
              creditLimit: type === "SAVINGS_INVESTMENT" ? null : (creditLimit || null), 
              performanceTarget: type === "SAVINGS_INVESTMENT" ? null : (performanceTarget || null)
            })}
            className="flex items-center gap-1.5 px-6 py-2.5 text-sm font-semibold text-white bg-sky-600 hover:bg-sky-700 disabled:opacity-50 rounded-xl transition-colors shadow-sm"
          >
            <Check className="w-4 h-4" />{initialData ? "수정 완료" : "추가하기"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PaymentMethodTab() {
  const queryClient = useQueryClient();
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);

  const { userSetting } = useUserSettings();

  const { data: accounts = [], isLoading: isAccountsLoading } = useQuery({
    queryKey: ["accounts"],
    queryFn: getAccounts,
  });

  const { mutate: mutateCreateAccount, isPending: isCreatingAccount } = useMutation({
    mutationFn: createAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      setShowAccountForm(false);
    },
  });

  const { mutate: mutateUpdateAccount, isPending: isUpdatingAccount } = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Account> }) => updateAccount(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      setEditingAccountId(null);
    },
  });

  const { mutate: mutateDeleteAccount } = useMutation({
    mutationFn: deleteAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
  });

  const { mutate: mutateSetDefault } = useMutation({
    mutationFn: setDefaultAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden pb-4">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-white">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-sky-500" />
            <h2 className="font-bold text-gray-900 text-lg">결제수단 관리</h2>
          </div>
          {!showAccountForm && !editingAccountId && (
            <button
              type="button"
              onClick={() => setShowAccountForm(true)}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-xl transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />추가
            </button>
          )}
        </div>

        <div className="px-6 py-4 border-b border-gray-100/60 bg-sky-50/30">
          <p className="text-xs font-medium text-gray-500 leading-relaxed">
            자주 사용하는 결제수단을 기본으로 설정하면 내역 추가 시 자동으로 선택됩니다. <br className="hidden sm:block" />
            각 결제수단의 한도 및 실적 목표를 등록하여 효율적으로 소비를 관리해보세요.
          </p>
        </div>

        {showAccountForm && (
          <div className="px-4 sm:px-6">
            <AccountForm 
              onSave={mutateCreateAccount} 
              onCancel={() => setShowAccountForm(false)} 
              isSubmitting={isCreatingAccount} 
              ledgerMode={userSetting?.ledgerMode}
            />
          </div>
        )}

        {isAccountsLoading ? (
          <div className="divide-y divide-gray-100 mt-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between px-6 py-5">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3.5 w-16" />
                </div>
                <Skeleton className="h-8 w-16 rounded-xl" />
              </div>
            ))}
          </div>
        ) : accounts.length === 0 && !showAccountForm ? (
          <div className="px-6 py-12 mt-4 mx-4 text-center bg-gray-50 border border-dashed border-gray-200 rounded-2xl">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm border border-gray-100">
              <CreditCard className="w-5 h-5 text-gray-400" />
            </div>
            <p className="text-sm text-gray-500 mb-4 font-medium">등록된 결제수단이 없습니다.</p>
            <button
              type="button"
              onClick={() => setShowAccountForm(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-sky-600 bg-sky-50 hover:bg-sky-100 rounded-xl transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />새 결제수단 등록하기
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100/60 bg-white">
            {[...accounts].sort((a, b) => {
              if (a.isDefault) return -1;
              if (b.isDefault) return 1;
              return a.sortOrder - b.sortOrder;
            }).map((account) => {
              const isEditingThis = editingAccountId === account.id;

              if (isEditingThis) {
                return (
                  <li key={account.id} className="px-4 sm:px-6 py-2">
                    <AccountForm 
                      initialData={account} 
                      onSave={(data) => mutateUpdateAccount({ id: account.id, data })} 
                      onCancel={() => setEditingAccountId(null)} 
                      isSubmitting={isUpdatingAccount} 
                      ledgerMode={userSetting?.ledgerMode}
                    />
                  </li>
                );
              }

              return (
                <li key={account.id} className="px-6 py-5 transition-colors hover:bg-gray-50/50 group">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="text-gray-400 bg-gray-100 p-1.5 rounded-lg flex-shrink-0">
                           {ACCOUNT_TYPE_ICONS[account.type]}
                        </div>
                        <p className="text-[15px] font-bold text-gray-800 truncate">{account.name}</p>
                        {account.isDefault && (
                          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[11px] font-bold bg-sky-100 text-sky-700 flex-shrink-0 ml-1">
                            <Star className="w-3 h-3 fill-sky-700 text-sky-700" />기본
                          </span>
                        )}
                        {account.isSystem && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-gray-200 text-gray-600 text-[11px] font-bold flex-shrink-0 ml-1">
                            시스템
                          </span>
                        )}
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs">
                        <span className="text-gray-500 font-medium">{ACCOUNT_TYPE_LABEL[account.type]}</span>
                        
                        {( (account.creditLimit != null && account.creditLimit > 0) || (account.performanceTarget != null && account.performanceTarget > 0) ) && (
                          <div className="w-1 h-1 bg-gray-300 rounded-full" />
                        )}
                        
                        {account.creditLimit != null && account.creditLimit > 0 && (
                          <span className="text-gray-600">
                            한도 <strong className="font-semibold text-gray-800">{account.creditLimit.toLocaleString()}</strong>원
                          </span>
                        )}
                        
                        {account.performanceTarget != null && account.performanceTarget > 0 && (
                          <span className="text-sky-600 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-100 font-medium">
                            목표 {account.performanceTarget.toLocaleString()}원
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1.5 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      {!account.isDefault && account.type !== "SAVINGS_INVESTMENT" && (
                        <button onClick={() => mutateSetDefault(account.id)} title="기본 결제수단으로 설정" className="p-2 text-gray-400 hover:text-sky-500 hover:bg-sky-50 rounded-xl transition-colors">
                          <Star className="w-4 h-4" />
                        </button>
                      )}
                      {!account.isSystem && (
                        <>
                          <button onClick={() => setEditingAccountId(account.id)} className="p-2 text-gray-500 hover:text-sky-600 hover:bg-sky-50 rounded-xl transition-colors">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => { if (window.confirm(`결제수단 "${account.name}"을(를) 삭제하시겠습니까?`)) { mutateDeleteAccount(account.id); } }} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
