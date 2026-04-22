"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { User, Mail, Calendar, Clock, Pencil, Check, X } from "lucide-react";
import { fetchMe, updateMe } from "@/src/lib/api/userApi";
import { AuthError } from "@/src/lib/api/authError";

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

export default function ProfilePage() {
  const router = useRouter();
  const queryClient = useQueryClient();

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

  const { mutate, isPending, error: mutationError } = useMutation({
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

  const handleCancel = () => setIsEditing(false);

  const handleSave = () => {
    const trimmed = nicknameInput.trim();
    if (!trimmed || trimmed === data?.nickname) {
      setIsEditing(false);
      return;
    }
    mutate({ nickname: trimmed });
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

  return (
    <div className="space-y-6 max-w-xl">
      {/* 페이지 헤더 */}
      <h1 className="text-2xl font-bold text-gray-900">마이페이지</h1>

      {/* 프로필 카드 */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* 아바타 헤더 */}
        <div className="flex items-center gap-4 px-6 py-5 border-b border-gray-100">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-sky-500 to-purple-500 flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
            {data.nickname[0]}
          </div>
          <div>
            <p className="font-semibold text-gray-900">{data.nickname}</p>
            <p className="text-xs text-gray-400 mt-0.5">Free 플랜</p>
          </div>
        </div>

        {/* 정보 목록 */}
        <dl className="divide-y divide-gray-100">
          {/* 닉네임 — 수정 가능 */}
          <div className="flex items-center justify-between px-6 py-5">
            <div className="min-w-0 flex-1">
              <dt className="flex items-center gap-1.5 text-xs font-medium text-gray-400 mb-1">
                <User className="w-3.5 h-3.5" />
                닉네임
              </dt>
              {isEditing ? (
                <div className="space-y-2">
                  <input
                    autoFocus
                    value={nicknameInput}
                    onChange={(e) => setNicknameInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSave();
                      if (e.key === "Escape") handleCancel();
                    }}
                    maxLength={20}
                    className="w-full text-sm border border-sky-400 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-sky-200"
                  />
                  {mutationError && (
                    <p className="text-xs text-red-500">
                      {(mutationError as Error).message}
                    </p>
                  )}
                </div>
              ) : (
                <dd className="text-sm font-medium text-gray-800">{data.nickname}</dd>
              )}
            </div>

            {/* 수정 / 저장·취소 버튼 */}
            <div className="ml-4 flex items-center gap-1 flex-shrink-0">
              {isEditing ? (
                <>
                  <button
                    onClick={handleSave}
                    disabled={isPending}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-sky-600 hover:bg-sky-700 disabled:opacity-50 rounded-lg transition-colors"
                  >
                    <Check className="w-3.5 h-3.5" />
                    저장
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={isPending}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                    취소
                  </button>
                </>
              ) : (
                <button
                  onClick={handleEdit}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  수정
                </button>
              )}
            </div>
          </div>

          {/* 이메일 */}
          <div className="px-6 py-5">
            <dt className="flex items-center gap-1.5 text-xs font-medium text-gray-400 mb-1">
              <Mail className="w-3.5 h-3.5" />
              이메일
            </dt>
            <dd className="text-sm font-medium text-gray-800">{data.email}</dd>
          </div>

          {/* 가입일 */}
          <div className="px-6 py-5">
            <dt className="flex items-center gap-1.5 text-xs font-medium text-gray-400 mb-1">
              <Calendar className="w-3.5 h-3.5" />
              가입일
            </dt>
            <dd className="text-sm font-medium text-gray-800">{formatDate(data.createdAt)}</dd>
          </div>

          {/* 정보 수정일 */}
          <div className="px-6 py-5">
            <dt className="flex items-center gap-1.5 text-xs font-medium text-gray-400 mb-1">
              <Clock className="w-3.5 h-3.5" />
              정보 수정일
            </dt>
            <dd className="text-sm font-medium text-gray-800">{formatDate(data.updatedAt)}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

