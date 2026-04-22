"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { User, Mail, Calendar, Shield, Clock } from "lucide-react";
import { fetchMe } from "@/src/lib/api/userApi";
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

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["me"],
    queryFn: fetchMe,
    retry: false,
  });

  useEffect(() => {
    if (error instanceof AuthError) {
      router.replace("/login");
    }
  }, [error, router]);

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-2xl">
        <div>
          <Skeleton className="h-8 w-40 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="h-24 bg-gray-200 animate-pulse" />
          <div className="px-8 pb-8">
            <div className="flex items-end gap-4 -mt-10 mb-6">
              <Skeleton className="w-20 h-20 rounded-full ring-4 ring-white" />
              <div className="pb-1 space-y-2">
                <Skeleton className="h-6 w-36" />
                <Skeleton className="h-5 w-24 rounded-full" />
              </div>
            </div>
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-gray-50">
                  <Skeleton className="w-10 h-10 rounded-lg flex-shrink-0" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-5 w-48" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="py-16 text-center text-red-500">
        {(error as Error)?.message ?? "사용자 정보를 불러오는데 실패했습니다."}
      </div>
    );
  }

  const infoItems = [
    {
      icon: User,
      label: "닉네임",
      value: data.nickname,
      iconBg: "bg-sky-100",
      iconColor: "text-sky-600",
    },
    {
      icon: Mail,
      label: "이메일",
      value: data.email,
      iconBg: "bg-purple-100",
      iconColor: "text-purple-600",
    },
    {
      icon: Calendar,
      label: "가입일",
      value: formatDate(data.createdAt),
      iconBg: "bg-emerald-100",
      iconColor: "text-emerald-600",
    },
    {
      icon: Clock,
      label: "정보 수정일",
      value: formatDate(data.updatedAt),
      iconBg: "bg-orange-100",
      iconColor: "text-orange-600",
    },
  ];

  return (
    <div className="space-y-6 max-w-2xl">
      {/* 페이지 헤더 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">마이페이지</h1>
        <p className="mt-1 text-sm text-gray-500">내 계정 정보를 확인하세요.</p>
      </div>

      {/* 프로필 카드 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        {/* 상단 그라디언트 배너 */}
        <div className="h-24 bg-gradient-to-r from-sky-400 to-purple-500" />

        <div className="px-8 pb-8">
          {/* 아바타 + 이름 */}
          <div className="flex items-end gap-4 -mt-10 mb-6">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-sky-500 to-purple-500 flex items-center justify-center text-white text-3xl font-bold ring-4 ring-white shadow-md">
              {data.nickname[0]}
            </div>
            <div className="pb-1">
              <h2 className="text-xl font-bold text-gray-900">{data.nickname}</h2>
              <span className="inline-flex items-center gap-1 mt-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-sky-100 text-sky-700">
                <Shield className="w-3 h-3" />
                Free 플랜
              </span>
            </div>
          </div>

          {/* 정보 목록 */}
          <div className="space-y-3">
            {infoItems.map(({ icon: Icon, label, value, iconBg, iconColor }) => (
              <div
                key={label}
                className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className={`w-10 h-10 rounded-lg ${iconBg} flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-5 h-5 ${iconColor}`} />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</p>
                  <p className="text-sm font-semibold text-gray-800 mt-0.5">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
