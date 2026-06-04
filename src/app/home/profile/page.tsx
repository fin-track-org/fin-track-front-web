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

  /* ── 모든 카테고리를 선택 가능하게 (소분류별로 예산 설정 가능) ── */

  return (
    <div className="space-y-6 max-w-xl">
      <h1 className="text-2xl font-bold text-gray-900">마이페이지</h1>

      {/* ── 프로필 카드 ── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex items-center gap-4 px-6 py-5 border-b border-gray-100">
          <button
            onClick={() => {
              if (Object.keys(data.availableAvatars || {}).length > 0) {
                setShowAvatarSelector(true);
              } else {
                toast.error("연동된 소셜 계정의 프로필 사진이 없습니다. 소셜 연동을 추가해 보세요!");
              }
            }}
            className="relative group w-14 h-14 rounded-full flex-shrink-0 focus:outline-none transition-transform hover:scale-105"
          >
            {data.avatarUrl ? (
              <img src={data.avatarUrl} alt="profile" className="w-14 h-14 rounded-full object-cover shadow-sm ring-2 ring-gray-100" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-sky-500 to-purple-500 flex items-center justify-center text-white text-xl font-bold shadow-sm ring-2 ring-gray-100">
                {data.nickname?.[0] || "G"}
              </div>
            )}

            <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer">
              <Camera className="w-5 h-5 text-white" />
            </div>
          </button>

          <div>
            <p className="font-semibold text-gray-900 text-lg">{data.nickname || "Guest"}</p>
            <p className="text-xs text-sky-600 font-medium mt-0.5 bg-sky-50 inline-block px-2 py-0.5 rounded-full">Free 플랜</p>
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
                <dd className="text-sm font-medium text-gray-800">{data.nickname || "닉네임을 수정해주세요."}</dd>
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

          {/* 소셜 계정 연동 */}
          <div className="px-6 py-5">
            <dt className="flex items-center gap-1.5 text-xs font-medium text-gray-400 mb-2">
              <Mail className="w-3.5 h-3.5" />계정 연동 상태
            </dt>

            <dd className="space-y-3">
              {/* 카카오 연동 블록 */}
              <div className="flex items-center justify-between text-sm font-medium text-gray-800">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 flex items-center justify-center bg-[#FEE500] rounded-full">
                    <svg className="w-4 h-4 text-[#191919]" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 3c-4.97 0-9 3.185-9 7.115 0 2.558 1.712 4.8 4.32 6.04-.173.579-.623 2.098-.713 2.42-.113.407.135.402.285.302.119-.079 1.907-1.282 2.662-1.79.79.117 1.606.18 2.446.18 4.97 0 9-3.186 9-7.116C21 6.185 16.97 3 12 3z" />
                    </svg>
                  </span>
                  <span>카카오</span>
                </div>

                {data.linkedProviders?.includes('kakao') ? (
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500">연동됨</span>
                    <button
                      onClick={() => handleUnlink('kakao')}
                      disabled={isUnlinking === 'kakao'}
                      className="text-[11px] font-medium text-gray-400 hover:text-gray-600 transition-colors underline underline-offset-2 disabled:opacity-50"
                    >
                      {isUnlinking === 'kakao' ? "해제 중..." : "해제"}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleLink('kakao')}
                    disabled={isLinking === 'kakao'}
                    className="text-[11px] font-medium text-sky-600 hover:text-sky-700 bg-sky-50 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {isLinking === 'kakao' ? "연동 중..." : "연동하기"}
                  </button>
                )}
              </div>

              {/* 구글 연동 블록 */}
              <div className="flex items-center justify-between text-sm font-medium text-gray-800">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 flex items-center justify-center bg-gray-50 border border-gray-200 rounded-full">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                  </span>
                  <span>Google</span>
                </div>

                {data.linkedProviders?.includes('google') ? (
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500">연동됨</span>
                    <button
                      onClick={() => handleUnlink('google')}
                      disabled={isUnlinking === 'google'}
                      className="text-[11px] font-medium text-gray-400 hover:text-gray-600 transition-colors underline underline-offset-2 disabled:opacity-50"
                    >
                      {isUnlinking === 'google' ? "해제 중..." : "해제"}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleLink('google')}
                    disabled={isLinking === 'google'}
                    className="text-[11px] font-medium text-sky-600 hover:text-sky-700 bg-sky-50 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {isLinking === 'google' ? "연동 중..." : "연동하기"}
                  </button>
                )}
              </div>
            </dd>
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

          {/* 가계부 모드 */}
          <div className="flex items-center justify-between px-6 py-5">
            <div>
              <dt className="flex items-center gap-1.5 text-xs font-medium text-gray-400 mb-1">
                <Settings className="w-3.5 h-3.5" />가계부 모드
              </dt>
              <dd className="text-sm font-medium text-gray-800">
                {userSetting?.ledgerMode === "ASSET_MANAGEMENT" ? "자산 관리 모드" : "간편 모드"}
              </dd>
            </div>
            <div className="flex items-center gap-2">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={userSetting?.ledgerMode === "ASSET_MANAGEMENT"}
                  disabled={isSettingUpdating}
                  onChange={(e) => {
                    const newMode = e.target.checked ? "ASSET_MANAGEMENT" : "SIMPLE";
                    changeLedgerMode(newMode);
                  }}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-600 disabled:opacity-50"></div>
              </label>
            </div>
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
          {!showAddForm && categories.length > 0 && (
            <button
              onClick={() => {
                setShowAddForm(true);
                setNewCategoryId(categories[0]?.id ?? "");
                setNewSubCategoryId("");
              }}
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
                <Skeleton className="h-4 w-8" />
              </div>
            ))}
          </div>
        ) : templates.length === 0 && !showAddForm ? (
          <div className="px-6 py-10 text-center">
            <p className="text-sm text-gray-500 mb-4">아직 설정된 예산 템플릿이 없어요.</p>
            <button
              onClick={() => {
                setShowAddForm(true);
                setNewCategoryId(categories[0]?.id ?? "");
                setNewSubCategoryId("");
              }}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />예산 템플릿 추가
            </button>
          </div>
        ) : (
          <div>
            <ul>
              {templates.map((group) => (
                <BudgetGroupRow
                  key={group.categoryId}
                  group={group}
                  onUpdate={(id, amount) => mutateUpdate({ id, amount })}
                  onDelete={(id) => mutateDelete(id)}
                />
              ))}
            </ul>

            {/* 추가 폼 */}
            {showAddForm && (
              <div className="px-6 py-4 bg-sky-50/50 border-t border-gray-100">
                <div className="flex items-center gap-3 flex-wrap">
                  <select
                    value={newCategoryId}
                    onChange={(e) => {
                      setNewCategoryId(e.target.value);
                      setNewSubCategoryId("");
                    }}
                    className="flex-1 min-w-0 text-sm border border-gray-300 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400 bg-white"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  {newSubCategories.length > 0 && (
                    <select
                      value={newSubCategoryId}
                      onChange={(e) => setNewSubCategoryId(e.target.value)}
                      className="flex-1 min-w-0 text-sm border border-gray-300 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400 bg-white"
                    >
                      <option value="">소분류 선택 안함</option>
                      {newSubCategories.map((sc) => (
                        <option key={sc.id} value={sc.id}>{sc.name}</option>
                      ))}
                    </select>
                  )}
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
              </div>
            )}
          </div>
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

      {/* ── 자주 사용하는 거래 (템플릿) ── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Bookmark className="w-4 h-4 text-sky-600" />
            <h2 className="font-semibold text-gray-900">자주 사용하는 거래</h2>
          </div>
          <button
            onClick={() => {
              setEditingTemplate(null);
              setShowTemplateModal(true);
            }}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />추가
          </button>
        </div>
        
        {isTemplatesLoadingList ? (
          <div className="divide-y divide-gray-100">
            {[1, 2].map((i) => (
              <div key={i} className="flex items-center justify-between px-6 py-4">
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ))}
          </div>
        ) : transactionTemplates.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <p className="text-sm text-gray-500 mb-4">등록된 자주 사용하는 거래가 없어요.</p>
            <button
              onClick={() => {
                setEditingTemplate(null);
                setShowTemplateModal(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />자주 사용하는 거래 추가
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {transactionTemplates.map((template) => (
              <li key={template.id} className="px-6 py-4 flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-800 truncate">{template.title}</p>
                    <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0 ${template.type === 'INCOME' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                      {template.type === 'INCOME' ? '수입' : '지출'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                    <span>{formatAmount(template.amount)}</span>
                    <span className="w-1 h-1 bg-gray-300 rounded-full" />
                    <span className="truncate">
                      {allCategories.find(c => c.id === template.categoryId)?.name || '카테고리 없음'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => {
                      setEditingTemplate(template);
                      setShowTemplateModal(true);
                    }}
                    className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm("정말로 이 거래 템플릿을 삭제하시겠습니까?")) {
                        mutateDeleteTemplate(template.id);
                      }
                    }}
                    className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ── 카테고리 관리 카드 ── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-6 py-5 border-b border-gray-100">
          <Tags className="w-4 h-4 text-sky-600" />
          <h2 className="font-semibold text-gray-900">카테고리 관리</h2>
        </div>
        <p className="px-6 py-3 text-xs text-gray-400 border-b border-gray-100">
          대분류는 시스템에서 관리됩니다. 각 대분류를 클릭하면 세부 항목을 추가·수정·삭제할 수 있습니다.
        </p>

        {isAllCategoriesLoading ? (
          <div className="divide-y divide-gray-100">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center justify-between px-6 py-4">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-8" />
              </div>
            ))}
          </div>
        ) : (
          <ul>
            {allCategories.map((cat) => (
              <CategoryRow key={cat.id} category={cat} />
            ))}
          </ul>
        )}
      </div>

      {/* ── 위험 구역 카드 ── */}
      <div className="bg-white rounded-xl border border-red-200 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-6 py-5 border-b border-red-100">
          <AlertTriangle className="w-4 h-4 text-red-500" />
          <h2 className="font-semibold text-red-600">주의</h2>
        </div>
        <div className="px-6 py-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-gray-800">회원 탈퇴</p>
            <p className="text-xs text-gray-500 mt-0.5">계정과 모든 데이터가 영구 삭제됩니다. 이 작업은 되돌릴 수 없습니다.</p>
          </div>
          <button
            onClick={() => { setWithdrawInput(""); setShowWithdrawModal(true); }}
            className="shrink-0 px-4 py-2 text-sm font-medium text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
          >
            회원 탈퇴하기
          </button>
        </div>
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
                <h3 className="text-base font-semibold text-gray-900">정말로 탈퇴하시겠어요?</h3>
                <p className="text-sm text-gray-500 mt-1">
                  계정과 모든 거래 내역, 예산, 자산 정보가 <span className="font-medium text-red-500">영구적으로 삭제</span>되며 복구할 수 없습니다.
                </p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-600 mb-2">
                탈퇴를 진행하려면 아래 칸에 정확히 입력하세요:
              </p>
              <p className="text-sm font-bold text-gray-800 mb-3 text-center tracking-wide">{CONFIRM_TEXT}</p>
              <input
                type="text"
                value={withdrawInput}
                onChange={(e) => setWithdrawInput(e.target.value)}
                placeholder={CONFIRM_TEXT}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowWithdrawModal(false)}
                className="flex-1 py-2.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleWithdraw}
                disabled={withdrawInput !== CONFIRM_TEXT || isWithdrawing}
                className="flex-1 py-2.5 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
    </div>
  );
}

