"use client";

import { useState, useRef, useEffect } from "react";
import { Bell, X } from "lucide-react";

// TODO: 나중에 실제 API 데이터로 교체
const DUMMY_NOTIFICATIONS = [
  { id: 1, title: "[업데이트] 포인트 상점 껍데기가 추가되었습니다!", date: "2026-06-05", isNew: true },
  { id: 2, title: "[공지] 주말 서버 점검 안내 (예정)", date: "2026-06-03", isNew: false },
  { id: 3, title: "[이벤트] 가계부 작성하고 100P 받으세요", date: "2026-06-01", isNew: false },
];

interface NotificationBellProps {
  variant?: "icon" | "sidebar";
}

export default function NotificationBell({ variant = "icon" }: NotificationBellProps = {}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const hasNew = DUMMY_NOTIFICATIONS.some((n) => n.isNew);

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      {variant === "icon" ? (
        <button
          onClick={() => setIsOpen((prev) => !prev)}
          className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
          aria-label="공지사항 및 알림"
        >
          <Bell className="w-5 h-5" />
          {/* Red Dot for new notifications */}
          {hasNew && (
            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full" />
          )}
        </button>
      ) : (
        <button
          onClick={() => setIsOpen((prev) => !prev)}
          className="w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors text-gray-700 hover:bg-gray-50"
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <Bell className="w-5 h-5" />
              {hasNew && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full" />
              )}
            </div>
            <span className="font-medium">공지사항</span>
          </div>
        </button>
      )}

      {/* Dropdown Panel */}
      {isOpen && (
        <div className={`absolute z-50 w-80 bg-white border border-gray-200 shadow-lg rounded-xl overflow-hidden flex flex-col ${
          variant === "sidebar" 
            ? "bottom-full mb-2 left-0 lg:left-full lg:ml-2 lg:bottom-auto lg:top-0" 
            : "right-0 mt-2 lg:right-auto lg:left-0"
        }`}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
            <h3 className="font-bold text-gray-800 text-sm">공지사항 및 업데이트</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-600 p-1 rounded-md"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto p-2 flex flex-col gap-1">
            {DUMMY_NOTIFICATIONS.length > 0 ? (
              DUMMY_NOTIFICATIONS.map((noti) => (
                <button
                  key={noti.id}
                  className="w-full text-left p-3 rounded-lg hover:bg-gray-50 transition-colors flex flex-col gap-1"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className={`text-sm font-medium leading-tight ${noti.isNew ? "text-gray-900" : "text-gray-600"}`}>
                      {noti.title}
                    </span>
                    {noti.isNew && (
                      <span className="shrink-0 text-[10px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded">
                        NEW
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-400">{noti.date}</span>
                </button>
              ))
            ) : (
              <div className="p-4 text-center text-sm text-gray-500">
                새로운 공지사항이 없습니다.
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-2 border-t border-gray-100">
            <button className="w-full py-2 text-xs font-semibold text-sky-600 hover:bg-sky-50 rounded-lg transition-colors">
              전체 보기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
