"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Notice } from "@/types/notice";
import { getNotices } from "@/src/lib/api/noticeApi";

export default function NoticePopup() {
  const [popupNotices, setPopupNotices] = useState<Notice[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const fetchAndFilterNotices = async () => {
      // 3일 이내 공지인지 확인하는 함수
      const isWithin3Days = (dateString: string) => {
        const noticeDate = new Date(dateString);
        const today = new Date();
        const diffTime = Math.abs(today.getTime() - noticeDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= 3;
      };

      const getStoredReadNotices = () => {
        try {
          const stored = localStorage.getItem("read_notices");
          return stored ? JSON.parse(stored) : [];
        } catch (e) {
          return [];
        }
      };

      const readNotices: number[] = getStoredReadNotices();
      const allNotices = await getNotices();

      // 보여줄 공지 필터링: (상단 고정이거나 3일 이내) 이면서 (아직 안 읽음)
      const noticesToShow = allNotices.filter(
        (notice) =>
          notice.isVisible &&
          (notice.isPinned || isWithin3Days(notice.createdAt)) &&
          !readNotices.includes(notice.id)
      );

      setPopupNotices(noticesToShow);
    };

    fetchAndFilterNotices();
  }, []);

  if (popupNotices.length === 0) return null;

  const currentNotice = popupNotices[currentIndex];

  const markAsReadAndClose = (id: number) => {
    try {
      const stored = localStorage.getItem("read_notices");
      const readNotices: number[] = stored ? JSON.parse(stored) : [];
      if (!readNotices.includes(id)) {
        readNotices.push(id);
        localStorage.setItem("read_notices", JSON.stringify(readNotices));
      }
    } catch (e) {
      console.error("Failed to save to localStorage", e);
    }

    // 다음 공지가 있으면 넘어가고, 없으면 팝업 닫기 (배열을 비움)
    if (currentIndex < popupNotices.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setPopupNotices([]);
    }
  };

  const handleDetailClick = () => {
    if (currentNotice.detailUrl) {
      window.open(currentNotice.detailUrl, "_blank");
    }
    markAsReadAndClose(currentNotice.id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50/50">
          <h3 className="font-bold text-gray-800">
            알림
            {popupNotices.length > 1 && (
              <span className="ml-2 text-xs text-sky-600 bg-sky-100 px-2 py-0.5 rounded-full">
                {currentIndex + 1} / {popupNotices.length}
              </span>
            )}
          </h3>
          <button
            onClick={() => markAsReadAndClose(currentNotice.id)}
            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <h4 className="text-lg font-bold text-gray-900 mb-2 leading-tight">
            {currentNotice.title}
          </h4>
          <p className="text-sm text-gray-600 leading-relaxed">
            {currentNotice.summary}
          </p>
        </div>

        {/* Footer */}
        {currentNotice.detailUrl && (
          <div className="p-4 bg-gray-50 border-t border-gray-100">
            <button
              onClick={handleDetailClick}
              className="w-full py-3 px-4 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-xl transition-colors shadow-sm"
            >
              자세히 보기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
