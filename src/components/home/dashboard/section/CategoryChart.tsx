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
  return (
    <div className="md:flex-1 bg-white rounded-xl p-6 shadow-sm border border-gray-200">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">카테고리별 지출</h3>
        <div className="flex gap-2">
          <button
            onClick={() => onChangeView("chart")}
            className={`cursor-pointer p-2 rounded-lg transition-colors ${
              viewType === "chart"
                ? "bg-blue-50 text-blue-600"
                : "text-gray-400 hover:bg-gray-50"
            }`}
          >
            <PieChartIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => onChangeView("table")}
            className={`cursor-pointer p-2 rounded-lg transition-colors ${
              viewType === "table"
                ? "bg-blue-50 text-blue-600"
                : "text-gray-400 hover:bg-gray-50"
            }`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {viewType === "chart" ? (
        <div className="flex items-center gap-8">
          <div className="shrink-0">
            <ResponsiveContainer width={200} height={200}>
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
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
          <div className="flex-1 space-y-3">
            {data.map((item) => (
              <div
                key={item.name}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
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
        <div className="space-y-2">
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
    </div>
  );
}
