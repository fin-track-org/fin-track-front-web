"use client";

import { Wallet, CreditCard, Layout, Grid, Check } from "lucide-react";
import { useUserSettings } from "@/src/hook/useUserSettings";

export default function PreferencesTab() {
  const {
    userSetting,
    changeLedgerMode,
    isUpdating: isSettingUpdating,
    changeLedgerTheme,
    isThemeUpdating,
  } = useUserSettings();

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 가계부 모드 설정 */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <div>
          <h3 className="text-base font-bold text-gray-900">가계부 모드 설정</h3>
          <p className="text-xs text-gray-400 mt-1">원하는 관리 상세 수준에 따라 모드를 선택할 수 있습니다.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
    </div>
  );
}
