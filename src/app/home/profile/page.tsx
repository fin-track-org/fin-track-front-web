"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  User,
  Mail,
  Calendar,
  Clock,
  Pencil,
  Check,
  X,
  Plus,
  Trash2,
  Wallet,
  CreditCard,
  Star,
} from "lucide-react";
import { fetchMe, updateMe } from "@/src/lib/api/userApi";
import {
  getBudgetTemplates,
  createBudgetTemplate,
  updateBudgetTemplate,
  deleteBudgetTemplate,
} from "@/src/lib/api/budgetApi";
import { getCategories } from "@/src/lib/api/categoryApi";
import { AuthError } from "@/src/lib/api/authError";
import {
  getAccounts,
  createAccount,
  updateAccount,
  deleteAccount,
  setDefaultAccount,
} from "@/src/lib/api/accountApi";

const ACCOUNT_TYPE_LABEL: Record<AccountType, string> = {
  CASH: "현금",
  BANK: "은행 계좌",
  CREDIT_CARD: "신용카드",
  CHECK_CARD: "체크카드",
  ETC: "기타",
};

const ACCOUNT_TYPE_OPTIONS: AccountType[] = [
  "CASH",
  "BANK",
  "CREDIT_CARD",
  "CHECK_CARD",
  "ETC",
];

const Skeleton = ({ className }: { className?: string }) => (
  <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
);

function formatDate(dateStr: string | null) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatAmount(n: number) {
  return n.toLocaleString("ko-KR") + "원";
}

export default function ProfilePage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  /* ── 사용자 정보 ── */
  const [isEditing, setIsEditing] = useState(false);
  const [nicknameInput, setNicknameInput] = useState("");

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["me"],
    queryFn: fetchMe,
    retry: false,
  });

  useEffect(() => {
    if (error instanceof AuthError) router.replace("/login");
  }, [error, router]);

  const { mutate: mutateNickname, isPending: isNicknamePending, error: nicknameError } = useMutation({
    mutationFn: updateMe,
    onSuccess: (updated) => {
      queryClient.setQueryData(["me"], updated);
      setIsEditing(false);
    },
  });

  const handleEdit = () => {
    setNicknameInput(data?.nickname ?? "");
    setIsEditing(true);
  };

  const handleNicknameSave = () => {
    const trimmed = nicknameInput.trim();
    if (!trimmed || trimmed === data?.nickname) { setIsEditing(false); return; }
    mutateNickname({ nickname: trimmed });
  };

  /* ── 카테고리 목록 ── */
  const { data: categories = [] } = useQuery({
    queryKey: ["categories", "EXPENSE"],
    queryFn: () => getCategories("EXPENSE"),
  });

  /* ── 예산 템플릿 ── */
  const {
    data: templates = [],
    isLoading: isTemplatesLoading,
  } = useQuery({
    queryKey: ["budgetTemplates"],
    queryFn: getBudgetTemplates,
  });

  // 인라인 수정 상태: templateId → 입력 중인 금액
  const [editingAmounts, setEditingAmounts] = useState<Record<string, string>>({});

  // 신규 추가 폼
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCategoryId, setNewCategoryId] = useState("");
  const [newAmount, setNewAmount] = useState("");

  const { mutate: mutateCreate, isPending: isCreating } = useMutation({
    mutationFn: createBudgetTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgetTemplates"] });
      setShowAddForm(false);
      setNewCategoryId("");
      setNewAmount("");
    },
  });

  const { mutate: mutateUpdate } = useMutation({
    mutationFn: ({ id, amount }: { id: string; amount: number }) =>
      updateBudgetTemplate(id, { targetAmount: amount }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["budgetTemplates"] }),
  });

  const { mutate: mutateDelete } = useMutation({
    mutationFn: deleteBudgetTemplate,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["budgetTemplates"] }),
  });

  const handleAmountSave = (id: string) => {
    const val = Number(editingAmounts[id]);
    if (!val || val <= 0) return;
    mutateUpdate({ id, amount: val });
    setEditingAmounts((prev) => { const next = { ...prev }; delete next[id]; return next; });
  };

  const handleAddSubmit = () => {
    const amount = Number(newAmount);
    if (!newCategoryId || !amount || amount <= 0) return;
    mutateCreate({ categoryId: newCategoryId, targetAmount: amount });
  };

  /* ── 결제수단 ── */
  const { data: accounts = [], isLoading: isAccountsLoading } = useQuery({
    queryKey: ["accounts"],
    queryFn: getAccounts,
  });

  // 추가 폼 상태
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [accountForm, setAccountForm] = useState<{ name: string; type: AccountType }>({
    name: "",
    type: "CREDIT_CARD",
  });

  // 인라인 수정 상태: accountId → { name, type }
  const [editingAccount, setEditingAccount] = useState<Record<string, { name: string; type: AccountType }>>({});

  const { mutate: mutateCreateAccount, isPending: isCreatingAccount } = useMutation({
    mutationFn: createAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      setShowAccountForm(false);
      setAccountForm({ name: "", type: "CREDIT_CARD" });
    },
  });

  const { mutate: mutateUpdateAccount } = useMutation({
    mutationFn: ({ id, body }: { id: string; body: AccountUpdateReq }) =>
      updateAccount(id, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["accounts"] }),
  });

  const { mutate: mutateDeleteAccount } = useMutation({
    mutationFn: deleteAccount,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["accounts"] }),
  });

  const { mutate: mutateSetDefault } = useMutation({
    mutationFn: setDefaultAccount,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["accounts"] }),
  });

  const handleAccountEditSave = (id: string) => {
    const draft = editingAccount[id];
    if (!draft?.name.trim()) return;
    mutateUpdateAccount({ id, body: { name: draft.name.trim(), type: draft.type } });
    setEditingAccount((prev) => { const next = { ...prev }; delete next[id]; return next; });
  };

  /* ── 로딩 ── */
  if (isLoading) {
    return (
      <div className="space-y-6 max-w-xl">
        <Skeleton className="h-7 w-32" />
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm divide-y divide-gray-100">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center justify-between px-6 py-5">
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-5 w-48" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ── 에러 ── */
  if (isError || !data) {
    return (
      <p className="py-16 text-center text-red-500">
        {(error as Error)?.message ?? "사용자 정보를 불러오는데 실패했습니다."}
      </p>
    );
  }

  /* ── 이미 템플릿이 있는 카테고리 ID 집합 ── */
  const existingCategoryIds = new Set(templates.map((t) => t.categoryId));
  const availableCategories = categories.filter((c) => !existingCategoryIds.has(c.id));

  return (
    <div className="space-y-6 max-w-xl">
      <h1 className="text-2xl font-bold text-gray-900">마이페이지</h1>

      {/* ── 프로필 카드 ── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex items-center gap-4 px-6 py-5 border-b border-gray-100">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-sky-500 to-purple-500 flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
            {data.nickname[0]}
          </div>
          <div>
            <p className="font-semibold text-gray-900">{data.nickname}</p>
            <p className="text-xs text-gray-400 mt-0.5">Free 플랜</p>
          </div>
        </div>

        <dl className="divide-y divide-gray-100">
          {/* 닉네임 */}
          <div className="flex items-center justify-between px-6 py-5">
            <div className="min-w-0 flex-1">
              <dt className="flex items-center gap-1.5 text-xs font-medium text-gray-400 mb-1">
                <User className="w-3.5 h-3.5" />닉네임
              </dt>
              {isEditing ? (
                <div className="space-y-2">
                  <input
                    autoFocus
                    value={nicknameInput}
                    onChange={(e) => setNicknameInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleNicknameSave(); if (e.key === "Escape") setIsEditing(false); }}
                    maxLength={20}
                    className="w-full text-sm border border-sky-400 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-sky-200"
                  />
                  {nicknameError && <p className="text-xs text-red-500">{(nicknameError as Error).message}</p>}
                </div>
              ) : (
                <dd className="text-sm font-medium text-gray-800">{data.nickname}</dd>
              )}
            </div>
            <div className="ml-4 flex items-center gap-1 flex-shrink-0">
              {isEditing ? (
                <>
                  <button onClick={handleNicknameSave} disabled={isNicknamePending} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-sky-600 hover:bg-sky-700 disabled:opacity-50 rounded-lg transition-colors">
                    <Check className="w-3.5 h-3.5" />저장
                  </button>
                  <button onClick={() => setIsEditing(false)} disabled={isNicknamePending} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                    <X className="w-3.5 h-3.5" />취소
                  </button>
                </>
              ) : (
                <button onClick={handleEdit} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                  <Pencil className="w-3.5 h-3.5" />수정
                </button>
              )}
            </div>
          </div>

          {/* 이메일 */}
          <div className="px-6 py-5">
            <dt className="flex items-center gap-1.5 text-xs font-medium text-gray-400 mb-1"><Mail className="w-3.5 h-3.5" />이메일</dt>
            <dd className="text-sm font-medium text-gray-800">{data.email}</dd>
          </div>

          {/* 가입일 */}
          <div className="px-6 py-5">
            <dt className="flex items-center gap-1.5 text-xs font-medium text-gray-400 mb-1"><Calendar className="w-3.5 h-3.5" />가입일</dt>
            <dd className="text-sm font-medium text-gray-800">{formatDate(data.createdAt)}</dd>
          </div>

          {/* 정보 수정일 */}
          <div className="px-6 py-5">
            <dt className="flex items-center gap-1.5 text-xs font-medium text-gray-400 mb-1"><Clock className="w-3.5 h-3.5" />정보 수정일</dt>
            <dd className="text-sm font-medium text-gray-800">{formatDate(data.updatedAt)}</dd>
          </div>
        </dl>
      </div>

      {/* ── 예산 템플릿 카드 ── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-sky-600" />
            <h2 className="font-semibold text-gray-900">월 예산 템플릿</h2>
          </div>
          {!showAddForm && availableCategories.length > 0 && (
            <button
              onClick={() => { setShowAddForm(true); setNewCategoryId(availableCategories[0]?.id ?? ""); }}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />추가
            </button>
          )}
        </div>

        {isTemplatesLoading ? (
          <div className="divide-y divide-gray-100">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between px-6 py-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        ) : templates.length === 0 && !showAddForm ? (
          <div className="px-6 py-10 text-center">
            <p className="text-sm text-gray-500 mb-4">아직 설정된 예산 템플릿이 없어요.</p>
            <button
              onClick={() => { setShowAddForm(true); setNewCategoryId(availableCategories[0]?.id ?? ""); }}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />예산 템플릿 추가
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {templates.map((t) => {
              const isEditingThis = t.id in editingAmounts;
              return (
                <li key={t.id} className="flex items-center justify-between px-6 py-4 gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800">{t.categoryName}</p>
                    {t.subCategoryName && (
                      <p className="text-xs text-gray-400 mt-0.5">{t.subCategoryName}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {isEditingThis ? (
                      <>
                        <div className="relative">
                          <input
                            autoFocus
                            type="number"
                            value={editingAmounts[t.id]}
                            onChange={(e) => setEditingAmounts((prev) => ({ ...prev, [t.id]: e.target.value }))}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleAmountSave(t.id);
                              if (e.key === "Escape") setEditingAmounts((prev) => { const next = { ...prev }; delete next[t.id]; return next; });
                            }}
                            className="w-32 text-sm text-right border border-sky-400 rounded-lg px-3 py-1.5 pr-6 outline-none focus:ring-2 focus:ring-sky-200"
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">원</span>
                        </div>
                        <button onClick={() => handleAmountSave(t.id)} className="p-1.5 text-sky-600 hover:bg-sky-50 rounded-lg transition-colors">
                          <Check className="w-4 h-4" />
                        </button>
                        <button onClick={() => setEditingAmounts((prev) => { const next = { ...prev }; delete next[t.id]; return next; })} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="text-sm font-semibold text-gray-700">{formatAmount(t.targetAmount)}</span>
                        <button
                          onClick={() => setEditingAmounts((prev) => ({ ...prev, [t.id]: String(t.targetAmount) }))}
                          className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => mutateDelete(t.id)}
                          className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </li>
              );
            })}

            {/* 추가 폼 */}
            {showAddForm && (
              <li className="px-6 py-4 bg-sky-50/50">
                <div className="flex items-center gap-3 flex-wrap">
                  <select
                    value={newCategoryId}
                    onChange={(e) => setNewCategoryId(e.target.value)}
                    className="flex-1 min-w-0 text-sm border border-gray-300 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400 bg-white"
                  >
                    {availableCategories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <div className="relative">
                    <input
                      type="number"
                      placeholder="0"
                      value={newAmount}
                      onChange={(e) => setNewAmount(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleAddSubmit(); if (e.key === "Escape") setShowAddForm(false); }}
                      className="w-32 text-sm text-right border border-gray-300 rounded-lg px-3 py-1.5 pr-6 outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">원</span>
                  </div>
                  <button
                    onClick={handleAddSubmit}
                    disabled={isCreating}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-sky-600 hover:bg-sky-700 disabled:opacity-50 rounded-lg transition-colors"
                  >
                    <Check className="w-3.5 h-3.5" />저장
                  </button>
                  <button
                    onClick={() => { setShowAddForm(false); setNewAmount(""); }}
                    className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </li>
            )}
          </ul>
        )}
      </div>

      {/* ── 결제수단 카드 ── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-sky-600" />
            <h2 className="font-semibold text-gray-900">결제수단 관리</h2>
          </div>
          {!showAccountForm && (
            <button
              onClick={() => setShowAccountForm(true)}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />추가
            </button>
          )}
        </div>

        {isAccountsLoading ? (
          <div className="divide-y divide-gray-100">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between px-6 py-4">
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
            ))}
          </div>
        ) : accounts.length === 0 && !showAccountForm ? (
          <div className="px-6 py-10 text-center">
            <p className="text-sm text-gray-500 mb-4">등록된 결제수단이 없어요.</p>
            <button
              onClick={() => setShowAccountForm(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />결제수단 추가
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {accounts.map((account) => {
              const isEditingThis = account.id in editingAccount;
              const draft = editingAccount[account.id];
              return (
                <li key={account.id} className="px-6 py-4">
                  {isEditingThis ? (
                    <div className="flex items-center gap-2 flex-wrap">
                      <input
                        autoFocus
                        value={draft.name}
                        onChange={(e) =>
                          setEditingAccount((prev) => ({ ...prev, [account.id]: { ...draft, name: e.target.value } }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleAccountEditSave(account.id);
                          if (e.key === "Escape") setEditingAccount((prev) => { const next = { ...prev }; delete next[account.id]; return next; });
                        }}
                        className="flex-1 min-w-0 text-sm border border-sky-400 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-sky-200"
                      />
                      <select
                        value={draft.type}
                        onChange={(e) =>
                          setEditingAccount((prev) => ({ ...prev, [account.id]: { ...draft, type: e.target.value as AccountType } }))
                        }
                        className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400 bg-white"
                      >
                        {ACCOUNT_TYPE_OPTIONS.map((t) => (
                          <option key={t} value={t}>{ACCOUNT_TYPE_LABEL[t]}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => handleAccountEditSave(account.id)}
                        className="p-1.5 text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setEditingAccount((prev) => { const next = { ...prev }; delete next[account.id]; return next; })}
                        className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-800 truncate">{account.name}</p>
                          {account.isDefault && (
                            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-medium bg-sky-100 text-sky-700 flex-shrink-0">
                              <Star className="w-2.5 h-2.5" />기본
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">{ACCOUNT_TYPE_LABEL[account.type]}</p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {!account.isDefault && (
                          <button
                            onClick={() => mutateSetDefault(account.id)}
                            title="기본 결제수단으로 설정"
                            className="p-1.5 text-gray-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
                          >
                            <Star className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() =>
                            setEditingAccount((prev) => ({
                              ...prev,
                              [account.id]: { name: account.name, type: account.type },
                            }))
                          }
                          className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => mutateDeleteAccount(account.id)}
                          className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}

            {/* 추가 폼 */}
            {showAccountForm && (
              <li className="px-6 py-4 bg-sky-50/50">
                <div className="flex items-center gap-2 flex-wrap">
                  <input
                    autoFocus
                    placeholder="결제수단 이름 (예: 신한 체크카드)"
                    value={accountForm.name}
                    onChange={(e) => setAccountForm((prev) => ({ ...prev, name: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        if (accountForm.name.trim()) mutateCreateAccount({ name: accountForm.name.trim(), type: accountForm.type });
                      }
                      if (e.key === "Escape") setShowAccountForm(false);
                    }}
                    className="flex-1 min-w-0 text-sm border border-gray-300 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400"
                  />
                  <select
                    value={accountForm.type}
                    onChange={(e) => setAccountForm((prev) => ({ ...prev, type: e.target.value as AccountType }))}
                    className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400 bg-white"
                  >
                    {ACCOUNT_TYPE_OPTIONS.map((t) => (
                      <option key={t} value={t}>{ACCOUNT_TYPE_LABEL[t]}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => {
                      if (accountForm.name.trim()) mutateCreateAccount({ name: accountForm.name.trim(), type: accountForm.type });
                    }}
                    disabled={isCreatingAccount || !accountForm.name.trim()}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-sky-600 hover:bg-sky-700 disabled:opacity-50 rounded-lg transition-colors"
                  >
                    <Check className="w-3.5 h-3.5" />저장
                  </button>
                  <button
                    onClick={() => { setShowAccountForm(false); setAccountForm({ name: "", type: "CREDIT_CARD" }); }}
                    className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
}

