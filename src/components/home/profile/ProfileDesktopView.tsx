"use client";

import { useState } from "react";
import { User, CreditCard, Tags, Wallet, Repeat, Settings } from "lucide-react";

import ProfileAccountTab from "./tabs/ProfileAccountTab";
import PaymentMethodTab from "./tabs/PaymentMethodTab";
import CategoryTabDesktop from "./tabs/CategoryTabDesktop";
import BudgetTab from "./tabs/BudgetTab";
import RecurringTab from "./tabs/RecurringTab";
import PreferencesTab from "./tabs/PreferencesTab";

type TabId = "profile" | "payment" | "category" | "budget" | "recurring" | "preferences";

export default function ProfileDesktopView() {
  const [activeTab, setActiveTab] = useState<TabId>("profile");

  return (
    <div className="hidden lg:block w-full max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">마이페이지</h1>
        <p className="text-sm text-gray-500 mt-1.5">내 프로필과 가계부 환경 설정을 관리하세요.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* 왼쪽 탭 네비게이션 (데스크탑) */}
        <div className="w-full md:w-64 flex-shrink-0">
          <nav className="flex flex-col space-y-1">
            <button
              onClick={() => setActiveTab("profile")}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                activeTab === "profile" ? "bg-sky-50 text-sky-700" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <User className="w-4.5 h-4.5" />프로필 & 계정
            </button>
            <button
              onClick={() => setActiveTab("preferences")}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                activeTab === "preferences" ? "bg-sky-50 text-sky-700" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <Settings className="w-4.5 h-4.5" />앱 환경 설정
            </button>
            <div className="pt-4 pb-2">
              <p className="px-4 text-xs font-bold text-gray-400 uppercase tracking-wider">가계부 설정</p>
            </div>
            <button
              onClick={() => setActiveTab("category")}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                activeTab === "category" ? "bg-sky-50 text-sky-700" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <Tags className="w-4.5 h-4.5" />카테고리 관리
            </button>
            <button
              onClick={() => setActiveTab("payment")}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                activeTab === "payment" ? "bg-sky-50 text-sky-700" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <CreditCard className="w-4.5 h-4.5" />결제수단 관리
            </button>
            <button
              onClick={() => setActiveTab("budget")}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                activeTab === "budget" ? "bg-sky-50 text-sky-700" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <Wallet className="w-4.5 h-4.5" />예산 설정
            </button>
            <button
              onClick={() => setActiveTab("recurring")}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                activeTab === "recurring" ? "bg-sky-50 text-sky-700" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <Repeat className="w-4.5 h-4.5" />반복 거래 관리
            </button>
          </nav>
        </div>

        {/* 오른쪽 탭 콘텐츠 */}
        <div className="flex-1 min-w-0 pb-12">
          {activeTab === "profile" && <ProfileAccountTab />}
          {activeTab === "preferences" && <PreferencesTab />}
          {activeTab === "category" && <CategoryTabDesktop />}
          {activeTab === "payment" && <PaymentMethodTab />}
          {activeTab === "budget" && <BudgetTab />}
          {activeTab === "recurring" && <RecurringTab />}
        </div>
      </div>
    </div>
  );
}
