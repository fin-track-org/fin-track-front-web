"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Wallet, Plus, Check, X, Pencil, Trash2, ChevronDown } from "lucide-react";
import { getBudgetTemplates, createBudgetTemplate, updateBudgetTemplate, deleteBudgetTemplate } from "@/src/lib/api/budgetApi";
import { getCategories, getSubCategories } from "@/src/lib/api/categoryApi";

const Skeleton = ({ className }: { className?: string }) => (
  <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
);

function formatAmount(n: number) {
  return n.toLocaleString("ko-KR") + "원";
}

/* ── 예산 그룹 행 (카테고리별 접기/펼치기) ── */
function BudgetGroupRow({
  group,
  onUpdate,
  onDelete,
}: {
  group: BudgetTemplateGroupRes;
  onUpdate: (id: string, amount: number) => void;
  onDelete: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState("");

  const handleUpdateSave = (id: string) => {
    const amount = Number(editAmount);
    if (!amount || amount <= 0) return;
    onUpdate(id, amount);
    setEditingId(null);
  };

  const hasCategoryBudget = group.targetAmount !== null && group.id !== null;
  const hasItems = group.items.length > 0;
  const totalCount = (hasCategoryBudget ? 1 : 0) + group.items.length;

  return (
    <li className="border-b border-gray-100 last:border-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="inline-block w-2 h-2 rounded-full flex-shrink-0 bg-sky-500" />
          <span className="text-sm font-medium text-gray-800 truncate">{group.categoryName}</span>
          <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0 bg-gray-100 text-gray-500">
            {totalCount}개
          </span>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="bg-gray-50/60 px-6 pb-4 pt-1">
          <ul className="space-y-1">
            {hasCategoryBudget && (
              <li className="flex items-center justify-between py-2 border-b border-gray-200/50">
                {editingId === group.id ? (
                  <>
                    <span className="text-sm text-gray-500">대분류 전체</span>
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <input
                          autoFocus
                          type="number"
                          value={editAmount}
                          onChange={(e) => setEditAmount(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleUpdateSave(group.id!);
                            if (e.key === "Escape") setEditingId(null);
                          }}
                          className="w-32 text-sm text-right border border-sky-400 rounded-lg px-3 py-1.5 pr-6 outline-none focus:ring-2 focus:ring-sky-200"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">원</span>
                      </div>
                      <button onClick={() => handleUpdateSave(group.id!)} className="p-1 text-sky-600 hover:bg-sky-100 rounded-lg transition-colors"><Check className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setEditingId(null)} className="p-1 text-gray-400 hover:bg-gray-200 rounded-lg transition-colors"><X className="w-3.5 h-3.5" /></button>
                    </div>
                  </>
                ) : (
                  <>
                    <span className="text-sm text-gray-500">대분류 전체</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-700">{formatAmount(group.targetAmount!)}</span>
                      <button onClick={() => { setEditingId(group.id); setEditAmount(String(group.targetAmount)); }} className="p-1 text-gray-400 hover:bg-gray-200 rounded-lg transition-colors"><Pencil className="w-3 h-3" /></button>
                      <button onClick={() => { if (confirm(`"${group.categoryName}" 예산을 삭제하시겠습니까?`)) onDelete(group.id!); }} className="p-1 text-red-400 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-3 h-3" /></button>
                    </div>
                  </>
                )}
              </li>
            )}

            {group.items.map((item) =>
              editingId === item.id ? (
                <li key={item.id} className="flex items-center justify-between py-2">
                  <span className="text-sm text-gray-700">{item.subCategoryName}</span>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <input
                        autoFocus
                        type="number"
                        value={editAmount}
                        onChange={(e) => setEditAmount(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleUpdateSave(item.id);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        className="w-32 text-sm text-right border border-sky-400 rounded-lg px-3 py-1.5 pr-6 outline-none focus:ring-2 focus:ring-sky-200"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">원</span>
                    </div>
                    <button onClick={() => handleUpdateSave(item.id)} className="p-1 text-sky-600 hover:bg-sky-100 rounded-lg transition-colors"><Check className="w-3.5 h-3.5" /></button>
                    <button onClick={() => setEditingId(null)} className="p-1 text-gray-400 hover:bg-gray-200 rounded-lg transition-colors"><X className="w-3.5 h-3.5" /></button>
                  </div>
                </li>
              ) : (
                <li key={item.id} className="flex items-center justify-between py-2">
                  <span className="text-sm text-gray-700">{item.subCategoryName}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-700">{formatAmount(item.targetAmount)}</span>
                    <button onClick={() => { setEditingId(item.id); setEditAmount(String(item.targetAmount)); }} className="p-1 text-gray-400 hover:bg-gray-200 rounded-lg transition-colors"><Pencil className="w-3 h-3" /></button>
                    <button onClick={() => { if (confirm(`"${item.subCategoryName}" 예산을 삭제하시겠습니까?`)) onDelete(item.id); }} className="p-1 text-red-400 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-3 h-3" /></button>
                  </div>
                </li>
              ),
            )}
          </ul>

          {!hasCategoryBudget && !hasItems && (
            <p className="text-xs text-gray-400 py-2">예산이 설정되지 않았습니다.</p>
          )}
        </div>
      )}
    </li>
  );
}

export default function BudgetTab() {
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCategoryId, setNewCategoryId] = useState("");
  const [newSubCategoryId, setNewSubCategoryId] = useState("");
  const [newAmount, setNewAmount] = useState("");

  const { data: templates = [], isLoading: isTemplatesLoading } = useQuery({
    queryKey: ["budgetTemplates"],
    queryFn: getBudgetTemplates,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: () => getCategories(),
    staleTime: 1000 * 60 * 5,
  });

  const { data: newSubCategories = [] } = useQuery({
    queryKey: ["subCategories", newCategoryId],
    queryFn: () => getSubCategories(newCategoryId),
    enabled: !!newCategoryId && showAddForm,
    staleTime: 1000 * 60 * 5,
  });

  const { mutate: mutateCreate, isPending: isCreating } = useMutation({
    mutationFn: ({ categoryId, subCategoryId, targetAmount }: { categoryId: string; subCategoryId?: string; targetAmount: number }) =>
      createBudgetTemplate({ categoryId, targetAmount, subCategoryId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgetTemplates"] });
      setShowAddForm(false);
      setNewAmount("");
    },
  });

  const { mutate: mutateUpdate } = useMutation({
    mutationFn: ({ id, amount }: { id: string; amount: number }) => updateBudgetTemplate(id, { targetAmount: amount }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgetTemplates"] });
    },
  });

  const { mutate: mutateDelete } = useMutation({
    mutationFn: deleteBudgetTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgetTemplates"] });
    },
  });

  const handleAddSubmit = () => {
    const amount = Number(newAmount);
    if (!newCategoryId || !amount || amount <= 0) return;
    mutateCreate({ categoryId: newCategoryId, subCategoryId: newSubCategoryId || undefined, targetAmount: amount });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-white">
          <div className="flex items-center gap-2">
            <Wallet className="w-4.5 h-4.5 text-sky-500" />
            <h2 className="font-bold text-gray-900 text-base">월 예산 템플릿</h2>
          </div>
          {!showAddForm && categories.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setShowAddForm(true);
                setNewCategoryId(categories[0]?.id ?? "");
                setNewSubCategoryId("");
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-sky-600 bg-sky-50 hover:bg-sky-100 rounded-xl transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />추가
            </button>
          )}
        </div>

        {isTemplatesLoading ? (
          <div className="divide-y divide-gray-100 bg-white">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between px-6 py-5">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-12" />
              </div>
            ))}
          </div>
        ) : templates.length === 0 && !showAddForm ? (
          <div className="px-6 py-12 text-center bg-gray-50/20">
            <p className="text-sm text-gray-400 mb-4 font-medium">설정된 예산 템플릿이 없습니다.</p>
            <button
              type="button"
              onClick={() => {
                setShowAddForm(true);
                setNewCategoryId(categories[0]?.id ?? "");
                setNewSubCategoryId("");
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-xl transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />예산 템플릿 추가
            </button>
          </div>
        ) : (
          <div className="bg-white">
            <ul className="divide-y divide-gray-100/60">
              {templates.map((group) => (
                <BudgetGroupRow
                  key={group.categoryId}
                  group={group}
                  onUpdate={(id, amount) => mutateUpdate({ id, amount })}
                  onDelete={(id) => mutateDelete(id)}
                />
              ))}
            </ul>

            {showAddForm && (
              <div className="px-6 py-5 bg-sky-50/20 border-t border-sky-100/40">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <select
                    value={newCategoryId}
                    onChange={(e) => { setNewCategoryId(e.target.value); setNewSubCategoryId(""); }}
                    className="flex-1 min-w-[140px] text-sm border border-gray-300 rounded-xl px-3 py-2 outline-none focus:ring-4 focus:ring-sky-100 focus:border-sky-400 bg-white"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  {newSubCategories.length > 0 && (
                    <select
                      value={newSubCategoryId}
                      onChange={(e) => setNewSubCategoryId(e.target.value)}
                      className="flex-1 min-w-[140px] text-sm border border-gray-300 rounded-xl px-3 py-2 outline-none focus:ring-4 focus:ring-sky-100 focus:border-sky-400 bg-white"
                    >
                      <option value="">소분류 선택 안함</option>
                      {newSubCategories.map((sc) => (
                        <option key={sc.id} value={sc.id}>{sc.name}</option>
                      ))}
                    </select>
                  )}
                  <div className="relative max-w-[180px]">
                    <input
                      type="number"
                      placeholder="0"
                      value={newAmount}
                      onChange={(e) => setNewAmount(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleAddSubmit(); if (e.key === "Escape") setShowAddForm(false); }}
                      className="w-full text-sm text-right border border-gray-300 rounded-xl px-3.5 py-2 pr-7 outline-none focus:ring-4 focus:ring-sky-100 focus:border-sky-400 bg-white"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">원</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleAddSubmit} disabled={isCreating} className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 disabled:opacity-50 rounded-xl transition-colors shadow-sm">
                      <Check className="w-3.5 h-3.5" />저장
                    </button>
                    <button onClick={() => { setShowAddForm(false); setNewAmount(""); }} className="p-2 text-gray-400 hover:bg-gray-100 rounded-xl transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
