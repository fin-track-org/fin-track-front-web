"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { List, PieChartIcon } from "lucide-react";

export default function CategoryChart({
  data,
  viewType,
  onChangeView,
}: {
  data: CategoryData[];
  viewType: "chart" | "table";
  onChangeView: (v: "chart" | "table") => void;
}) {
  const isEmpty =
    !data || data.length === 0 || data.every((d) => d.value === 0);

  return (
    <section className="lg:flex-1 bg-white rounded-xl p-6 shadow-sm border border-gray-200">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">카테고리별 지출</h3>
        <div className="flex gap-2">
          <button
            onClick={() => onChangeView("chart")}
            className={` p-2 rounded-lg transition-colors ${
              viewType === "chart"
                ? "bg-blue-50 text-blue-600"
                : "text-gray-400 hover:bg-gray-50"
            }`}
          >
            <PieChartIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => onChangeView("table")}
            className={` p-2 rounded-lg transition-colors ${
              viewType === "table"
                ? "bg-blue-50 text-blue-600"
                : "text-gray-400 hover:bg-gray-50"
            }`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ✅ Empty 상태 */}
      {isEmpty ? (
        <div className="h-[260px] lg:h-[300px] flex flex-col items-center justify-center text-center text-gray-400">
          <div className="mb-3">
            <PieChartIcon className="w-10 h-10 opacity-40" />
          </div>
          <p className="text-sm font-medium mb-1">
            아직 집계된 지출이 없습니다
          </p>
          <p className="text-xs text-gray-400">
            거래를 추가하면 카테고리 분석이 표시됩니다
          </p>
          <button className="mt-4 text-xs text-sky-600 hover:underline">
            거래 추가하러 가기
          </button>
        </div>
      ) : viewType === "chart" ? (
        <div className="flex flex-col lg:flex-row items-center gap-8">
          <div className="shrink-0 w-full max-w-[260px] lg:max-w-[300px] h-[260px] lg:h-[300px] aspect-square">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius="60%"
                  outerRadius="90%"
                  paddingAngle={2}
                  dataKey="value"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => {
                    if (typeof value === "number") {
                      return `₩${value.toLocaleString()}`;
                    }
                    return value ?? "";
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="flex-1 space-y-3 w-full">
            {data.map((item) => (
              <div
                key={item.name}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm text-gray-700">{item.name}</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-gray-900">
                    {item.value.toLocaleString()}원
                  </div>
                  <div className="text-xs text-gray-500">
                    {item.percentage}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-2 h-[260px] lg:h-[300px] overflow-y-auto">
          {data.map((item, index) => (
            <div
              key={item.name}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-sm font-semibold text-gray-600 border border-gray-200">
                  {index + 1}
                </span>
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    {item.name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {item.percentage}%
                  </div>
                </div>
              </div>
              <div className="text-sm font-semibold text-gray-900">
                ₩{item.value.toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
