"use client";

import { CheckCircle, Info, X, XCircle } from "lucide-react";
import { useToastState, type ToastItem, type ToastType } from "@/src/hook/useToast";

const styles: Record<
  ToastType,
  { container: string; icon: React.ReactNode }
> = {
  success: {
    container:
      "bg-white border border-green-200 text-green-800 shadow-lg",
    icon: <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />,
  },
  error: {
    container:
      "bg-white border border-red-200 text-red-800 shadow-lg",
    icon: <XCircle className="w-5 h-5 text-red-500 shrink-0" />,
  },
  info: {
    container:
      "bg-white border border-gray-200 text-gray-800 shadow-lg",
    icon: <Info className="w-5 h-5 text-sky-500 shrink-0" />,
  },
};

function Toast({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: string) => void }) {
  const { container, icon } = styles[toast.type];

  return (
    <div
      className={`flex items-start gap-3 rounded-xl px-4 py-3 pr-3 max-w-sm w-full animate-in slide-in-from-left-4 fade-in duration-200 ${container}`}
      role="alert"
    >
      {icon}
      <p className="flex-1 text-sm font-medium leading-snug">{toast.message}</p>
      <button
        onClick={() => onDismiss(toast.id)}
        className="shrink-0 p-0.5 rounded-md hover:bg-black/5 transition-colors"
        aria-label="닫기"
      >
        <X className="w-4 h-4 opacity-50" />
      </button>
    </div>
  );
}

export default function ToastContainer() {
  const { toasts, removeToast } = useToastState();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-6 z-[9999] flex flex-col gap-2 items-start">
      {toasts.map((t) => (
        <Toast key={t.id} toast={t} onDismiss={removeToast} />
      ))}
    </div>
  );
}
