"use client";

import { useState, useRef, useEffect } from "react";
import { Bell, X } from "lucide-react";
import { Notice } from "@/types/notice";
import { getNotices } from "@/src/lib/api/noticeApi";

interface NotificationBellProps {
  variant?: "icon" | "sidebar";
}

export default function NotificationBell({ variant = "icon" }: NotificationBellProps = {}) {
  const [isOpen, setIsOpen] = useState(false);
  const [readNotices, setReadNotices] = useState<number[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
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

  const handleNoticeClick = (id: number, url?: string) => {
    // 읽음 처리
    try {
      if (!readNotices.includes(id)) {
        const newReadNotices = [...readNotices, id];
        setReadNotices(newReadNotices);
        localStorage.setItem("read_notices", JSON.stringify(newReadNotices));
        // storage 이벤트 수동 발생 (NoticePopup 등 다른 컴포넌트 동기화)
        window.dispatchEvent(new Event("storage"));
      }
    } catch (e) {
      console.error(e);
    }

    if (url) {
      window.open(url, "_blank");
    }
  };

  const handleViewAll = () => {
    window.open("https://cafe.naver.com/lazykit", "_blank");
  };

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
            {notices.length > 0 ? (
              notices.map((noti) => {
                const isRead = readNotices.includes(noti.id);
                // 날짜 포맷 (예: 2026-06-21)
                const dateStr = new Date(noti.createdAt).toLocaleDateString('ko-KR', {
                  year: 'numeric', month: '2-digit', day: '2-digit'
                }).replace(/\. /g, '-').replace('.', '');

                return (
                  <button
                    key={noti.id}
                    onClick={() => handleNoticeClick(noti.id, noti.detailUrl)}
                    className="w-full text-left p-3 rounded-lg hover:bg-gray-50 transition-colors flex flex-col gap-1"
                  >
                    <div className="flex items-start gap-2">
                      {/* 안 읽은 공지는 제목 옆에 작은 빨간 원 */}
                      <span className={`text-sm font-medium leading-tight flex-1 ${isRead ? "text-gray-400" : "text-gray-900"}`}>
                        {noti.title}
                        {!isRead && (
                          <span className="inline-block w-1.5 h-1.5 bg-red-500 rounded-full ml-2 mb-0.5" />
                        )}
                      </span>
                    </div>
                    {/* 내용 요약 (1줄로 자르기) */}
                    <span className={`text-xs truncate ${isRead ? "text-gray-400" : "text-gray-600"}`}>
                      {noti.summary}
                    </span>
                    <span className="text-[10px] text-gray-400 mt-0.5">{dateStr}</span>
                  </button>
                );
              })
            ) : (
              <div className="p-4 text-center text-sm text-gray-500">
                공지사항이 없습니다.
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-2 border-t border-gray-100">
            <button 
              onClick={handleViewAll}
              className="w-full py-2 text-xs font-semibold text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
            >
              전체 보기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
