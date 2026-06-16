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

function NumberInput({ 
  value, 
  onChange, 
  placeholder, 
  className,
  autoFocus
}: { 
  value: number | null, 
  onChange: (v: number | null) => void, 
  placeholder?: string, 
  className?: string,
  autoFocus?: boolean
}) {
  const [str, setStr] = useState(value != null ? value.toLocaleString() : "");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, "");
    if (!raw) {
      setStr("");
      onChange(null);
      return;
    }
    const num = parseInt(raw, 10);
    setStr(num.toLocaleString());
    onChange(num);
  };

  const defaultClassName = "w-full text-sm border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-4 focus:ring-sky-100 focus:border-sky-400 bg-white transition-all text-right pr-8";

  return (
    <div className="relative">
      <input
        autoFocus={autoFocus}
        type="text"
        value={str}
        onChange={handleChange}
        placeholder={placeholder}
        className={className || defaultClassName}
      />
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-medium pointer-events-none">원</span>
    </div>
  );
}

function BudgetAddForm({
  categories,
  onSave,
  onCancel,
  isSubmitting
}: {
  categories: Category[];
  onSave: (data: { categoryId: string; subCategoryId?: string; targetAmount: number }) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}) {
  const [categoryId, setCategoryId] = useState("");
  const [subCategoryId, setSubCategoryId] = useState("");
  const [amount, setAmount] = useState<number | null>(null);

  // 예산은 주로 지출에 설정하므로 EXPENSE만 필터링 (필요 시 수정 가능)
  const expenseCategories = categories.filter(c => c.type === "EXPENSE");

  const { data: subCategories = [] } = useQuery({
    queryKey: ["subCategories", categoryId],
    queryFn: () => getSubCategories(categoryId),
    enabled: !!categoryId,
    staleTime: 1000 * 60 * 5,
  });

  return (
    <div className="p-5 lg:p-6 bg-gray-50/50 rounded-2xl border border-sky-100 shadow-sm mt-2 mb-4 mx-4 sm:mx-6">
      <div className="space-y-6">
        {/* 대분류 선택 칩 */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-2">대분류 카테고리</label>
          <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto p-1 -m-1">
            {expenseCategories.map(c => (
              <button
                key={c.id}
                onClick={() => { setCategoryId(c.id); setSubCategoryId(""); }}
                className={`px-2.5 py-1.5 rounded-lg text-[13px] font-medium transition-all ${
                  categoryId === c.id 
                    ? "bg-sky-500 text-white shadow-md ring-2 ring-sky-500 ring-offset-1" 
                    : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 hover:border-gray-300"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        {/* 소분류 선택 칩 (대분류 선택 시에만 렌더링) */}
        {categoryId && subCategories.length > 0 && (
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-2">소분류 (선택)</label>
            <div className="flex flex-wrap gap-1.5 p-1 -m-1">
              <button
                onClick={() => setSubCategoryId("")}
                className={`px-2.5 py-1 rounded-md text-[12px] font-medium transition-all ${
                  subCategoryId === "" 
                    ? "bg-gray-800 text-white shadow-sm ring-1 ring-gray-800 ring-offset-1" 
                    : "bg-gray-100 text-gray-600 border border-transparent hover:bg-gray-200"
                }`}
              >
                전체 (대분류 공통 예산)
              </button>
              {subCategories.map(sc => (
                <button
                  key={sc.id}
                  onClick={() => setSubCategoryId(sc.id)}
                  className={`px-2.5 py-1 rounded-md text-[12px] font-medium transition-all ${
                    subCategoryId === sc.id 
                      ? "bg-sky-500 text-white shadow-sm ring-1 ring-sky-500 ring-offset-1" 
                      : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 hover:border-gray-300"
                  }`}
                >
                  {sc.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 금액 입력 */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-2">예산 금액 <span className="text-red-400">*</span></label>
          <NumberInput value={amount} onChange={setAmount} placeholder="예: 300,000" />
        </div>

        {/* 액션 버튼 */}
        <div className="flex justify-end gap-2 pt-4 border-t border-gray-200/60">
          <button 
            type="button"
            onClick={onCancel} 
            className="px-5 py-2.5 text-sm font-semibold text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors shadow-sm"
          >
            취소
          </button>
          <button
            type="button"
            disabled={!categoryId || !amount || amount <= 0 || isSubmitting}
            onClick={() => onSave({ categoryId, subCategoryId: subCategoryId || undefined, targetAmount: amount! })}
            className="flex items-center gap-1.5 px-6 py-2.5 text-sm font-semibold text-white bg-sky-600 hover:bg-sky-700 disabled:opacity-50 rounded-xl transition-colors shadow-sm"
          >
            <Check className="w-4 h-4" />예산 추가
          </button>
        </div>
      </div>
    </div>
  );
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
  const [editAmount, setEditAmount] = useState<number | null>(null);

  const handleUpdateSave = (id: string) => {
    if (!editAmount || editAmount <= 0) return;
    onUpdate(id, editAmount);
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
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 active:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="inline-block w-2 h-2 rounded-full flex-shrink-0 bg-sky-500" />
          <span className="text-[15px] font-semibold text-gray-800 truncate">{group.categoryName}</span>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-md flex-shrink-0 bg-gray-100 text-gray-500">
            {totalCount}개
          </span>
        </div>
        <ChevronDown className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="bg-gray-50/40 px-4 sm:px-6 pb-4 pt-1 border-t border-gray-100/50">
          <ul className="space-y-1">
            {hasCategoryBudget && (
              <li className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3 border-b border-gray-200/50">
                <span className="text-sm font-medium text-gray-600 px-2">대분류 전체</span>
                {editingId === group.id ? (
                  <div className="flex items-center gap-2 self-end sm:self-auto w-full sm:w-auto">
                    <div className="flex-1 sm:flex-initial">
                      <NumberInput 
                        autoFocus
                        value={editAmount} 
                        onChange={setEditAmount}
                        className="w-full sm:w-[150px] text-sm text-right border border-sky-400 rounded-xl px-3 py-2 outline-none focus:ring-4 focus:ring-sky-100 bg-white pr-8 transition-all shadow-sm"
                      />
                    </div>
                    <button onClick={() => handleUpdateSave(group.id!)} className="p-2 text-white bg-sky-500 hover:bg-sky-600 rounded-xl transition-colors shadow-sm flex-shrink-0"><Check className="w-4 h-4" /></button>
                    <button onClick={() => setEditingId(null)} className="p-2 text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors shadow-sm flex-shrink-0"><X className="w-4 h-4" /></button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <span className="text-[15px] font-bold text-gray-800 mr-1">{formatAmount(group.targetAmount!)}</span>
                    <button onClick={() => { setEditingId(group.id); setEditAmount(group.targetAmount); }} className="p-2 text-gray-400 hover:text-sky-600 hover:bg-sky-50 rounded-xl transition-colors"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => { if (window.confirm(`"${group.categoryName}" 예산을 삭제하시겠습니까?`)) onDelete(group.id!); }} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </div>
                )}
              </li>
            )}

            {group.items.map((item) => (
              <li key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3 border-b border-gray-100 last:border-0">
                <span className="text-sm font-medium text-gray-600 px-2">{item.subCategoryName}</span>
                {editingId === item.id ? (
                  <div className="flex items-center gap-2 self-end sm:self-auto w-full sm:w-auto">
                    <div className="flex-1 sm:flex-initial">
                      <NumberInput 
                        autoFocus
                        value={editAmount} 
                        onChange={setEditAmount}
                        className="w-full sm:w-[150px] text-sm text-right border border-sky-400 rounded-xl px-3 py-2 outline-none focus:ring-4 focus:ring-sky-100 bg-white pr-8 transition-all shadow-sm"
                      />
                    </div>
                    <button onClick={() => handleUpdateSave(item.id)} className="p-2 text-white bg-sky-500 hover:bg-sky-600 rounded-xl transition-colors shadow-sm flex-shrink-0"><Check className="w-4 h-4" /></button>
                    <button onClick={() => setEditingId(null)} className="p-2 text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors shadow-sm flex-shrink-0"><X className="w-4 h-4" /></button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <span className="text-[15px] font-bold text-gray-800 mr-1">{formatAmount(item.targetAmount)}</span>
                    <button onClick={() => { setEditingId(item.id); setEditAmount(item.targetAmount); }} className="p-2 text-gray-400 hover:text-sky-600 hover:bg-sky-50 rounded-xl transition-colors"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => { if (window.confirm(`"${item.subCategoryName}" 예산을 삭제하시겠습니까?`)) onDelete(item.id); }} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </div>
                )}
              </li>
            ))}
          </ul>

          {!hasCategoryBudget && !hasItems && (
            <p className="text-[13px] text-gray-400 py-4 px-2 text-center">예산이 설정되지 않았습니다.</p>
          )}
        </div>
      )}
    </li>
  );
}

export default function BudgetTab() {
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);

  const { data: templates = [], isLoading: isTemplatesLoading } = useQuery({
    queryKey: ["budgetTemplates"],
    queryFn: getBudgetTemplates,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: () => getCategories(),
    staleTime: 1000 * 60 * 5,
  });

  const { mutate: mutateCreate, isPending: isCreating } = useMutation({
    mutationFn: ({ categoryId, subCategoryId, targetAmount }: { categoryId: string; subCategoryId?: string; targetAmount: number }) =>
      createBudgetTemplate({ categoryId, targetAmount, subCategoryId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgetTemplates"] });
      setShowAddForm(false);
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

  return (
    <div className="space-y-6 animate-in fade-in duration-200 pb-10">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-white">
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-sky-500" />
            <h2 className="font-bold text-gray-900 text-lg">월 예산 템플릿</h2>
          </div>
          {!showAddForm && categories.length > 0 && (
            <button
              type="button"
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-xl transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />추가
            </button>
          )}
        </div>

        <div className="px-6 py-4 border-b border-gray-100/60 bg-sky-50/30">
          <p className="text-xs font-medium text-gray-500 leading-relaxed">
            매월 반복되는 지출 예산을 카테고리별로 설정하세요. 
            설정된 예산은 대시보드에서 소비 패턴을 분석하는 데 사용됩니다.
          </p>
        </div>

        {showAddForm && (
          <BudgetAddForm 
            categories={categories}
            onSave={mutateCreate}
            onCancel={() => setShowAddForm(false)}
            isSubmitting={isCreating}
          />
        )}

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
          <div className="px-6 py-12 mt-4 mx-4 text-center bg-gray-50 border border-dashed border-gray-200 rounded-2xl mb-4">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm border border-gray-100">
              <Wallet className="w-5 h-5 text-gray-400" />
            </div>
            <p className="text-sm text-gray-500 mb-4 font-medium">설정된 예산 템플릿이 없습니다.</p>
            <button
              type="button"
              onClick={() => setShowAddForm(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-sky-600 bg-sky-50 hover:bg-sky-100 rounded-xl transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />예산 템플릿 추가하기
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
          </div>
        )}
      </div>
    </div>
  );
}
