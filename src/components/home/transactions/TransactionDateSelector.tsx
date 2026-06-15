"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";

type ViewMode = "daily" | "weekly" | "monthly" | "custom";

interface TransactionDateSelectorProps {
  viewMode: ViewMode;
  onChangeViewMode: (mode: ViewMode) => void;
  dateDisplayString: string;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
}

export default function TransactionDateSelector({
  viewMode,
  onChangeViewMode,
  dateDisplayString,
  onPrev,
  onNext,
  onToday,
}: TransactionDateSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 드롭다운 외부 클릭 시 닫기
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const viewModes: { mode: ViewMode; label: string }[] = [
    { mode: "daily", label: "일간" },
    { mode: "weekly", label: "주간" },
    { mode: "monthly", label: "월간" },
    { mode: "custom", label: "직접 설정" },
  ];

  const currentLabel = viewModes.find(v => v.mode === viewMode)?.label || "선택";

  return (
    <div className="flex flex-row items-center gap-2 sm:gap-3 w-full justify-between sm:justify-start">
      {/* 보기 모드 (세그먼트 탭 대체용 드롭다운 또는 버튼) */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1 md:gap-1.5 px-2.5 md:px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs md:text-sm font-semibold rounded-lg transition-colors"
        >
          {currentLabel} <ChevronDown className="w-3.5 h-3.5 md:w-4 md:h-4 text-gray-500" />
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 mt-1 w-32 bg-white rounded-lg shadow-lg border border-gray-100 z-50 overflow-hidden">
            {viewModes.map((v) => (
              <button
                key={v.mode}
                onClick={() => {
                  onChangeViewMode(v.mode);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-4 py-2 text-sm font-medium transition-colors ${
                  viewMode === v.mode ? "bg-sky-50 text-sky-600" : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 날짜 네비게이션 */}
      <div className="flex items-center gap-2">
        <button
          onClick={onPrev}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
          disabled={viewMode === "custom"}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <span className="text-base md:text-lg font-bold text-gray-900 min-w-[100px] md:min-w-[120px] text-center tracking-tight">
          {dateDisplayString}
        </span>

        <button
          onClick={onNext}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
          disabled={viewMode === "custom"}
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        <button
          onClick={onToday}
          className="ml-0.5 md:ml-1 px-2.5 py-1 text-[10px] md:text-xs font-bold text-sky-600 bg-sky-50 hover:bg-sky-100 rounded-md transition-colors"
        >
          오늘
        </button>
      </div>
    </div>
  );
}
