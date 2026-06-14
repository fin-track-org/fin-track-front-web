"use client";

import { useState } from "react";
import { User, CreditCard, Tags, Wallet, Repeat, Settings, ChevronRight, ChevronLeft } from "lucide-react";

import ProfileAccountTab from "./tabs/ProfileAccountTab";
import PaymentMethodTab from "./tabs/PaymentMethodTab";
import CategoryTab from "./tabs/CategoryTab";
import BudgetTab from "./tabs/BudgetTab";
import RecurringTab from "./tabs/RecurringTab";
import PreferencesTab from "./tabs/PreferencesTab";

type TabId = "profile" | "payment" | "category" | "budget" | "recurring" | "preferences" | null;

export default function ProfileMobileView() {
  const [activeTab, setActiveTab] = useState<TabId>(null);

  const renderActiveTabContent = () => {
    switch (activeTab) {
      case "profile": return <ProfileAccountTab />;
      case "preferences": return <PreferencesTab />;
      case "category": return <CategoryTab />;
      case "payment": return <PaymentMethodTab />;
      case "budget": return <BudgetTab />;
      case "recurring": return <RecurringTab />;
      default: return null;
    }
  };

  const getTabTitle = () => {
    switch (activeTab) {
      case "profile": return "프로필 & 계정";
      case "preferences": return "앱 환경 설정";
      case "category": return "카테고리 관리";
      case "payment": return "결제수단 관리";
      case "budget": return "예산 설정";
      case "recurring": return "반복 거래 관리";
      default: return "";
    }
  };

  if (activeTab) {
    return (
      <div className="lg:hidden w-[calc(100%+2rem)] -mx-4 -mt-4 bg-gray-50/50 min-h-screen pb-20">
        {/* 모바일 서브페이지 헤더 */}
        <div className="sticky top-0 z-20 bg-white border-b border-gray-200/80 px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => setActiveTab(null)}
            className="p-1.5 -ml-1.5 text-gray-500 hover:text-gray-900 rounded-full hover:bg-gray-100 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-base font-bold text-gray-900">{getTabTitle()}</h2>
        </div>
        
        {/* 서브페이지 콘텐츠 */}
        <div className="p-4">
          {renderActiveTabContent()}
        </div>
      </div>
    );
  }

  return (
    <div className="lg:hidden w-[calc(100%+2rem)] -mx-4 -mt-4 pb-24">
      {/* 타이틀 영역 */}
      <div className="px-5 py-6 bg-white border-b border-gray-100 mb-2">
        <h1 className="text-xl font-bold text-gray-900">마이페이지</h1>
        <p className="text-xs text-gray-500 mt-1">내 프로필과 가계부 환경 설정을 관리하세요.</p>
      </div>

      {/* 설정 리스트 메뉴 */}
      <div className="bg-white border-y border-gray-100 divide-y divide-gray-100/60 mb-2">
        <button
          onClick={() => setActiveTab("profile")}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-8 h-8 rounded-full bg-sky-50 flex items-center justify-center text-sky-600">
              <User className="w-4 h-4" />
            </div>
            <span className="text-sm font-semibold text-gray-800">프로필 & 계정</span>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-300" />
        </button>

        <button
          onClick={() => setActiveTab("preferences")}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-8 h-8 rounded-full bg-sky-50 flex items-center justify-center text-sky-600">
              <Settings className="w-4 h-4" />
            </div>
            <span className="text-sm font-semibold text-gray-800">앱 환경 설정</span>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-300" />
        </button>
      </div>

      <div className="px-5 pt-4 pb-2">
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">가계부 설정</p>
      </div>
      
      <div className="bg-white border-y border-gray-100 divide-y divide-gray-100/60 mb-6">
        <button
          onClick={() => setActiveTab("category")}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Tags className="w-4 h-4" />
            </div>
            <span className="text-sm font-semibold text-gray-800">카테고리 관리</span>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-300" />
        </button>
        
        <button
          onClick={() => setActiveTab("payment")}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
              <CreditCard className="w-4 h-4" />
            </div>
            <span className="text-sm font-semibold text-gray-800">결제수단 관리</span>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-300" />
        </button>

        <button
          onClick={() => setActiveTab("budget")}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Wallet className="w-4 h-4" />
            </div>
            <span className="text-sm font-semibold text-gray-800">예산 설정</span>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-300" />
        </button>

        <button
          onClick={() => setActiveTab("recurring")}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Repeat className="w-4 h-4" />
            </div>
            <span className="text-sm font-semibold text-gray-800">반복 거래 관리</span>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-300" />
        </button>
      </div>
    </div>
  );
}
