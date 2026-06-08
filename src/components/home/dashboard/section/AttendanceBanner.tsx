"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getTodayAttendance, doAttendance } from "@/src/lib/api/attendanceApi";
import { CheckCircle2, Gift, Loader2 } from "lucide-react";

export default function AttendanceBanner() {
  const queryClient = useQueryClient();

  // 출석 상태 조회
  const { data: hasCheckedToday, isLoading } = useQuery({
    queryKey: ["attendanceToday"],
    queryFn: getTodayAttendance,
    retry: false,
  });

  // 출석체크 Mutation
  const mutation = useMutation({
    mutationFn: doAttendance,
    onSuccess: () => {
      // 출석 완료 후 상태 리프레시 및 포인트 정보 등 갱신
      queryClient.invalidateQueries({ queryKey: ["attendanceToday"] });
      queryClient.invalidateQueries({ queryKey: ["me"] }); // User 포인트 업데이트를 위해 'me' 재조회
    },
    onError: (error: any) => {
      alert(error.message || "출석체크 중 오류가 발생했습니다.");
    },
  });

  if (isLoading) {
    return (
      <div className="w-full h-16 bg-white rounded-2xl border border-gray-100 flex items-center justify-center shadow-sm">
        <Loader2 className="w-5 h-5 text-gray-300 animate-spin" />
      </div>
    );
  }

  // 이미 출석한 경우
  if (hasCheckedToday) {
    return (
      <div className="w-full bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 rounded-2xl p-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-emerald-800">오늘 출석 완료! 🌟</h3>
            <p className="text-xs text-emerald-600 mt-0.5">매일매일 기록하는 습관, 아주 멋져요!</p>
          </div>
        </div>
        <div className="hidden sm:flex px-3 py-1.5 bg-white rounded-lg border border-emerald-100 items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          <span className="text-xs font-bold text-gray-700">+10P 적립 완료</span>
        </div>
      </div>
    );
  }

  // 아직 출석 전인 경우
  return (
    <div className="w-full bg-gradient-to-r from-sky-500 to-indigo-500 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between shadow-md gap-4">
      <div className="flex items-center gap-3 text-white">
        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
          <Gift className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-sm font-bold">아직 오늘 출석을 안 하셨네요!</h3>
          <p className="text-xs text-sky-100 mt-0.5">출석체크하고 10포인트 받아가세요 🎁</p>
        </div>
      </div>
      
      <button
        onClick={() => mutation.mutate()}
        disabled={mutation.isPending}
        className="w-full sm:w-auto px-5 py-2.5 bg-white text-indigo-600 font-bold text-sm rounded-xl hover:bg-sky-50 hover:scale-105 active:scale-95 transition-all shadow-sm disabled:opacity-70 disabled:hover:scale-100 flex items-center justify-center gap-2"
      >
        {mutation.isPending ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            처리 중...
          </>
        ) : (
          "출석체크 하기"
        )}
      </button>
    </div>
  );
}
