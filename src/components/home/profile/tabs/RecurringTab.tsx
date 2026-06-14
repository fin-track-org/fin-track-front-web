"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bookmark, Plus, Pencil, Trash2, Repeat } from "lucide-react";
import { getCategories } from "@/src/lib/api/categoryApi";
import { getAccounts } from "@/src/lib/api/accountApi";
import {
  getTransactionTemplates,
  createTransactionTemplate,
  updateTransactionTemplate,
  deleteTransactionTemplate,
  TransactionTemplateRes
} from "@/src/lib/api/transaction/templateApi";
import {
  getRecurringTransactions,
  createRecurringTransaction,
  updateRecurringTransaction,
  deleteRecurringTransaction,
} from "@/src/lib/api/transaction/recurringApi";
import { RecurringTransactionRes } from "@/src/types/recurringTransaction";
import AddTemplateModal from "@/src/components/AddTemplateModal";
import AddRecurringModal from "@/src/components/AddRecurringModal";

const Skeleton = ({ className }: { className?: string }) => (
  <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
);

function formatAmount(n: number) {
  return n.toLocaleString("ko-KR") + "원";
}

export default function RecurringTab() {
  const queryClient = useQueryClient();

  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TransactionTemplateRes | null>(null);

  const [showRecurringModal, setShowRecurringModal] = useState(false);
  const [editingRecurring, setEditingRecurring] = useState<RecurringTransactionRes | null>(null);

  const { data: allCategories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: () => getCategories(),
    staleTime: 1000 * 60 * 5,
  });

  const { data: transactionTemplates = [], isLoading: isTemplatesLoadingList } = useQuery({
    queryKey: ["transactionTemplates"],
    queryFn: getTransactionTemplates,
  });

  const { data: recurringTransactions = [], isLoading: isRecurringLoading } = useQuery({
    queryKey: ["recurringTransactions"],
    queryFn: getRecurringTransactions,
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ["accounts"],
    queryFn: getAccounts,
  });

  const { mutateAsync: mutateCreateTemplate } = useMutation({
    mutationFn: createTransactionTemplate,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["transactionTemplates"] }),
  });

  const { mutateAsync: mutateUpdateTemplate } = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateTransactionTemplate(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["transactionTemplates"] }),
  });

  const { mutateAsync: mutateCreateRecurring } = useMutation({
    mutationFn: createRecurringTransaction,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["recurringTransactions"] }),
  });

  const { mutateAsync: mutateUpdateRecurring } = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateRecurringTransaction(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["recurringTransactions"] }),
  });

  const { mutate: mutateDeleteTemplate } = useMutation({
    mutationFn: deleteTransactionTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactionTemplates"] });
    },
  });

  const { mutate: mutateDeleteRecurring } = useMutation({
    mutationFn: deleteRecurringTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurringTransactions"] });
    },
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 자주 사용하는 거래 */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-white">
          <div className="flex items-center gap-2">
            <Bookmark className="w-4.5 h-4.5 text-sky-500" />
            <h2 className="font-bold text-gray-900 text-base">자주 사용하는 거래</h2>
          </div>
          <button
            type="button"
            onClick={() => {
              setEditingTemplate(null);
              setShowTemplateModal(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-sky-600 bg-sky-50 hover:bg-sky-100 rounded-xl transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />추가
          </button>
        </div>

        {isTemplatesLoadingList ? (
          <div className="divide-y divide-gray-100 bg-white">
            {[1, 2].map((i) => (
              <div key={i} className="flex items-center justify-between px-6 py-5">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3.5 w-24" />
                </div>
              </div>
            ))}
          </div>
        ) : transactionTemplates.length === 0 ? (
          <div className="px-6 py-12 text-center bg-gray-50/20">
            <p className="text-sm text-gray-400 mb-4 font-medium">자주 사용하는 거래로 등록된 내역이 없습니다.</p>
            <button
              type="button"
              onClick={() => {
                setEditingTemplate(null);
                setShowTemplateModal(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-xl transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />자주 사용하는 거래 추가
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100/60 bg-white">
            {transactionTemplates.map((template) => (
              <li key={template.id} className="px-6 py-4 flex items-center justify-between gap-4 hover:bg-gray-50/30 transition-colors">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-800 truncate">{template.title}</p>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0 ${template.type === 'INCOME' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}>
                      {template.type === 'INCOME' ? '수입' : '지출'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-gray-400 font-medium">
                    <span className="font-semibold text-gray-600">{formatAmount(template.amount)}</span>
                    <span className="w-1 h-1 bg-gray-300 rounded-full" />
                    <span className="truncate">
                      {allCategories.find(c => c.id === template.categoryId)?.name || '카테고리 없음'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingTemplate(template);
                      setShowTemplateModal(true);
                    }}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm("정말로 이 거래 템플릿을 삭제하시겠습니까?")) {
                        mutateDeleteTemplate(template.id);
                      }
                    }}
                    className="p-2 text-red-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 반복 거래 관리 */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-white">
          <div className="flex items-center gap-2">
            <Repeat className="w-4.5 h-4.5 text-sky-500" />
            <h2 className="font-bold text-gray-900 text-base">반복 거래 관리</h2>
          </div>
          <button
            type="button"
            onClick={() => {
              setEditingRecurring(null);
              setShowRecurringModal(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-sky-600 bg-sky-50 hover:bg-sky-100 rounded-xl transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />추가
          </button>
        </div>

        {isRecurringLoading ? (
          <div className="divide-y divide-gray-100 bg-white">
            {[1, 2].map((i) => (
              <div key={i} className="flex items-center justify-between px-6 py-5">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3.5 w-24" />
                </div>
              </div>
            ))}
          </div>
        ) : recurringTransactions.length === 0 ? (
          <div className="px-6 py-12 text-center bg-gray-50/20">
            <p className="text-sm text-gray-400 mb-4 font-medium">등록된 반복 거래가 없습니다.</p>
            <button
              type="button"
              onClick={() => {
                setEditingRecurring(null);
                setShowRecurringModal(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-xl transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />반복 거래 추가
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100/60 bg-white">
            {recurringTransactions.map((recurring) => (
              <li key={recurring.id} className="px-6 py-4 flex items-center justify-between gap-4 hover:bg-gray-50/30 transition-colors">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-800 truncate">{recurring.description || '이름 없음'}</p>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0 ${recurring.type === 'INCOME' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}>
                      {recurring.type === 'INCOME' ? '수입' : '지출'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-gray-400 font-medium flex-wrap">
                    <span className="font-semibold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-lg">
                      {recurring.repeatType === "MONTHLY" ? `매월 ${recurring.repeatDay}일` : `매주 ${['일', '월', '화', '수', '목', '금', '토'][recurring.repeatDay % 7]}요일`}
                    </span>
                    <span className="w-1 h-1 bg-gray-300 rounded-full" />
                    <span className="font-semibold text-gray-600">{formatAmount(recurring.amount)}</span>
                    <span className="w-1 h-1 bg-gray-300 rounded-full" />
                    <span className="truncate">
                      {allCategories.find(c => c.id === recurring.categoryId)?.name || '카테고리 없음'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingRecurring(recurring);
                      setShowRecurringModal(true);
                    }}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm("정말로 이 반복 거래를 삭제하시겠습니까?")) {
                        mutateDeleteRecurring(recurring.id);
                      }
                    }}
                    className="p-2 text-red-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {showTemplateModal && (
        <AddTemplateModal
          open={showTemplateModal}
          onOpenChange={setShowTemplateModal}
          categories={allCategories}
          accounts={accounts}
          onSubmit={async (payload) => {
            if (editingTemplate) {
              await mutateUpdateTemplate({ id: editingTemplate.id, data: payload });
            } else {
              await mutateCreateTemplate(payload);
            }
          }}
          defaultValues={editingTemplate || undefined}
        />
      )}

      {showRecurringModal && (
        <AddRecurringModal
          open={showRecurringModal}
          onOpenChange={setShowRecurringModal}
          categories={allCategories}
          accounts={accounts}
          onSubmit={async (payload) => {
            if (editingRecurring) {
              await mutateUpdateRecurring({ id: editingRecurring.id, data: payload });
            } else {
              await mutateCreateRecurring(payload);
            }
          }}
          defaultValues={editingRecurring || undefined}
          mode={editingRecurring ? "edit" : "create"}
        />
      )}
    </div>
  );
}
