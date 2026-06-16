"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tags, ChevronDown, Check, X, Plus, Trash2 } from "lucide-react";
import { getCategories, getSubCategories, createSubCategory, updateSubCategory, deleteSubCategory } from "@/src/lib/api/categoryApi";

const Skeleton = ({ className }: { className?: string }) => (
  <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
);

/* ── 카테고리 행 (소분류 인라인 관리) ── */
function CategoryRow({ category }: { category: Category }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [addName, setAddName] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [rowError, setRowError] = useState("");

  const { data: subCategories = [], isLoading } = useQuery({
    queryKey: ["subCategories", category.id],
    queryFn: () => getSubCategories(category.id),
    enabled: open,
    staleTime: 1000 * 60 * 5,
  });

  const { mutate: mutateAdd, isPending: isAdding } = useMutation({
    mutationFn: (name: string) => createSubCategory(category.id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subCategories", category.id] });
      setAddName("");
      setShowAdd(false);
      setRowError("");
    },
    onError: (e: Error) => setRowError(e.message),
  });

  const { mutate: mutateUpdate } = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      updateSubCategory(id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subCategories", category.id] });
      setEditingId(null);
      setRowError("");
    },
    onError: (e: Error) => setRowError(e.message),
  });

  const { mutate: mutateDelete } = useMutation({
    mutationFn: deleteSubCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subCategories", category.id] });
      setRowError("");
    },
    onError: (e: Error) => setRowError(e.message),
  });

  const handleAdd = () => {
    const name = addName.trim();
    if (!name) return;
    const dup = subCategories.some(
      (s) => s.name.replace(/\s+/g, "").toLowerCase() === name.replace(/\s+/g, "").toLowerCase(),
    );
    if (dup) { setRowError("이미 존재하는 세부 항목입니다."); return; }
    mutateAdd(name);
  };

  const handleUpdateSave = (id: string) => {
    const name = editName.trim();
    if (!name) return;
    mutateUpdate({ id, name });
  };

  const isIncome = category.type === "INCOME";

  return (
    <li className="border-b border-gray-100 last:border-0">
      {/* 대분류 행 */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${isIncome ? "bg-emerald-500" : "bg-sky-500"}`} />
          <span className="text-sm font-medium text-gray-800 truncate">{category.name}</span>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {/* 소분류 영역 */}
      {open && (
        <div className="bg-gray-50/60 px-6 pb-4 pt-1">
          {isLoading ? (
            <div className="space-y-2 py-2">
              {[1, 2].map((i) => (
                <div key={i} className="flex items-center justify-between">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-6 w-16" />
                </div>
              ))}
            </div>
          ) : subCategories.length === 0 && !showAdd ? (
            <p className="text-xs text-gray-400 py-2">세부 항목이 없습니다.</p>
          ) : (
            <ul className="space-y-1 mb-2">
              {subCategories.map((sc) =>
                editingId === sc.id ? (
                  <li key={sc.id} className="flex items-center gap-2 py-1">
                    <input
                      autoFocus
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleUpdateSave(sc.id);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      className="flex-1 text-sm border border-sky-400 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-sky-200"
                    />
                    <button onClick={() => handleUpdateSave(sc.id)} className="p-1 text-sky-600 hover:bg-sky-100 rounded-lg transition-colors">
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setEditingId(null)} className="p-1 text-gray-400 hover:bg-gray-200 rounded-lg transition-colors">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </li>
                ) : (
                  <li key={sc.id} className="flex items-center justify-between py-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm text-gray-700 truncate">{sc.name}</span>
                      {sc.isSystem && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-400 flex-shrink-0">
                          기본
                        </span>
                      )}
                    </div>
                    {!sc.isSystem && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => { setEditingId(sc.id); setEditName(sc.name); }}
                          className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                          <span className="text-xs">수정</span>
                        </button>
                        <button
                          onClick={() => { if (window.confirm(`"${sc.name}" 항목을 삭제하시겠습니까?`)) mutateDelete(sc.id); }}
                          className="p-1 text-red-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </li>
                )
              )}
            </ul>
          )}

          {/* 소분류 추가 폼 */}
          {showAdd ? (
            <div className="flex items-center gap-2 mt-2">
              <input
                autoFocus
                placeholder="세부 항목 이름"
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAdd();
                  if (e.key === "Escape") { setShowAdd(false); setAddName(""); setRowError(""); }
                }}
                className="flex-1 text-sm border border-sky-400 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-sky-200"
              />
              <button onClick={handleAdd} disabled={isAdding || !addName.trim()} className="p-1 text-sky-600 hover:bg-sky-100 disabled:opacity-50 rounded-lg transition-colors">
                <Check className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => { setShowAdd(false); setAddName(""); setRowError(""); }} className="p-1 text-gray-400 hover:bg-gray-200 rounded-lg transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => { setShowAdd(true); setRowError(""); }} className="flex items-center gap-1 mt-1 text-xs text-sky-600 hover:text-sky-700 font-medium">
              <Plus className="w-3 h-3" />세부 항목 추가
            </button>
          )}

          {rowError && <p className="mt-1 text-xs text-red-500">{rowError}</p>}
        </div>
      )}
    </li>
  );
}

export default function CategoryTabDesktop() {
  const { data: allCategories = [], isLoading: isAllCategoriesLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: () => getCategories(),
    staleTime: 1000 * 60 * 5,
  });

  const incomeCategories = allCategories.filter((c) => c.type === "INCOME");
  const expenseCategories = allCategories.filter((c) => c.type === "EXPENSE");

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex items-center gap-2 mb-2">
        <Tags className="w-5 h-5 text-sky-500" />
        <h2 className="font-bold text-gray-900 text-lg">카테고리 관리</h2>
      </div>
      <p className="text-sm text-gray-500 bg-sky-50/50 p-4 rounded-xl border border-sky-100/50">
        대분류 항목은 고정되어 있으며 각 항목을 클릭하여 하위 소분류를 추가, 수정, 삭제할 수 있습니다.
      </p>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        {/* 수입 카테고리 */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-emerald-50/30 flex items-center justify-between">
            <h3 className="font-semibold text-emerald-800 text-sm">수입 카테고리</h3>
            <span className="text-xs font-medium text-emerald-600 bg-emerald-100/50 px-2.5 py-1 rounded-full">
              {incomeCategories.length}개
            </span>
          </div>

          {isAllCategoriesLoading ? (
            <div className="divide-y divide-gray-100 bg-white">
              {[1, 2].map((i) => (
                <div key={i} className="flex items-center justify-between px-6 py-5">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-4 w-8" />
                </div>
              ))}
            </div>
          ) : (
            <ul className="divide-y divide-gray-100/60 bg-white">
              {incomeCategories.length === 0 ? (
                <li className="px-6 py-8 text-center text-sm text-gray-400">수입 카테고리가 없습니다.</li>
              ) : (
                incomeCategories.map((category) => (
                  <CategoryRow key={category.id} category={category} />
                ))
              )}
            </ul>
          )}
        </div>

        {/* 지출 카테고리 */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-sky-50/30 flex items-center justify-between">
            <h3 className="font-semibold text-sky-800 text-sm">지출 카테고리</h3>
            <span className="text-xs font-medium text-sky-600 bg-sky-100/50 px-2.5 py-1 rounded-full">
              {expenseCategories.length}개
            </span>
          </div>

          {isAllCategoriesLoading ? (
            <div className="divide-y divide-gray-100 bg-white">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center justify-between px-6 py-5">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-4 w-8" />
                </div>
              ))}
            </div>
          ) : (
            <ul className="divide-y divide-gray-100/60 bg-white">
              {expenseCategories.length === 0 ? (
                <li className="px-6 py-8 text-center text-sm text-gray-400">지출 카테고리가 없습니다.</li>
              ) : (
                expenseCategories.map((category) => (
                  <CategoryRow key={category.id} category={category} />
                ))
              )}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
