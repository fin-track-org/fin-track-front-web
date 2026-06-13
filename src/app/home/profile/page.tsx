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
  Tags,
  ChevronDown,
  AlertTriangle,
  Settings,
  Camera,
  Bookmark,
  Layout,
  Grid,
} from "lucide-react";
import { fetchMe, updateMe, deleteMe } from "@/src/lib/api/userApi";
import {
  getBudgetTemplates,
  createBudgetTemplate,
  updateBudgetTemplate,
  deleteBudgetTemplate,
} from "@/src/lib/api/budgetApi";
import {
  getCategories,
  getSubCategories,
  createSubCategory,
  updateSubCategory,
  deleteSubCategory,
} from "@/src/lib/api/categoryApi";
import { AuthError } from "@/src/lib/api/authError";
import {
  getAccounts,
  createAccount,
  updateAccount,
  deleteAccount,
  setDefaultAccount,
} from "@/src/lib/api/accountApi";
import { createClient } from "@/src/lib/supabase/client";

const BUILT_IN_AVATARS = [
  "https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=Felix",
  "https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=Aneka",
  "https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=Garfield",
  "https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=Tinkerbell",
  "https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=Leo",
  "https://api.dicebear.com/7.x/bottts/svg?seed=Lucky",
  "https://api.dicebear.com/7.x/bottts/svg?seed=Midnight",
  "https://api.dicebear.com/7.x/identicon/svg?seed=Bandit",
];

import { useToast } from "@/src/hook/useToast";
import { useUserSettings } from "@/src/hook/useUserSettings";
import AddTemplateModal from "@/src/components/AddTemplateModal";
import {
  createTransactionTemplate,
  getTransactionTemplates,
  updateTransactionTemplate,
  deleteTransactionTemplate,
  TransactionTemplateRes
} from "@/src/lib/api/transaction/templateApi";
import {
  getRecurringTransactions,
  createRecurringTransaction,
  updateRecurringTransaction,
  deleteRecurringTransaction,
} from "@/src/lib/api/transaction/recurringApi";
import { RecurringTransactionRes } from "@/src/types/recurringTransaction";
import AddRecurringModal from "@/src/components/AddRecurringModal";
import { Repeat } from "lucide-react";

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

/* ── 예산 그룹 행 (카테고리별 접기/펼치기) ── */
function BudgetGroupRow({
  group,
  onUpdate,
  onDelete,
}: {
  group: BudgetTemplateGroupRes;
  onUpdate: (id: string, amount: number) => void;
  onDelete: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState("");

  const handleUpdateSave = (id: string) => {
    const amount = Number(editAmount);
    if (!amount || amount <= 0) return;
    onUpdate(id, amount);
    setEditingId(null);
  };

  const hasCategoryBudget = group.targetAmount !== null && group.id !== null;
  const hasItems = group.items.length > 0;
  const totalCount = (hasCategoryBudget ? 1 : 0) + group.items.length;

  return (
    <li className="border-b border-gray-100 last:border-0">
      {/* 대분류 행 */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="inline-block w-2 h-2 rounded-full flex-shrink-0 bg-sky-500" />
          <span className="text-sm font-medium text-gray-800 truncate">{group.categoryName}</span>
          <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0 bg-gray-100 text-gray-500">
            {totalCount}개
          </span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""
            }`}
        />
      </button>

      {/* 예산 항목들 */}
      {open && (
        <div className="bg-gray-50/60 px-6 pb-4 pt-1">
          <ul className="space-y-1">
            {/* 대분류 자체 예산 */}
            {hasCategoryBudget && (
              <li
                className="flex items-center justify-between py-2 border-b border-gray-200/50"
              >
                {editingId === group.id ? (
                  <>
                    <span className="text-sm text-gray-500">대분류 전체</span>
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <input
                          autoFocus
                          type="number"
                          value={editAmount}
                          onChange={(e) => setEditAmount(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleUpdateSave(group.id!);
                            if (e.key === "Escape") setEditingId(null);
                          }}
                          className="w-32 text-sm text-right border border-sky-400 rounded-lg px-3 py-1.5 pr-6 outline-none focus:ring-2 focus:ring-sky-200"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">원</span>
                      </div>
                      <button
                        onClick={() => handleUpdateSave(group.id!)}
                        className="p-1 text-sky-600 hover:bg-sky-100 rounded-lg transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="p-1 text-gray-400 hover:bg-gray-200 rounded-lg transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <span className="text-sm text-gray-500">대분류 전체</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-700">
                        {formatAmount(group.targetAmount!)}
                      </span>
                      <button
                        onClick={() => {
                          setEditingId(group.id);
                          setEditAmount(String(group.targetAmount));
                        }}
                        className="p-1 text-gray-400 hover:bg-gray-200 rounded-lg transition-colors"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`"${group.categoryName}" 예산을 삭제하시겠습니까?`))
                            onDelete(group.id!);
                        }}
                        className="p-1 text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </>
                )}
              </li>
            )}

            {/* 소분류별 예산 */}
            {group.items.map((item) =>
              editingId === item.id ? (
                <li key={item.id} className="flex items-center justify-between py-2">
                  <span className="text-sm text-gray-700">{item.subCategoryName}</span>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <input
                        autoFocus
                        type="number"
                        value={editAmount}
                        onChange={(e) => setEditAmount(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleUpdateSave(item.id);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        className="w-32 text-sm text-right border border-sky-400 rounded-lg px-3 py-1.5 pr-6 outline-none focus:ring-2 focus:ring-sky-200"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">원</span>
                    </div>
                    <button
                      onClick={() => handleUpdateSave(item.id)}
                      className="p-1 text-sky-600 hover:bg-sky-100 rounded-lg transition-colors"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="p-1 text-gray-400 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </li>
              ) : (
                <li key={item.id} className="flex items-center justify-between py-2">
                  <span className="text-sm text-gray-700">{item.subCategoryName}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-700">
                      {formatAmount(item.targetAmount)}
                    </span>
                    <button
                      onClick={() => {
                        setEditingId(item.id);
                        setEditAmount(String(item.targetAmount));
                      }}
                      className="p-1 text-gray-400 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`"${item.subCategoryName}" 예산을 삭제하시겠습니까?`))
                          onDelete(item.id);
                      }}
                      className="p-1 text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </li>
              ),
            )}
          </ul>

          {!hasCategoryBudget && !hasItems && (
            <p className="text-xs text-gray-400 py-2">예산이 설정되지 않았습니다.</p>
          )}
        </div>
      )}
    </li>
  );
}

/* ── 카테고리 행 (소분류 인라인 관리) ── */
function CategoryRow({ category }: { category: Category }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [addName, setAddName] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [rowError, setRowError] = useState("");

  const { data: subCategories = [], isLoading } = useQuery({
    queryKey: ["subCategories", category.id],
    queryFn: () => getSubCategories(category.id),
    enabled: open,
    staleTime: 1000 * 60 * 5,
  });

  const { mutate: mutateAdd, isPending: isAdding } = useMutation({
    mutationFn: (name: string) => createSubCategory(category.id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subCategories", category.id] });
      setAddName("");
      setShowAdd(false);
      setRowError("");
    },
    onError: (e: Error) => setRowError(e.message),
  });

  const { mutate: mutateUpdate } = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      updateSubCategory(id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subCategories", category.id] });
      setEditingId(null);
      setRowError("");
    },
    onError: (e: Error) => setRowError(e.message),
  });

  const { mutate: mutateDelete } = useMutation({
    mutationFn: deleteSubCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subCategories", category.id] });
      setRowError("");
    },
    onError: (e: Error) => setRowError(e.message),
  });

  const handleAdd = () => {
    const name = addName.trim();
    if (!name) return;
    const dup = subCategories.some(
      (s) => s.name.replace(/\s+/g, "").toLowerCase() === name.replace(/\s+/g, "").toLowerCase(),
    );
    if (dup) { setRowError("이미 존재하는 세부 항목입니다."); return; }
    mutateAdd(name);
  };

  const handleUpdateSave = (id: string) => {
    const name = editName.trim();
    if (!name) return;
    mutateUpdate({ id, name });
  };

  const isIncome = category.type === "INCOME";

  return (
    <li className="border-b border-gray-100 last:border-0">
      {/* 대분류 행 */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span
            className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${isIncome ? "bg-emerald-500" : "bg-sky-500"}`}
          />
          <span className="text-sm font-medium text-gray-800 truncate">{category.name}</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${isIncome
              ? "bg-emerald-50 text-emerald-600"
              : "bg-sky-50 text-sky-600"
              }`}
          >
            {isIncome ? "수입" : "지출"}
          </span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* 소분류 영역 */}
      {open && (
        <div className="bg-gray-50/60 px-6 pb-4 pt-1">
          {isLoading ? (
            <div className="space-y-2 py-2">
              {[1, 2].map((i) => (
                <div key={i} className="flex items-center justify-between">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-6 w-16" />
                </div>
              ))}
            </div>
          ) : subCategories.length === 0 && !showAdd ? (
            <p className="text-xs text-gray-400 py-2">세부 항목이 없습니다.</p>
          ) : (
            <ul className="space-y-1 mb-2">
              {subCategories.map((sc) =>
                editingId === sc.id ? (
                  <li key={sc.id} className="flex items-center gap-2 py-1">
                    <input
                      autoFocus
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleUpdateSave(sc.id);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      className="flex-1 text-sm border border-sky-400 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-sky-200"
                    />
                    <button
                      onClick={() => handleUpdateSave(sc.id)}
                      className="p-1 text-sky-600 hover:bg-sky-100 rounded-lg transition-colors"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="p-1 text-gray-400 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </li>
                ) : (
                  <li key={sc.id} className="flex items-center justify-between py-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm text-gray-700 truncate">{sc.name}</span>
                      {sc.isSystem && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-400 flex-shrink-0">
                          시스템
                        </span>
                      )}
                    </div>
                    {!sc.isSystem && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => { setEditingId(sc.id); setEditName(sc.name); setRowError(""); }}
                          className="p-1 text-gray-400 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`"${sc.name}"을(를) 삭제하시겠습니까?`))
                              mutateDelete(sc.id);
                          }}
                          className="p-1 text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </li>
                ),
              )}
            </ul>
          )}

          {/* 추가 폼 */}
          {showAdd ? (
            <div className="flex items-center gap-2 mt-1">
              <input
                autoFocus
                placeholder="새 세부 항목"
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAdd();
                  if (e.key === "Escape") { setShowAdd(false); setAddName(""); setRowError(""); }
                }}
                className="flex-1 text-sm border border-gray-300 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400"
              />
              <button
                onClick={handleAdd}
                disabled={isAdding || !addName.trim()}
                className="p-1 text-sky-600 hover:bg-sky-100 rounded-lg transition-colors disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => { setShowAdd(false); setAddName(""); setRowError(""); }}
                className="p-1 text-gray-400 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => { setShowAdd(true); setRowError(""); }}
              className="flex items-center gap-1 mt-1 text-xs text-sky-600 hover:text-sky-700 font-medium"
            >
              <Plus className="w-3 h-3" />세부 항목 추가
            </button>
          )}

          {rowError && (
            <p className="mt-1 text-xs text-red-500">{rowError}</p>
          )}
        </div>
      )}
    </li>
  );
}

export default function ProfilePage() {
  const { toast } = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();

  /* ── 탭 상태 ── */
  const [activeTab, setActiveTab] = useState<"profile" | "ledger" | "budget" | "templates">("profile");

  /* ── 사용자 정보 ── */
  const [isEditing, setIsEditing] = useState(false);
  const [nicknameInput, setNicknameInput] = useState("");
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["me"],
    queryFn: fetchMe,
    retry: false,
  });

  const {
    userSetting,
    isLoading: isSettingLoading,
    changeLedgerMode,
    isUpdating: isSettingUpdating,
    changeLedgerTheme,
    isThemeUpdating,
  } = useUserSettings();

  // 💡 [추가할 부분] URL Hash에 담긴 Supabase 에러를 잡아서 Toast 띄우고 청소하기!
  useEffect(() => {
    const hash = window.location.hash; // 예: #error=server_error&error_code=...

    if (hash && hash.includes("error_description")) {
      // 1. Hash 문자열을 파싱하기 쉽게 변환
      const params = new URLSearchParams(hash.substring(1)); // 맨 앞의 '#' 제거
      const errorCode = params.get("error_code");
      const errorDesc = params.get("error_description");

      if (errorDesc) {
        // '+' 기호를 공백으로 바꾸고 디코딩
        const decodedError = decodeURIComponent(errorDesc.replace(/\+/g, " "));

        // 2. 에러 종류에 따라 알맞은 예쁜 Toast 띄우기
        if (errorCode === "identity_already_exists" || decodedError.includes("already linked")) {
          toast.error("이 카카오 계정은 이미 다른 가계부와 연동되어 있습니다.");
        } else {
          toast.error(`카카오 연동 실패: ${decodedError}`);
        }

        // 3. 🧹 [가장 중요] 유저 모르게 못생긴 URL 꼬리표를 싹 지워버립니다! (새로고침 안 됨)
        window.history.replaceState(null, "", window.location.pathname);
      }
    }
  }, [toast]);

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

  const { mutate: mutateAvatar, isPending: isAvatarUpdating } = useMutation({
    mutationFn: updateMe,
    onSuccess: (updated) => {
      queryClient.setQueryData(["me"], updated);
      toast.success("프로필 사진이 변경되었습니다.");
      setShowAvatarSelector(false);
    },
    onError: (e: Error) => toast.error(`변경 실패: ${e.message}`)
  });

  const [isLinking, setIsLinking] = useState<string | null>(null);

  const handleLink = async (provider: string) => {
    try {
      setIsLinking(provider);
      const supabase = createClient();
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        throw new Error("로그인 세션이 만료되었습니다. 다시 로그인해 주세요.");
      }

      const { data, error } = await supabase.auth.linkIdentity({
        provider: provider as any,
        options: {
          redirectTo: `${window.location.origin}/auth/callback?action=link`,
        },
      });

      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (err: unknown) {
      console.error(`🚨 ${provider} 연동 에러:`, err);
      const message = err instanceof Error ? err.message : "알 수 없는 오류";
      toast.error(
        message.includes("already linked")
          ? `이 ${provider === 'kakao' ? '카카오' : '구글'} 계정은 이미 다른 가계부와 연동되어 있습니다.`
          : `연동 실패: ${message}`
      );
      setIsLinking(null);
    }
  };

  const [isUnlinking, setIsUnlinking] = useState<string | null>(null);

  const handleUnlink = async (provider: string) => {
    try {
      setIsUnlinking(provider);
      const supabase = createClient();
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("사용자 정보를 확인할 수 없습니다.");

      const identities = user.identities ?? [];
      const isOnlyProvider = identities.length === 1 && identities[0].provider === provider;

      if (isOnlyProvider) {
        toast.error(`현재 ${provider === 'kakao' ? '카카오' : '구글'} 계정으로만 로그인되어 있습니다. 연동을 해제하시려면 화면 하단의 [회원 탈퇴]를 이용해 주세요.`);
        return;
      }

      const targetIdentity = identities.find((id) => id.provider === provider);
      if (!targetIdentity) {
        toast.error(`연결된 ${provider === 'kakao' ? '카카오' : '구글'} 계정이 없습니다.`);
        return;
      }

      const { error: unlinkError } = await supabase.auth.unlinkIdentity(targetIdentity);
      if (unlinkError) throw unlinkError;

      const newIdentities = identities.filter((id) => id.provider !== provider);
      const linkedProviders = newIdentities.map(id => id.provider);
      const availableAvatars: Record<string, string> = {};

      newIdentities.forEach((id) => {
        const url = id.identity_data?.avatar_url ?? id.identity_data?.picture;
        if (url) availableAvatars[id.provider] = url;
      });

      await updateMe({
        linkedProviders,
        availableAvatars
      });

      queryClient.invalidateQueries({ queryKey: ["me"] });
      toast.success(`${provider === 'kakao' ? '카카오' : '구글'} 연동이 해제되었습니다.`);
    } catch (err: unknown) {
      console.error(`🚨 ${provider} 연동 해제 실패:`, err);
      const message = err instanceof Error ? err.message : "알 수 없는 오류";
      toast.error(`해제 실패: ${message}`);
    } finally {
      setIsUnlinking(null);
    }
  };

  /* ── 카테고리 목록 ── */
  const { data: categories = [] } = useQuery({
    queryKey: ["categories", "EXPENSE"],
    queryFn: () => getCategories("EXPENSE"),
  });

  /* ── 전체 카테고리 (수입 + 지출) ── */
  const { data: allCategories = [], isLoading: isAllCategoriesLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: () => getCategories(),
  });
  /* ── 예산 템플릿 ── */
  const {
    data: templates = [],
    isLoading: isTemplatesLoading,
  } = useQuery<BudgetTemplateGroupRes[]>({
    queryKey: ["budgetTemplates"],
    queryFn: getBudgetTemplates,
  });

  // 신규 추가 폼
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCategoryId, setNewCategoryId] = useState("");
  const [newSubCategoryId, setNewSubCategoryId] = useState<string>("");
  const [newAmount, setNewAmount] = useState("");

  const { mutate: mutateCreate, isPending: isCreating } = useMutation({
    mutationFn: createBudgetTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgetTemplates"] });
      setShowAddForm(false);
      setNewCategoryId("");
      setNewSubCategoryId("");
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

  /* 선택된 카테고리의 소분류 목록 */
  const { data: newSubCategories = [] } = useQuery({
    queryKey: ["subCategories", newCategoryId],
    queryFn: () => getSubCategories(newCategoryId),
    enabled: showAddForm && !!newCategoryId,
    staleTime: 1000 * 60 * 5,
  });

  const handleAddSubmit = () => {
    const amount = Number(newAmount);
    if (!newCategoryId || !amount || amount <= 0) return;
    mutateCreate({
      categoryId: newCategoryId,
      subCategoryId: newSubCategoryId || null,
      targetAmount: amount
    });
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

  /* ── 회원 탈퇴 ── */
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawInput, setWithdrawInput] = useState("");
  const CONFIRM_TEXT = "탈퇴에 동의합니다";

  const { mutate: mutateWithdraw, isPending: isWithdrawing } = useMutation({
    mutationFn: deleteMe,
    onSuccess: async () => {
      const supabase = createClient();
      await supabase.auth.signOut();
      queryClient.clear();
      toast.success("회원 탈퇴가 완료되었습니다.");
      router.replace("/login");
    },
    onError: (e: Error) => {
      toast.error(`탈퇴 실패: ${e.message}`);
    },
  });

  const handleWithdraw = () => {
    if (withdrawInput === CONFIRM_TEXT) {
      mutateWithdraw();
    }
  };

  /* ── 자주 사용하는 거래 (템플릿) ── */
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TransactionTemplateRes | null>(null);

  const { data: transactionTemplates = [], isLoading: isTemplatesLoadingList } = useQuery({
    queryKey: ["transactionTemplates"],
    queryFn: getTransactionTemplates,
  });

  const { mutate: mutateCreateTemplate } = useMutation({
    mutationFn: createTransactionTemplate,
    onSuccess: () => {
      toast.success("자주 사용하는 거래가 추가되었습니다.");
      setShowTemplateModal(false);
      queryClient.invalidateQueries({ queryKey: ["transactionTemplates"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const { mutate: mutateUpdateTemplate } = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => updateTransactionTemplate(id, payload),
    onSuccess: () => {
      toast.success("자주 사용하는 거래가 수정되었습니다.");
      setShowTemplateModal(false);
      setEditingTemplate(null);
      queryClient.invalidateQueries({ queryKey: ["transactionTemplates"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const { mutate: mutateDeleteTemplate } = useMutation({
    mutationFn: deleteTransactionTemplate,
    onSuccess: () => {
      toast.success("자주 사용하는 거래가 삭제되었습니다.");
      queryClient.invalidateQueries({ queryKey: ["transactionTemplates"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleTemplateSubmit = async (payload: any) => {
    if (editingTemplate) {
      mutateUpdateTemplate({ id: editingTemplate.id, payload });
    } else {
      mutateCreateTemplate(payload);
    }
  };

  /* ── 반복 거래 관리 ── */
  const [showRecurringModal, setShowRecurringModal] = useState(false);
  const [editingRecurring, setEditingRecurring] = useState<RecurringTransactionRes | null>(null);

  const { data: recurringTransactions = [], isLoading: isRecurringLoading } = useQuery({
    queryKey: ["recurringTransactions"],
    queryFn: getRecurringTransactions,
  });

  const { mutate: mutateCreateRecurring } = useMutation({
    mutationFn: createRecurringTransaction,
    onSuccess: () => {
      toast.success("반복 거래가 추가되었습니다.");
      setShowRecurringModal(false);
      queryClient.invalidateQueries({ queryKey: ["recurringTransactions"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const { mutate: mutateUpdateRecurring } = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => updateRecurringTransaction(id, payload),
    onSuccess: () => {
      toast.success("반복 거래가 수정되었습니다.");
      setShowRecurringModal(false);
      setEditingRecurring(null);
      queryClient.invalidateQueries({ queryKey: ["recurringTransactions"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const { mutate: mutateDeleteRecurring } = useMutation({
    mutationFn: deleteRecurringTransaction,
    onSuccess: () => {
      toast.success("반복 거래가 삭제되었습니다.");
      queryClient.invalidateQueries({ queryKey: ["recurringTransactions"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleRecurringSubmit = async (payload: any) => {
    if (editingRecurring) {
      mutateUpdateRecurring({ id: editingRecurring.id, payload });
    } else {
      mutateCreateRecurring(payload);
    }
  };

  /* ── 로딩 ── */
  if (isLoading || isSettingLoading) {
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

  return (
    <div className="space-y-8 max-w-4xl w-full mx-auto pb-16">
      {/* ── 헤더 영역 ── */}
      <div>
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">마이페이지</h1>
        <p className="text-sm text-gray-500 mt-1.5">프로필 정보와 가계부 환경 설정을 깔끔하게 관리해 보세요.</p>
      </div>

      {/* ── 탭 내비게이션 바 ── */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 -mb-px overflow-x-auto scrollbar-none" aria-label="Tabs">
          {[
            { id: "profile", label: "프로필 & 계정", icon: User },
            { id: "ledger", label: "가계부 & 결제수단", icon: Settings },
            { id: "budget", label: "예산 & 카테고리", icon: Wallet },
            { id: "templates", label: "자동 & 자주쓰는 거래", icon: Repeat },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`
                  group inline-flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-all duration-200 focus:outline-none
                  ${isActive
                    ? "border-sky-500 text-sky-600 font-semibold"
                    : "border-transparent text-gray-400 hover:text-gray-600 hover:border-gray-300"
                  }
                `}
              >
                <Icon className={`w-4 h-4 transition-colors ${isActive ? "text-sky-500" : "text-gray-400 group-hover:text-gray-500"}`} />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* ── 탭 콘텐츠 영역 ── */}
      <div className="min-h-[400px]">
        {/* 1. 프로필 & 계정 탭 */}
        {activeTab === "profile" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* 프로필 카드 */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center gap-5 px-6 py-6 border-b border-gray-100/60 bg-gradient-to-r from-sky-50/20 to-purple-50/10">
                <button
                  type="button"
                  onClick={() => {
                    if (Object.keys(data.availableAvatars || {}).length > 0) {
                      setShowAvatarSelector(true);
                    } else {
                      toast.error("연동된 소셜 계정의 프로필 사진이 없습니다. 소셜 연동을 추가해 보세요!");
                    }
                  }}
                  className="relative group w-16 h-16 rounded-full flex-shrink-0 focus:outline-none transition-all duration-300 hover:scale-105"
                >
                  {data.avatarUrl ? (
                    <img src={data.avatarUrl} alt="profile" className="w-16 h-16 rounded-full object-cover shadow-sm ring-4 ring-white" />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-sky-400 to-indigo-500 flex items-center justify-center text-white text-2xl font-bold shadow-sm ring-4 ring-white">
                      {data.nickname?.[0] || "G"}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer">
                    <Camera className="w-5 h-5 text-white" />
                  </div>
                </button>

                <div>
                  <p className="font-bold text-gray-900 text-xl tracking-tight">{data.nickname || "Guest"}</p>
                  <span className="inline-flex items-center text-xs font-semibold text-sky-600 mt-1 bg-sky-50 px-2.5 py-0.5 rounded-full">
                    Free 플랜
                  </span>
                </div>
              </div>

              <div className="divide-y divide-gray-100">
                {/* 닉네임 수정 */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-5">
                  <div className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 mb-1">
                      <User className="w-3.5 h-3.5" />닉네임
                    </span>
                    {isEditing ? (
                      <div className="space-y-2 max-w-sm">
                        <input
                          autoFocus
                          value={nicknameInput}
                          onChange={(e) => setNicknameInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleNicknameSave();
                            if (e.key === "Escape") setIsEditing(false);
                          }}
                          maxLength={20}
                          className="w-full text-sm border border-sky-400 rounded-xl px-3 py-2 outline-none focus:ring-4 focus:ring-sky-100 transition-all bg-white"
                        />
                        {nicknameError && <p className="text-xs text-red-500">{(nicknameError as Error).message}</p>}
                      </div>
                    ) : (
                      <dd className="text-sm font-semibold text-gray-800">{data.nickname || "닉네임을 수정해주세요."}</dd>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-center">
                    {isEditing ? (
                      <>
                        <button
                          type="button"
                          onClick={handleNicknameSave}
                          disabled={isNicknamePending}
                          className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 disabled:opacity-50 rounded-xl transition-colors shadow-sm"
                        >
                          <Check className="w-3.5 h-3.5" />저장
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsEditing(false)}
                          disabled={isNicknamePending}
                          className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />취소
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={handleEdit}
                        className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-gray-600 border border-gray-200 bg-white hover:bg-gray-50 rounded-xl transition-colors shadow-sm"
                      >
                        <Pencil className="w-3.5 h-3.5" />수정
                      </button>
                    )}
                  </div>
                </div>

                {/* 소셜 연동 */}
                <div className="px-6 py-5">
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 mb-3">
                    <Mail className="w-3.5 h-3.5" />계정 연동 상태
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* 카카오 */}
                    <div className="flex items-center justify-between p-4 bg-gray-50/60 rounded-2xl border border-gray-100">
                      <div className="flex items-center gap-3">
                        <span className="w-9 h-9 flex items-center justify-center bg-[#FEE500] rounded-xl shadow-sm">
                          <svg className="w-5 h-5 text-[#191919]" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 3c-4.97 0-9 3.185-9 7.115 0 2.558 1.712 4.8 4.32 6.04-.173.579-.623 2.098-.713 2.42-.113.407.135.402.285.302.119-.079 1.907-1.282 2.662-1.79.79.117 1.606.18 2.446.18 4.97 0 9-3.186 9-7.116C21 6.185 16.97 3 12 3z" />
                          </svg>
                        </span>
                        <span className="text-sm font-semibold text-gray-700">카카오</span>
                      </div>

                      {data.linkedProviders?.includes('kakao') ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full">연동됨</span>
                          <button
                            type="button"
                            onClick={() => handleUnlink('kakao')}
                            disabled={isUnlinking === 'kakao'}
                            className="text-xs font-semibold text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50 underline underline-offset-2"
                          >
                            {isUnlinking === 'kakao' ? "해제 중..." : "해제"}
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleLink('kakao')}
                          disabled={isLinking === 'kakao'}
                          className="text-xs font-bold text-gray-800 bg-[#FEE500] hover:bg-[#FEE500]/90 px-3.5 py-2 rounded-xl transition-colors disabled:opacity-50 shadow-sm"
                        >
                          {isLinking === 'kakao' ? "연동 중..." : "연동하기"}
                        </button>
                      )}
                    </div>

                    {/* 구글 */}
                    <div className="flex items-center justify-between p-4 bg-gray-50/60 rounded-2xl border border-gray-100">
                      <div className="flex items-center gap-3">
                        <span className="w-9 h-9 flex items-center justify-center bg-white border border-gray-200 rounded-xl shadow-sm">
                          <svg className="w-4 h-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                          </svg>
                        </span>
                        <span className="text-sm font-semibold text-gray-700">Google</span>
                      </div>

                      {data.linkedProviders?.includes('google') ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full">연동됨</span>
                          <button
                            type="button"
                            onClick={() => handleUnlink('google')}
                            disabled={isUnlinking === 'google'}
                            className="text-xs font-semibold text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50 underline underline-offset-2"
                          >
                            {isUnlinking === 'google' ? "해제 중..." : "해제"}
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleLink('google')}
                          disabled={isLinking === 'google'}
                          className="text-xs font-semibold text-gray-700 border border-gray-200 bg-white hover:bg-gray-50 px-3.5 py-2 rounded-xl transition-colors disabled:opacity-50 shadow-sm"
                        >
                          {isLinking === 'google' ? "연동 중..." : "연동하기"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 가입일 / 수정일 메타 정보 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center gap-4">
                <span className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center text-sky-600">
                  <Calendar className="w-5 h-5" />
                </span>
                <div>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">가입일</p>
                  <p className="text-sm font-semibold text-gray-800 mt-0.5">{formatDate(data.createdAt)}</p>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center gap-4">
                <span className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
                  <Clock className="w-5 h-5" />
                </span>
                <div>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">최근 정보 수정일</p>
                  <p className="text-sm font-semibold text-gray-800 mt-0.5">{formatDate(data.updatedAt)}</p>
                </div>
              </div>
            </div>

            {/* 회원 탈퇴 */}
            <div className="bg-red-50/40 rounded-2xl border border-red-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 bg-red-50/80 border-b border-red-100/60 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <h3 className="font-semibold text-red-700 text-sm">주의 구역</h3>
              </div>
              <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-bold text-gray-950">회원 탈퇴</h4>
                  <p className="text-xs text-gray-500 mt-1">계정과 모든 데이터가 영구 삭제됩니다. 이 작업은 되돌릴 수 없습니다.</p>
                </div>
                <button
                  type="button"
                  onClick={() => { setWithdrawInput(""); setShowWithdrawModal(true); }}
                  className="px-4 py-2.5 text-sm font-semibold text-red-600 bg-white border border-red-200 rounded-xl hover:bg-red-50 hover:border-red-300 transition-colors shadow-sm shrink-0 self-start sm:self-center"
                >
                  회원 탈퇴하기
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 2. 가계부 설정 탭 */}
        {activeTab === "ledger" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* 가계부 모드 설정 */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
              <div>
                <h3 className="text-base font-bold text-gray-900">가계부 모드 설정</h3>
                <p className="text-xs text-gray-400 mt-1">원하는 관리 상세 수준에 따라 모드를 선택할 수 있습니다.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 간편 모드 */}
                <button
                  type="button"
                  onClick={() => changeLedgerMode("SIMPLE")}
                  disabled={isSettingUpdating}
                  className={`relative p-5 rounded-2xl border text-left transition-all duration-200 flex flex-col justify-between h-36 focus:outline-none ${
                    userSetting?.ledgerMode === "SIMPLE"
                      ? "border-sky-500 ring-2 ring-sky-500/20 bg-sky-50/10"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50/30"
                  }`}
                >
                  <div className="flex justify-between items-start w-full">
                    <span className={`w-10 h-10 rounded-xl flex items-center justify-center ${userSetting?.ledgerMode === "SIMPLE" ? "bg-sky-500 text-white" : "bg-gray-100 text-gray-500"}`}>
                      <Wallet className="w-5 h-5" />
                    </span>
                    {userSetting?.ledgerMode === "SIMPLE" && (
                      <span className="w-5 h-5 rounded-full bg-sky-500 text-white flex items-center justify-center">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-800">간편 모드</p>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">복잡한 결제수단 흐름 없이 수입/지출 내역 위주로 심플하게 기록합니다.</p>
                  </div>
                </button>

                {/* 자산 관리 모드 */}
                <button
                  type="button"
                  onClick={() => changeLedgerMode("ASSET_MANAGEMENT")}
                  disabled={isSettingUpdating}
                  className={`relative p-5 rounded-2xl border text-left transition-all duration-200 flex flex-col justify-between h-36 focus:outline-none ${
                    userSetting?.ledgerMode === "ASSET_MANAGEMENT"
                      ? "border-sky-500 ring-2 ring-sky-500/20 bg-sky-50/10"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50/30"
                  }`}
                >
                  <div className="flex justify-between items-start w-full">
                    <span className={`w-10 h-10 rounded-xl flex items-center justify-center ${userSetting?.ledgerMode === "ASSET_MANAGEMENT" ? "bg-sky-500 text-white" : "bg-gray-100 text-gray-500"}`}>
                      <CreditCard className="w-5 h-5" />
                    </span>
                    {userSetting?.ledgerMode === "ASSET_MANAGEMENT" && (
                      <span className="w-5 h-5 rounded-full bg-sky-500 text-white flex items-center justify-center">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-800">자산 관리 모드</p>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">현금, 카드, 은행 계좌 잔액 등을 추적하며, 복잡한 자산 흐름도 꼼꼼히 기록합니다.</p>
                  </div>
                </button>
              </div>
            </div>

            {/* 장부 테마 설정 */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
              <div>
                <h3 className="text-base font-bold text-gray-900">장부 테마 설정</h3>
                <p className="text-xs text-gray-400 mt-1">장부 내역 화면의 전반적인 디자인 테마를 설정합니다.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 기본 UI */}
                <button
                  type="button"
                  onClick={() => changeLedgerTheme("DEFAULT")}
                  disabled={isThemeUpdating}
                  className={`relative p-5 rounded-2xl border text-left transition-all duration-200 flex flex-col justify-between h-36 focus:outline-none ${
                    userSetting?.ledgerTheme === "DEFAULT"
                      ? "border-sky-500 ring-2 ring-sky-500/20 bg-sky-50/10"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50/30"
                  }`}
                >
                  <div className="flex justify-between items-start w-full">
                    <span className={`w-10 h-10 rounded-xl flex items-center justify-center ${userSetting?.ledgerTheme === "DEFAULT" ? "bg-sky-500 text-white" : "bg-gray-100 text-gray-500"}`}>
                      <Layout className="w-5 h-5" />
                    </span>
                    {userSetting?.ledgerTheme === "DEFAULT" && (
                      <span className="w-5 h-5 rounded-full bg-sky-500 text-white flex items-center justify-center">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-800">기본 UI</p>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">모바일과 데스크톱 모두에 최적화된 모던하고 미니멀한 UI를 제공합니다.</p>
                  </div>
                </button>

                {/* 엑셀 UI */}
                <button
                  type="button"
                  onClick={() => changeLedgerTheme("EXCEL")}
                  disabled={isThemeUpdating}
                  className={`relative p-5 rounded-2xl border text-left transition-all duration-200 flex flex-col justify-between h-36 focus:outline-none ${
                    userSetting?.ledgerTheme === "EXCEL"
                      ? "border-sky-500 ring-2 ring-sky-500/20 bg-sky-50/10"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50/30"
                  }`}
                >
                  <div className="flex justify-between items-start w-full">
                    <span className={`w-10 h-10 rounded-xl flex items-center justify-center ${userSetting?.ledgerTheme === "EXCEL" ? "bg-sky-500 text-white" : "bg-gray-100 text-gray-500"}`}>
                      <Grid className="w-5 h-5" />
                    </span>
                    {userSetting?.ledgerTheme === "EXCEL" && (
                      <span className="w-5 h-5 rounded-full bg-sky-500 text-white flex items-center justify-center">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-800">엑셀 UI</p>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">엑셀 시트와 유사한 촘촘한 정렬로, 대량의 가계부 데이터를 빠르게 보고 편하게 관리합니다.</p>
                  </div>
                </button>
              </div>
            </div>

            {/* 결제수단 관리 */}
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
                              onChange={(e) =>
                                setEditingAccount((prev) => ({ ...prev, [account.id]: { ...draft, name: e.target.value } }))
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleAccountEditSave(account.id);
                                if (e.key === "Escape") setEditingAccount((prev) => { const next = { ...prev }; delete next[account.id]; return next; });
                              }}
                              className="flex-1 min-w-[150px] text-sm border border-sky-400 rounded-xl px-3 py-1.5 outline-none focus:ring-4 focus:ring-sky-100 bg-white"
                            />
                            <select
                              value={draft.type}
                              onChange={(e) =>
                                setEditingAccount((prev) => ({ ...prev, [account.id]: { ...draft, type: e.target.value as AccountType } }))
                              }
                              className="text-sm border border-gray-300 rounded-xl px-3 py-1.5 outline-none focus:ring-4 focus:ring-sky-100 bg-white"
                            >
                              {ACCOUNT_TYPE_OPTIONS.map((t) => (
                                <option key={t} value={t}>{ACCOUNT_TYPE_LABEL[t]}</option>
                              ))}
                            </select>
                            <div className="flex gap-1">
                              <button
                                type="button"
                                onClick={() => handleAccountEditSave(account.id)}
                                className="p-2 text-sky-600 hover:bg-sky-50 rounded-xl transition-colors"
                              >
                                <Check className="w-4.5 h-4.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingAccount((prev) => { const next = { ...prev }; delete next[account.id]; return next; })}
                                className="p-2 text-gray-400 hover:bg-gray-100 rounded-xl transition-colors"
                              >
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
                              </div>
                              <p className="text-xs text-gray-400 mt-1 font-medium">{ACCOUNT_TYPE_LABEL[account.type]}</p>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              {!account.isDefault && (
                                <button
                                  type="button"
                                  onClick={() => mutateSetDefault(account.id)}
                                  title="기본 결제수단으로 설정"
                                  className="p-2 text-gray-400 hover:text-sky-500 hover:bg-sky-50 rounded-xl transition-colors"
                                >
                                  <Star className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() =>
                                  setEditingAccount((prev) => ({
                                    ...prev,
                                    [account.id]: { name: account.name, type: account.type },
                                  }))
                                }
                                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm(`결제수단 "${account.name}"을(를) 삭제하시겠습니까?`)) {
                                    mutateDeleteAccount(account.id);
                                  }
                                }}
                                className="p-2 text-red-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        )}
                      </li>
                    );
                  })}

                  {/* 결제수단 추가 폼 */}
                  {showAccountForm && (
                    <li className="px-6 py-5 bg-sky-50/20 border-t border-sky-100/40">
                      <div className="flex items-center gap-2.5 flex-wrap">
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
                            type="button"
                            onClick={() => {
                              if (accountForm.name.trim()) mutateCreateAccount({ name: accountForm.name.trim(), type: accountForm.type });
                            }}
                            disabled={isCreatingAccount || !accountForm.name.trim()}
                            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 disabled:opacity-50 rounded-xl transition-colors shadow-sm"
                          >
                            <Check className="w-3.5 h-3.5" />저장
                          </button>
                          <button
                            type="button"
                            onClick={() => { setShowAccountForm(false); setAccountForm({ name: "", type: "CREDIT_CARD" }); }}
                            className="p-2 text-gray-400 hover:bg-gray-100 rounded-xl transition-colors"
                          >
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
        )}

        {/* 3. 예산 & 카테고리 탭 */}
        {activeTab === "budget" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* 예산 템플릿 */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-white">
                <div className="flex items-center gap-2">
                  <Wallet className="w-4.5 h-4.5 text-sky-500" />
                  <h2 className="font-bold text-gray-900 text-base">월 예산 템플릿</h2>
                </div>
                {!showAddForm && categories.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddForm(true);
                      setNewCategoryId(categories[0]?.id ?? "");
                      setNewSubCategoryId("");
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-sky-600 bg-sky-50 hover:bg-sky-100 rounded-xl transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />추가
                  </button>
                )}
              </div>

              {isTemplatesLoading ? (
                <div className="divide-y divide-gray-100 bg-white">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center justify-between px-6 py-5">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-4 w-12" />
                    </div>
                  ))}
                </div>
              ) : templates.length === 0 && !showAddForm ? (
                <div className="px-6 py-12 text-center bg-gray-50/20">
                  <p className="text-sm text-gray-400 mb-4 font-medium">설정된 예산 템플릿이 없습니다.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddForm(true);
                      setNewCategoryId(categories[0]?.id ?? "");
                      setNewSubCategoryId("");
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-xl transition-colors shadow-sm"
                  >
                    <Plus className="w-4 h-4" />예산 템플릿 추가
                  </button>
                </div>
              ) : (
                <div className="bg-white">
                  <ul className="divide-y divide-gray-100/60">
                    {templates.map((group) => (
                      <BudgetGroupRow
                        key={group.categoryId}
                        group={group}
                        onUpdate={(id, amount) => mutateUpdate({ id, amount })}
                        onDelete={(id) => mutateDelete(id)}
                      />
                    ))}
                  </ul>

                  {/* 예산 추가 폼 */}
                  {showAddForm && (
                    <div className="px-6 py-5 bg-sky-50/20 border-t border-sky-100/40">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <select
                          value={newCategoryId}
                          onChange={(e) => {
                            setNewCategoryId(e.target.value);
                            setNewSubCategoryId("");
                          }}
                          className="flex-1 min-w-[140px] text-sm border border-gray-300 rounded-xl px-3 py-2 outline-none focus:ring-4 focus:ring-sky-100 focus:border-sky-400 bg-white"
                        >
                          {categories.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                        {newSubCategories.length > 0 && (
                          <select
                            value={newSubCategoryId}
                            onChange={(e) => setNewSubCategoryId(e.target.value)}
                            className="flex-1 min-w-[140px] text-sm border border-gray-300 rounded-xl px-3 py-2 outline-none focus:ring-4 focus:ring-sky-100 focus:border-sky-400 bg-white"
                          >
                            <option value="">소분류 선택 안함</option>
                            {newSubCategories.map((sc) => (
                              <option key={sc.id} value={sc.id}>{sc.name}</option>
                            ))}
                          </select>
                        )}
                        <div className="relative max-w-[180px]">
                          <input
                            type="number"
                            placeholder="0"
                            value={newAmount}
                            onChange={(e) => setNewAmount(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") handleAddSubmit(); if (e.key === "Escape") setShowAddForm(false); }}
                            className="w-full text-sm text-right border border-gray-300 rounded-xl px-3.5 py-2 pr-7 outline-none focus:ring-4 focus:ring-sky-100 focus:border-sky-400 bg-white"
                          />
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">원</span>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={handleAddSubmit}
                            disabled={isCreating}
                            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 disabled:opacity-50 rounded-xl transition-colors shadow-sm"
                          >
                            <Check className="w-3.5 h-3.5" />저장
                          </button>
                          <button
                            type="button"
                            onClick={() => { setShowAddForm(false); setNewAmount(""); }}
                            className="p-2 text-gray-400 hover:bg-gray-100 rounded-xl transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 카테고리 관리 */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center gap-2 px-6 py-5 border-b border-gray-100 bg-white">
                <Tags className="w-4.5 h-4.5 text-sky-500" />
                <h2 className="font-bold text-gray-900 text-base">카테고리 관리</h2>
              </div>
              <p className="px-6 py-4 text-xs text-gray-400 border-b border-gray-100/60 bg-gray-50/30 font-medium">
                대분류 항목은 고정되어 있으며 각 항목을 클릭하여 하위 소분류를 추가, 수정, 삭제할 수 있습니다.
              </p>

              {isAllCategoriesLoading ? (
                <div className="divide-y divide-gray-100 bg-white">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex items-center justify-between px-6 py-5">
                      <Skeleton className="h-4 w-36" />
                      <Skeleton className="h-4 w-8" />
                    </div>
                  ))}
                </div>
              ) : (
                <ul className="divide-y divide-gray-100/60 bg-white">
                  {allCategories.map((cat) => (
                    <CategoryRow key={cat.id} category={cat} />
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {/* 4. 자동 & 자주 쓰는 거래 탭 */}
        {activeTab === "templates" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* 자주 사용하는 거래 */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-white">
                <div className="flex items-center gap-2">
                  <Bookmark className="w-4.5 h-4.5 text-sky-500" />
                  <h2 className="font-bold text-gray-900 text-base">자주 사용하는 거래</h2>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingTemplate(null);
                    setShowTemplateModal(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-sky-600 bg-sky-50 hover:bg-sky-100 rounded-xl transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />추가
                </button>
              </div>

              {isTemplatesLoadingList ? (
                <div className="divide-y divide-gray-100 bg-white">
                  {[1, 2].map((i) => (
                    <div key={i} className="flex items-center justify-between px-6 py-5">
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3.5 w-24" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : transactionTemplates.length === 0 ? (
                <div className="px-6 py-12 text-center bg-gray-50/20">
                  <p className="text-sm text-gray-400 mb-4 font-medium">자주 사용하는 거래로 등록된 내역이 없습니다.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingTemplate(null);
                      setShowTemplateModal(true);
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-xl transition-colors shadow-sm"
                  >
                    <Plus className="w-4 h-4" />자주 사용하는 거래 추가
                  </button>
                </div>
              ) : (
                <ul className="divide-y divide-gray-100/60 bg-white">
                  {transactionTemplates.map((template) => (
                    <li key={template.id} className="px-6 py-4 flex items-center justify-between gap-4 hover:bg-gray-50/30 transition-colors">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-gray-800 truncate">{template.title}</p>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0 ${template.type === 'INCOME' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}>
                            {template.type === 'INCOME' ? '수입' : '지출'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-400 font-medium">
                          <span className="font-semibold text-gray-600">{formatAmount(template.amount)}</span>
                          <span className="w-1 h-1 bg-gray-300 rounded-full" />
                          <span className="truncate">
                            {allCategories.find(c => c.id === template.categoryId)?.name || '카테고리 없음'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingTemplate(template);
                            setShowTemplateModal(true);
                          }}
                          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm("정말로 이 거래 템플릿을 삭제하시겠습니까?")) {
                              mutateDeleteTemplate(template.id);
                            }
                          }}
                          className="p-2 text-red-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* 반복 거래 관리 */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-white">
                <div className="flex items-center gap-2">
                  <Repeat className="w-4.5 h-4.5 text-sky-500" />
                  <h2 className="font-bold text-gray-900 text-base">반복 거래 관리</h2>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingRecurring(null);
                    setShowRecurringModal(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-sky-600 bg-sky-50 hover:bg-sky-100 rounded-xl transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />추가
                </button>
              </div>

              {isRecurringLoading ? (
                <div className="divide-y divide-gray-100 bg-white">
                  {[1, 2].map((i) => (
                    <div key={i} className="flex items-center justify-between px-6 py-5">
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3.5 w-24" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : recurringTransactions.length === 0 ? (
                <div className="px-6 py-12 text-center bg-gray-50/20">
                  <p className="text-sm text-gray-400 mb-4 font-medium">등록된 반복 거래가 없습니다.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingRecurring(null);
                      setShowRecurringModal(true);
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-xl transition-colors shadow-sm"
                  >
                    <Plus className="w-4 h-4" />반복 거래 추가
                  </button>
                </div>
              ) : (
                <ul className="divide-y divide-gray-100/60 bg-white">
                  {recurringTransactions.map((recurring) => (
                    <li key={recurring.id} className="px-6 py-4 flex items-center justify-between gap-4 hover:bg-gray-50/30 transition-colors">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-gray-800 truncate">{recurring.description || '이름 없음'}</p>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0 ${recurring.type === 'INCOME' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}>
                            {recurring.type === 'INCOME' ? '수입' : '지출'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-400 font-medium flex-wrap">
                          <span className="font-semibold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-lg">
                            {recurring.repeatType === "MONTHLY" ? `매월 ${recurring.repeatDay}일` : `매주 ${['일', '월', '화', '수', '목', '금', '토'][recurring.repeatDay % 7]}요일`}
                          </span>
                          <span className="w-1 h-1 bg-gray-300 rounded-full" />
                          <span className="font-semibold text-gray-600">{formatAmount(recurring.amount)}</span>
                          <span className="w-1 h-1 bg-gray-300 rounded-full" />
                          <span className="truncate">
                            {allCategories.find(c => c.id === recurring.categoryId)?.name || '카테고리 없음'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingRecurring(recurring);
                            setShowRecurringModal(true);
                          }}
                          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm("정말로 이 반복 거래를 삭제하시겠습니까?")) {
                              mutateDeleteRecurring(recurring.id);
                            }
                          }}
                          className="p-2 text-red-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── 회원 탈퇴 모달 ── */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 flex flex-col gap-5">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-red-100">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-950">정말로 탈퇴하시겠어요?</h3>
                <p className="text-sm text-gray-500 mt-1">
                  계정과 모든 거래 내역, 예산, 자산 정보가 <span className="font-semibold text-red-500">영구적으로 삭제</span>되며 복구할 수 없습니다.
                </p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-600 mb-2 font-medium">
                탈퇴를 진행하려면 아래 칸에 정확히 입력하세요:
              </p>
              <p className="text-sm font-bold text-gray-800 mb-3 text-center tracking-wide">{CONFIRM_TEXT}</p>
              <input
                type="text"
                value={withdrawInput}
                onChange={(e) => setWithdrawInput(e.target.value)}
                placeholder={CONFIRM_TEXT}
                className="w-full text-sm border border-gray-300 rounded-xl px-3.5 py-2.5 outline-none focus:ring-4 focus:ring-red-100 focus:border-red-400 bg-white"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowWithdrawModal(false)}
                className="flex-1 py-2.5 text-sm font-semibold text-gray-700 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleWithdraw}
                disabled={withdrawInput !== CONFIRM_TEXT || isWithdrawing}
                className="flex-1 py-2.5 text-sm font-semibold text-white bg-red-500 rounded-xl hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {isWithdrawing ? "처리 중..." : "탈퇴 확인"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 아바타 선택 모달 ── */}
      {showAvatarSelector && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-gray-900/40 backdrop-blur-sm"
          onClick={() => setShowAvatarSelector(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 shadow-2xl max-w-[320px] w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-gray-900 mb-1 text-center">프로필 사진 변경</h3>
            <p className="text-xs text-gray-500 mb-4 text-center">원하는 프로필 사진을 선택해 주세요.</p>

            <div className="flex flex-wrap justify-center gap-3 max-h-[300px] overflow-y-auto py-2">
              {/* 소셜 연동 아바타들 */}
              {Object.entries(data.availableAvatars || {}).map(([provider, url]) => (
                <button
                  key={provider}
                  type="button"
                  onClick={() => mutateAvatar({ avatarUrl: url })}
                  disabled={isAvatarUpdating}
                  className={`relative w-14 h-14 rounded-full border-4 overflow-hidden transition-all duration-200 ${data.avatarUrl === url ? 'border-sky-500 scale-110 shadow-lg' : 'border-transparent hover:scale-105 hover:shadow-md'}`}
                >
                  <img src={url} alt={provider} className="w-full h-full object-cover" />
                  {data.avatarUrl === url && (
                    <div className="absolute inset-0 bg-sky-500/20 flex items-center justify-center">
                      <Check className="w-5 h-5 text-white drop-shadow-md" />
                    </div>
                  )}
                </button>
              ))}

              {/* 기본 제공 아바타 (DiceBear) */}
              {BUILT_IN_AVATARS.map((url, idx) => (
                <button
                  key={`builtin-${idx}`}
                  type="button"
                  onClick={() => mutateAvatar({ avatarUrl: url })}
                  disabled={isAvatarUpdating}
                  className={`relative w-14 h-14 rounded-full border-4 overflow-hidden bg-gray-50 transition-all duration-200 ${data.avatarUrl === url ? 'border-sky-500 scale-110 shadow-lg' : 'border-transparent hover:scale-105 hover:shadow-md'}`}
                >
                  <img src={url} alt={`기본 프사 ${idx}`} className="w-full h-full object-cover" />
                  {data.avatarUrl === url && (
                    <div className="absolute inset-0 bg-sky-500/20 flex items-center justify-center">
                      <Check className="w-5 h-5 text-white drop-shadow-md" />
                    </div>
                  )}
                </button>
              ))}

              {/* 기본 아바타 (텍스트) */}
              <button
                type="button"
                onClick={() => mutateAvatar({ avatarUrl: "" })}
                disabled={isAvatarUpdating}
                className={`relative w-14 h-14 rounded-full border-4 flex items-center justify-center bg-gradient-to-br from-sky-500 to-purple-500 transition-all duration-200 ${!data.avatarUrl ? 'border-sky-500 scale-110 shadow-lg' : 'border-transparent hover:scale-105 hover:shadow-md'}`}
              >
                <span className="text-white text-xl font-bold">{data.nickname?.[0] || "G"}</span>
                {!data.avatarUrl && (
                  <div className="absolute inset-0 bg-sky-500/20 flex items-center justify-center rounded-full">
                    <Check className="w-5 h-5 text-white drop-shadow-md" />
                  </div>
                )}
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowAvatarSelector(false)}
              className="mt-6 w-full py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-700 text-sm font-semibold rounded-xl transition-colors"
            >
              닫기
            </button>
          </div>
        </div>
      )}

      {/* ── 자주 사용하는 거래 추가 모달 ── */}
      <AddTemplateModal
        open={showTemplateModal}
        onOpenChange={(v) => {
          if (!v) setEditingTemplate(null);
          setShowTemplateModal(v);
        }}
        categories={allCategories}
        accounts={accounts}
        defaultValues={editingTemplate || undefined}
        onSubmit={handleTemplateSubmit}
      />

      {/* ── 반복 거래 추가 모달 ── */}
      <AddRecurringModal
        open={showRecurringModal}
        onOpenChange={(v) => {
          if (!v) setEditingRecurring(null);
          setShowRecurringModal(v);
        }}
        categories={allCategories}
        accounts={accounts}
        defaultValues={editingRecurring || undefined}
        onSubmit={handleRecurringSubmit}
        mode={editingRecurring ? "edit" : "create"}
      />
    </div>
  );
}

