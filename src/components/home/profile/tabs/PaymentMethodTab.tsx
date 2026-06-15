"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CreditCard, Plus, Check, X, Star, Pencil, Trash2 } from "lucide-react";
import { getAccounts, createAccount, updateAccount, deleteAccount, setDefaultAccount } from "@/src/lib/api/accountApi";

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

const ACCOUNT_TYPE_OPTIONS: AccountType[] = [
  "CASH",
  "BANK",
  "CREDIT_CARD",
  "CHECK_CARD",
  "SAVINGS_INVESTMENT",
  "ETC",
];

export default function PaymentMethodTab() {
  const queryClient = useQueryClient();
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [accountForm, setAccountForm] = useState<{ name: string; type: AccountType }>({ name: "", type: "CREDIT_CARD" });
  const [editingAccount, setEditingAccount] = useState<Record<string, { name: string; type: AccountType }>>({});

  const { data: accounts = [], isLoading: isAccountsLoading } = useQuery({
    queryKey: ["accounts"],
    queryFn: getAccounts,
  });

  const { mutate: mutateCreateAccount, isPending: isCreatingAccount } = useMutation({
    mutationFn: createAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      setShowAccountForm(false);
      setAccountForm({ name: "", type: "CREDIT_CARD" });
    },
  });

  const { mutate: mutateUpdateAccount } = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Account> }) => updateAccount(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
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

  const handleAccountEditSave = (id: string) => {
    const draft = editingAccount[id];
    if (!draft.name.trim()) return;
    mutateUpdateAccount({ id, data: draft });
    setEditingAccount((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-white">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4.5 h-4.5 text-sky-500" />
            <h2 className="font-bold text-gray-900 text-base">결제수단 관리</h2>
          </div>
          {!showAccountForm && (
            <button
              type="button"
              onClick={() => setShowAccountForm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-sky-600 bg-sky-50 hover:bg-sky-100 rounded-xl transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />추가
            </button>
          )}
        </div>

        {isAccountsLoading ? (
          <div className="divide-y divide-gray-100">
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
          <div className="px-6 py-12 text-center bg-gray-50/20">
            <p className="text-sm text-gray-400 mb-4 font-medium">등록된 결제수단이 없습니다.</p>
            <button
              type="button"
              onClick={() => setShowAccountForm(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-xl transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />결제수단 추가
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100/60 bg-white">
            {accounts.map((account) => {
              const isEditingThis = account.id in editingAccount;
              const draft = editingAccount[account.id];
              return (
                <li key={account.id} className="px-6 py-4 transition-colors hover:bg-gray-50/30">
                  {isEditingThis ? (
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <input
                        autoFocus
                        value={draft.name}
                        onChange={(e) => setEditingAccount((prev) => ({ ...prev, [account.id]: { ...draft, name: e.target.value } }))}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleAccountEditSave(account.id);
                          if (e.key === "Escape") setEditingAccount((prev) => { const next = { ...prev }; delete next[account.id]; return next; });
                        }}
                        className="flex-1 min-w-[150px] text-sm border border-sky-400 rounded-xl px-3 py-1.5 outline-none focus:ring-4 focus:ring-sky-100 bg-white"
                      />
                      <select
                        value={draft.type}
                        onChange={(e) => setEditingAccount((prev) => ({ ...prev, [account.id]: { ...draft, type: e.target.value as AccountType } }))}
                        className="text-sm border border-gray-300 rounded-xl px-3 py-1.5 outline-none focus:ring-4 focus:ring-sky-100 bg-white"
                      >
                        {ACCOUNT_TYPE_OPTIONS.map((t) => (
                          <option key={t} value={t}>{ACCOUNT_TYPE_LABEL[t]}</option>
                        ))}
                      </select>
                      <div className="flex gap-1">
                        <button onClick={() => handleAccountEditSave(account.id)} className="p-2 text-sky-600 hover:bg-sky-50 rounded-xl transition-colors">
                          <Check className="w-4.5 h-4.5" />
                        </button>
                        <button onClick={() => setEditingAccount((prev) => { const next = { ...prev }; delete next[account.id]; return next; })} className="p-2 text-gray-400 hover:bg-gray-100 rounded-xl transition-colors">
                          <X className="w-4.5 h-4.5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-gray-800 truncate">{account.name}</p>
                          {account.isDefault && (
                            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-600 border border-sky-100 flex-shrink-0">
                              <Star className="w-2.5 h-2.5 fill-sky-600 text-sky-600" />기본
                            </span>
                          )}
                          {account.isSystem && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 text-[10px] font-bold flex-shrink-0">
                              시스템
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-1 font-medium">{ACCOUNT_TYPE_LABEL[account.type]}</p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {!account.isDefault && (
                          <button onClick={() => mutateSetDefault(account.id)} title="기본 결제수단으로 설정" className="p-2 text-gray-400 hover:text-sky-500 hover:bg-sky-50 rounded-xl transition-colors">
                            <Star className="w-4 h-4" />
                          </button>
                        )}
                        {!account.isSystem && (
                          <>
                            <button onClick={() => setEditingAccount((prev) => ({ ...prev, [account.id]: { name: account.name, type: account.type } }))} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button onClick={() => { if (confirm(`결제수단 "${account.name}"을(를) 삭제하시겠습니까?`)) { mutateDeleteAccount(account.id); } }} className="p-2 text-red-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </li>
              );
            })}

            {showAccountForm && (
              <li className="px-6 py-5 bg-sky-50/20 border-t border-sky-100/40">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <input
                    autoFocus
                    placeholder="결제수단 이름"
                    value={accountForm.name}
                    onChange={(e) => setAccountForm((prev) => ({ ...prev, name: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && accountForm.name.trim()) mutateCreateAccount({ name: accountForm.name.trim(), type: accountForm.type });
                      if (e.key === "Escape") setShowAccountForm(false);
                    }}
                    className="flex-1 min-w-[200px] text-sm border border-gray-300 rounded-xl px-3.5 py-2 outline-none focus:ring-4 focus:ring-sky-100 focus:border-sky-400 bg-white"
                  />
                  <select
                    value={accountForm.type}
                    onChange={(e) => setAccountForm((prev) => ({ ...prev, type: e.target.value as AccountType }))}
                    className="text-sm border border-gray-300 rounded-xl px-3.5 py-2 outline-none focus:ring-4 focus:ring-sky-100 focus:border-sky-400 bg-white"
                  >
                    {ACCOUNT_TYPE_OPTIONS.map((t) => (
                      <option key={t} value={t}>{ACCOUNT_TYPE_LABEL[t]}</option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { if (accountForm.name.trim()) mutateCreateAccount({ name: accountForm.name.trim(), type: accountForm.type }); }}
                      disabled={isCreatingAccount || !accountForm.name.trim()}
                      className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 disabled:opacity-50 rounded-xl transition-colors shadow-sm"
                    >
                      <Check className="w-3.5 h-3.5" />저장
                    </button>
                    <button onClick={() => { setShowAccountForm(false); setAccountForm({ name: "", type: "CREDIT_CARD" }); }} className="p-2 text-gray-400 hover:bg-gray-100 rounded-xl transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
