"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Bell, X } from "lucide-react";
import { Notice } from "@/src/types/notice";
import { getNotices } from "@/src/lib/api/noticeApi";

interface NotificationBellProps {
  variant?: "icon" | "sidebar";
}

export default function NotificationBell({ variant = "icon" }: NotificationBellProps = {}) {
  const [isOpen, setIsOpen] = useState(false);
  const [readNotices, setReadNotices] = useState<number[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [mounted, setMounted] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    getNotices().then((data) => {
      setNotices(data.filter(n => n.isVisible));
    });
  }, []);

  // 로컬 스토리지에서 읽은 공지 ID 불러오기
  useEffect(() => {
    const loadReadNotices = () => {
      try {
        const stored = localStorage.getItem("read_notices");
        if (stored) {
          setReadNotices(JSON.parse(stored));
        }
      } catch (e) {
        console.error("Failed to parse read_notices", e);
      }
    };

    loadReadNotices();

    // 혹시 팝업이나 다른 탭에서 변경되었을 때 대비
    window.addEventListener("storage", loadReadNotices);
    return () => window.removeEventListener("storage", loadReadNotices);
  }, [isOpen]); // 드롭다운 열 때마다 최신 상태 반영

  const hasNew = notices.some((n) => !readNotices.includes(n.id));

  const handleNoticeClick = (id: number) => {
    // 읽음 처리
    try {
      if (!readNotices.includes(id)) {
        const newReadNotices = [...readNotices, id];
        setReadNotices(newReadNotices);
        localStorage.setItem("read_notices", JSON.stringify(newReadNotices));
        window.dispatchEvent(new Event("storage"));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const sidebarContent = (
    <div className={`fixed inset-0 z-[300] ${isOpen ? "pointer-events-auto" : "pointer-events-none"}`}>
      {/* Backdrop */}
      <div 
        className={`absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? "opacity-100" : "opacity-0"}`} 
        onClick={(e) => {
          e.stopPropagation(); // 부모(MobileTopBar 등)로 클릭 이벤트가 전파되는 것을 완벽 차단
          setIsOpen(false);
        }} 
      />
      
      {/* Sidebar: w-72로 수정하여 기존 서랍장 크기와 동일하게 맞춤 */}
      <div 
        className={`absolute top-0 right-0 bottom-0 w-72 bg-white shadow-2xl transform transition-transform duration-300 flex flex-col ${isOpen ? "translate-x-0" : "translate-x-full"}`}
        onClick={(e) => e.stopPropagation()} // 사이드바 내부 클릭 시 닫히지 않도록 이벤트 전파 차단
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-white">
          <h3 className="font-bold text-gray-900 text-lg">공지사항</h3>
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          {notices.length > 0 ? (
            notices.map((noti) => {
              const isRead = readNotices.includes(noti.id);
              // 날짜 포맷
              const dateStr = new Date(noti.createdAt).toLocaleDateString('ko-KR', {
                year: 'numeric', month: '2-digit', day: '2-digit'
              }).replace(/\. /g, '-').replace('.', '');

              return (
                <button
                  key={noti.id}
                  onClick={() => handleNoticeClick(noti.id)}
                  className={`w-full text-left p-4 rounded-xl border transition-all flex flex-col gap-2 ${
                    isRead 
                      ? "bg-gray-50 border-transparent hover:bg-gray-100 text-gray-500" 
                      : "bg-white border-sky-100 shadow-sm hover:shadow-md hover:border-sky-200"
                  }`}
                >
                  <div className="flex items-start gap-2 w-full">
                    <span className={`text-base font-bold leading-tight flex-1 ${isRead ? "text-gray-500" : "text-gray-900"}`}>
                      {noti.title}
                      {!isRead && (
                        <span className="inline-block w-1.5 h-1.5 bg-red-500 rounded-full ml-2 mb-1" />
                      )}
                    </span>
                  </div>
                  <span className={`text-sm leading-relaxed ${isRead ? "text-gray-400" : "text-gray-600"}`}>
                    {noti.summary}
                  </span>
                  <span className="text-xs text-gray-400 mt-1 font-medium">{dateStr}</span>
                </button>
              );
            })
          ) : (
            <div className="p-10 flex flex-col items-center justify-center text-center">
              <Bell className="w-12 h-12 text-gray-200 mb-4" />
              <span className="text-gray-500 font-medium">새로운 공지사항이 없습니다.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Bell Button (아이콘 형태 또는 사이드바 메뉴 형태) */}
      {variant === "icon" ? (
        <div ref={dropdownRef}>
          <button
            onClick={() => setIsOpen((prev) => !prev)}
            className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="공지사항 및 알림"
          >
            <Bell className="w-5 h-5" />
            {hasNew && (
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full" />
            )}
          </button>
        </div>
      ) : (
        <div ref={dropdownRef}>
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
        </div>
      )}

      {/* Slide-over Sidebar Panel via Portal */}
      {mounted && createPortal(sidebarContent, document.body)}
    </>
  );
}
