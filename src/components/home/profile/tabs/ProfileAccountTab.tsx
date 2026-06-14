"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { User, Mail, Camera, Pencil, Check, X, AlertTriangle } from "lucide-react";
import { fetchMe, updateMe, deleteMe } from "@/src/lib/api/userApi";
import { useToast } from "@/src/hook/useToast";
import { useRouter } from "next/navigation";
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

const CONFIRM_TEXT = "탈퇴하겠습니다";

export default function ProfileAccountTab() {
  const { toast } = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [isEditing, setIsEditing] = useState(false);
  const [nicknameInput, setNicknameInput] = useState("");
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawInput, setWithdrawInput] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: fetchMe,
  });

  const { mutate: mutateNickname, isPending: isNicknamePending, error: nicknameError } = useMutation({
    mutationFn: updateMe,
    onSuccess: (updated) => {
      queryClient.setQueryData(["me"], updated);
      setIsEditing(false);
      toast.success("닉네임이 변경되었습니다.");
    },
  });

  const { mutate: mutateAvatar, isPending: isAvatarUpdating } = useMutation({
    mutationFn: updateMe,
    onSuccess: (updated) => {
      queryClient.setQueryData(["me"], updated);
      setShowAvatarSelector(false);
      toast.success("프로필 사진이 변경되었습니다.");
    },
  });

  const { mutate: mutateWithdraw, isPending: isWithdrawing } = useMutation({
    mutationFn: deleteMe,
    onSuccess: async () => {
      const supabase = createClient();
      await supabase.auth.signOut();
      queryClient.clear();
      router.replace("/login");
    },
    onError: () => {
      toast.error("탈퇴 처리에 실패했습니다. 다시 시도해주세요.");
    },
  });

  const handleEdit = () => {
    setNicknameInput(data?.nickname ?? "");
    setIsEditing(true);
  };

  const handleNicknameSave = () => {
    const trimmed = nicknameInput.trim();
    if (!trimmed) {
      toast.error("닉네임을 입력해주세요.");
      return;
    }
    if (trimmed === data?.nickname) {
      setIsEditing(false);
      return;
    }
    mutateNickname({ nickname: trimmed });
  };

  const handleWithdraw = () => {
    if (withdrawInput !== CONFIRM_TEXT) return;
    mutateWithdraw();
  };

  const handleKakaoLink = async () => {
    const supabase = createClient();
    await supabase.auth.linkIdentity({
      provider: "kakao",
      options: {
        redirectTo: `${window.location.origin}/home/profile`,
      },
    });
  };

  if (isLoading || !data) {
    return <div className="animate-pulse bg-gray-100 h-[400px] rounded-2xl" />;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center gap-5 px-6 py-6 border-b border-gray-100/60 bg-gradient-to-r from-sky-50/20 to-purple-50/10">
          <button
            type="button"
            onClick={() => {
              if (Object.keys(data.availableAvatars || {}).length > 0 || BUILT_IN_AVATARS.length > 0) {
                setShowAvatarSelector(true);
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
                  <button onClick={handleNicknameSave} disabled={isNicknamePending} className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 disabled:opacity-50 rounded-xl transition-colors shadow-sm">
                    <Check className="w-3.5 h-3.5" />저장
                  </button>
                  <button onClick={() => setIsEditing(false)} disabled={isNicknamePending} className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
                    <X className="w-3.5 h-3.5" />취소
                  </button>
                </>
              ) : (
                <button onClick={handleEdit} className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-gray-600 border border-gray-200 bg-white hover:bg-gray-50 rounded-xl transition-colors shadow-sm">
                  <Pencil className="w-3.5 h-3.5" />수정
                </button>
              )}
            </div>
          </div>

          <div className="px-6 py-5">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 mb-3">
              <Mail className="w-3.5 h-3.5" />계정 연동 상태
            </span>
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#FEE500] flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-[#000000]" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 3C6.477 3 2 6.477 2 10.773c0 2.766 1.83 5.187 4.545 6.467-.146.473-.526 1.768-.567 1.93-.051.206.074.202.158.146.065-.043 2.052-1.378 2.87-1.927.962.138 1.96.211 2.994.211 5.523 0 10-3.477 10-7.773S17.523 3 12 3z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">카카오톡 연동</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {data.linkedProviders?.includes('kakao') ? "카카오 계정으로 안전하게 로그인 중입니다." : "클릭하여 카카오 계정과 연동하세요."}
                    </p>
                  </div>
                </div>
                {!data.linkedProviders?.includes('kakao') && (
                  <button onClick={handleKakaoLink} className="text-xs font-semibold text-[#371d1e] bg-[#FEE500] hover:bg-[#FDD800] px-3.5 py-1.5 rounded-lg transition-colors shadow-sm">
                    연동하기
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={() => setShowWithdrawModal(true)}
          className="text-xs font-medium text-gray-400 hover:text-red-500 hover:underline transition-colors px-2 py-1"
        >
          회원 탈퇴
        </button>
      </div>

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
              <p className="text-xs text-gray-600 mb-2 font-medium">탈퇴를 진행하려면 아래 칸에 정확히 입력하세요:</p>
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
              <button type="button" onClick={() => setShowWithdrawModal(false)} className="flex-1 py-2.5 text-sm font-semibold text-gray-700 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors">취소</button>
              <button type="button" onClick={handleWithdraw} disabled={withdrawInput !== CONFIRM_TEXT || isWithdrawing} className="flex-1 py-2.5 text-sm font-semibold text-white bg-red-500 rounded-xl hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                {isWithdrawing ? "처리 중..." : "탈퇴 확인"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAvatarSelector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-gray-900/40 backdrop-blur-sm" onClick={() => setShowAvatarSelector(false)}>
          <div className="bg-white rounded-2xl p-6 shadow-2xl max-w-[320px] w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-bold text-gray-900 mb-1 text-center">프로필 사진 변경</h3>
            <p className="text-xs text-gray-500 mb-4 text-center">원하는 프로필 사진을 선택해 주세요.</p>
            <div className="flex flex-wrap justify-center gap-3 max-h-[300px] overflow-y-auto py-2">
              {Object.entries(data.availableAvatars || {}).map(([provider, url]) => (
                <button key={provider} type="button" onClick={() => mutateAvatar({ avatarUrl: url as string })} disabled={isAvatarUpdating} className={`relative w-14 h-14 rounded-full border-4 overflow-hidden transition-all duration-200 ${data.avatarUrl === url ? 'border-sky-500 scale-110 shadow-lg' : 'border-transparent hover:scale-105 hover:shadow-md'}`}>
                  <img src={url as string} alt={provider} className="w-full h-full object-cover" />
                  {data.avatarUrl === url && <div className="absolute inset-0 bg-sky-500/20 flex items-center justify-center"><Check className="w-5 h-5 text-white drop-shadow-md" /></div>}
                </button>
              ))}
              {BUILT_IN_AVATARS.map((url, idx) => (
                <button key={`builtin-${idx}`} type="button" onClick={() => mutateAvatar({ avatarUrl: url })} disabled={isAvatarUpdating} className={`relative w-14 h-14 rounded-full border-4 overflow-hidden bg-gray-50 transition-all duration-200 ${data.avatarUrl === url ? 'border-sky-500 scale-110 shadow-lg' : 'border-transparent hover:scale-105 hover:shadow-md'}`}>
                  <img src={url} alt={`기본 프사 ${idx}`} className="w-full h-full object-cover" />
                  {data.avatarUrl === url && <div className="absolute inset-0 bg-sky-500/20 flex items-center justify-center"><Check className="w-5 h-5 text-white drop-shadow-md" /></div>}
                </button>
              ))}
            </div>
            <button onClick={() => setShowAvatarSelector(false)} className="mt-6 w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-bold rounded-xl transition-colors">
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
