"use client";

import React, { useState } from "react";
import Link from "next/link";
import { MessageCircle, Mail } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/src/components/ui/dialog";

export default function Footer() {
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  return (
    <>
      <footer className="py-12 bg-slate-50 border-t border-gray-100 mt-auto">
        <div className="container mx-auto px-6 max-w-5xl flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-gray-400 text-sm">
            &copy; {new Date().getFullYear()} 게으른 가계부. All rights reserved.
          </div>
          <div className="flex items-center gap-6 text-sm font-medium text-slate-500">
            <Link href="/guide" className="hover:text-slate-900 transition-colors">이용 가이드</Link>
            <Link href="/faq" className="hover:text-slate-900 transition-colors">자주 묻는 질문(FAQ)</Link>
            <button 
              onClick={() => setIsContactModalOpen(true)}
              className="hover:text-slate-900 transition-colors font-medium"
            >
              문의하기
            </button>
          </div>
        </div>
      </footer>

      <Dialog open={isContactModalOpen} onOpenChange={setIsContactModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-center text-xl font-bold mb-2">무엇을 도와드릴까요?</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-4">
            <a 
              href="https://open.kakao.com/o/shsOEVxi" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-4 p-4 rounded-xl border border-yellow-200 bg-yellow-50 hover:bg-yellow-100 transition-colors"
            >
              <div className="w-12 h-12 bg-[#FEE500] rounded-full flex items-center justify-center shrink-0">
                <MessageCircle className="text-black" size={24} />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-gray-900">카카오톡 오픈채팅</span>
                <span className="text-xs text-gray-600">가장 빠르게 답변을 받을 수 있어요</span>
              </div>
            </a>

            <a 
              href="mailto:support@lazy-kit.com" 
              className="flex items-center gap-4 p-4 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <div className="w-12 h-12 bg-white border border-gray-200 rounded-full flex items-center justify-center shrink-0 shadow-sm">
                <Mail className="text-gray-600" size={24} />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-gray-900">이메일 문의</span>
                <span className="text-xs text-gray-600">support@lazy-kit.com</span>
              </div>
            </a>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
