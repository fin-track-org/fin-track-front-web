"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, Check, X, Plus, Trash2 } from "lucide-react";
import { getCategories, getSubCategories, createSubCategory, updateSubCategory, deleteSubCategory } from "@/src/lib/api/categoryApi";

const Skeleton = ({ className }: { className?: string }) => (
  <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
);

/* ── 카테고리 행 (소분류 인라인 관리 - 모바일) ── */
function CategoryRowMobile({ category }: { category: Category }) {
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
    <div className="border border-gray-100 rounded-2xl mb-3 bg-white shadow-sm overflow-hidden">
      {/* 대분류 행 */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 active:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className={`inline-block w-2.5 h-2.5 rounded-full flex-shrink-0 ${isIncome ? "bg-emerald-500" : "bg-sky-500"}`} />
          <span className="text-[15px] font-semibold text-gray-800 truncate">{category.name}</span>
        </div>
        <div className="flex items-center gap-3">
          {subCategories.length > 0 && !open && (
             <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">{subCategories.length}</span>
          )}
          <ChevronDown className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
        </div>
      </button>

      {/* 소분류 영역 */}
      {open && (
        <div className="bg-gray-50/50 px-5 pb-5 pt-2 border-t border-gray-100">
          {isLoading ? (
            <div className="space-y-3 py-2">
              {[1, 2].map((i) => (
                <div key={i} className="flex items-center justify-between">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-6 w-16" />
                </div>
              ))}
            </div>
          ) : subCategories.length === 0 && !showAdd ? (
            <div className="text-center py-4">
              <p className="text-[13px] text-gray-400">세부 항목이 없습니다.</p>
            </div>
          ) : (
            <ul className="space-y-2 mb-3">
              {subCategories.map((sc) =>
                editingId === sc.id ? (
                  <li key={sc.id} className="flex flex-col gap-2 p-3 bg-white rounded-xl border border-sky-100 shadow-sm">
                    <input
                      autoFocus
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleUpdateSave(sc.id);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-sky-400"
                    />
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setEditingId(null)} className="px-3 py-1.5 text-xs font-medium text-gray-500 bg-gray-100 rounded-lg active:bg-gray-200">
                        취소
                      </button>
                      <button onClick={() => handleUpdateSave(sc.id)} className="px-3 py-1.5 text-xs font-medium text-white bg-sky-500 rounded-lg active:bg-sky-600">
                        저장
                      </button>
                    </div>
                  </li>
                ) : (
                  <li key={sc.id} className="flex items-center justify-between py-2 px-1 border-b border-gray-100/50 last:border-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[14px] text-gray-700 truncate">{sc.name}</span>
                      {sc.isSystem && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-gray-100 text-gray-400 flex-shrink-0">
                          기본
                        </span>
                      )}
                    </div>
                    {!sc.isSystem && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => { setEditingId(sc.id); setEditName(sc.name); }}
                          className="p-2 text-gray-400 active:text-gray-600 active:bg-gray-200 rounded-lg transition-colors"
                        >
                          <span className="text-[11px] font-medium">수정</span>
                        </button>
                        <button
                          onClick={() => { if (window.confirm(`"${sc.name}" 항목을 삭제하시겠습니까?`)) mutateDelete(sc.id); }}
                          className="p-2 text-red-400 active:text-red-500 active:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
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
            <div className="flex flex-col gap-2 mt-3 p-3 bg-white rounded-xl border border-sky-100 shadow-sm">
              <input
                autoFocus
                placeholder="세부 항목 이름"
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAdd();
                  if (e.key === "Escape") { setShowAdd(false); setAddName(""); setRowError(""); }
                }}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-sky-400"
              />
              <div className="flex justify-end gap-2">
                <button onClick={() => { setShowAdd(false); setAddName(""); setRowError(""); }} className="px-3 py-1.5 text-xs font-medium text-gray-500 bg-gray-100 rounded-lg active:bg-gray-200">
                  취소
                </button>
                <button onClick={handleAdd} disabled={isAdding || !addName.trim()} className="px-3 py-1.5 text-xs font-medium text-white bg-sky-500 disabled:opacity-50 rounded-lg active:bg-sky-600">
                  추가
                </button>
              </div>
            </div>
          ) : (
            <button 
              type="button" 
              onClick={() => { setShowAdd(true); setRowError(""); }} 
              className="w-full flex items-center justify-center gap-1.5 mt-2 py-3 bg-white border border-dashed border-sky-200 rounded-xl text-sm text-sky-600 active:bg-sky-50 font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />새 세부 항목 추가
            </button>
          )}

          {rowError && <p className="mt-2 text-xs text-red-500 text-center">{rowError}</p>}
        </div>
      )}
    </div>
  );
}

export default function CategoryTabMobile() {
  const [activeType, setActiveType] = useState<"EXPENSE" | "INCOME">("EXPENSE");

  const { data: allCategories = [], isLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: () => getCategories(),
    staleTime: 1000 * 60 * 5,
  });

  const displayCategories = allCategories.filter((c) => c.type === activeType);

  return (
    <div className="animate-in fade-in duration-200 pb-10">
      {/* 탭 세그먼트 컨트롤 */}
      <div className="bg-gray-100/80 p-1 rounded-xl flex items-center mb-6">
        <button
          className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${
            activeType === "EXPENSE"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500"
          }`}
          onClick={() => setActiveType("EXPENSE")}
        >
          지출 카테고리
        </button>
        <button
          className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${
            activeType === "INCOME"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500"
          }`}
          onClick={() => setActiveType("INCOME")}
        >
          수입 카테고리
        </button>
      </div>

      <div className="mb-4 px-1">
        <p className="text-[13px] text-gray-500 leading-relaxed">
          항목을 탭하여 하위 카테고리를 확인하고 관리할 수 있습니다. 기본 분류는 수정할 수 없습니다.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-[72px] bg-white border border-gray-100 rounded-2xl flex items-center px-5 gap-3">
              <Skeleton className="w-8 h-8 rounded-full" />
              <Skeleton className="h-5 w-32" />
            </div>
          ))}
        </div>
      ) : (
        <div>
          {displayCategories.length === 0 ? (
            <div className="py-12 text-center text-gray-400 bg-white border border-gray-100 rounded-2xl">
              <p className="text-sm">등록된 {activeType === "EXPENSE" ? "지출" : "수입"} 카테고리가 없습니다.</p>
            </div>
          ) : (
            displayCategories.map((category) => (
              <CategoryRowMobile key={category.id} category={category} />
            ))
          )}
        </div>
      )}
    </div>
  );
}
