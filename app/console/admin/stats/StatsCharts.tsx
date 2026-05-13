"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const SUBJECT_COLORS: Record<string, string> = {
  高数: "#3b82f6",
  线代: "#a855f7",
  概率论: "#10b981",
  其他: "#71717a",
};

const MODEL_COLORS = ["#f59e0b", "#ef4444", "#3b82f6", "#a855f7", "#10b981"];

export interface StatsProps {
  revenue: { date: string; cny: number }[];
  signups: { date: string; count: number }[];
  subjects: { name: string; value: number }[];
  models: Record<string, number | string>[];
  modelKeys: string[];
}

export function StatsCharts(props: StatsProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* Revenue */}
      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold">💰 收入趋势</h3>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={props.revenue}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
            <XAxis
              dataKey="date"
              stroke="#71717a"
              fontSize={10}
              tickLine={false}
            />
            <YAxis stroke="#71717a" fontSize={10} tickLine={false} />
            <Tooltip
              formatter={(v: number) => `¥${v.toFixed(2)}`}
              labelClassName="text-xs"
              contentStyle={{ fontSize: 12 }}
            />
            <Line
              type="monotone"
              dataKey="cny"
              stroke="#10b981"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </section>

      {/* Signups */}
      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold">👥 注册趋势</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={props.signups}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
            <XAxis
              dataKey="date"
              stroke="#71717a"
              fontSize={10}
              tickLine={false}
            />
            <YAxis
              stroke="#71717a"
              fontSize={10}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip
              labelClassName="text-xs"
              contentStyle={{ fontSize: 12 }}
            />
            <Bar dataKey="count" fill="#3b82f6" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </section>

      {/* Subject distribution */}
      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold">📚 学科分布（已付）</h3>
        {props.subjects.length === 0 ? (
          <p className="py-12 text-center text-xs text-zinc-500">
            还没有已付订单
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={props.subjects}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={70}
                label={(entry) =>
                  typeof entry === "object" && entry !== null && "name" in entry
                    ? String((entry as { name: string }).name)
                    : ""
                }
              >
                {props.subjects.map((s, i) => (
                  <Cell
                    key={i}
                    fill={SUBJECT_COLORS[s.name] ?? "#71717a"}
                  />
                ))}
              </Pie>
              <Tooltip contentStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </section>

      {/* Model usage stacked area */}
      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold">🤖 模型 token 用量</h3>
        {props.modelKeys.length === 0 ? (
          <p className="py-12 text-center text-xs text-zinc-500">
            还没有 AI 调用日志
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={props.models}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
              <XAxis
                dataKey="date"
                stroke="#71717a"
                fontSize={10}
                tickLine={false}
              />
              <YAxis
                stroke="#71717a"
                fontSize={10}
                tickLine={false}
                width={50}
              />
              <Tooltip contentStyle={{ fontSize: 12 }} />
              {props.modelKeys.map((m, i) => (
                <Area
                  key={m}
                  type="monotone"
                  dataKey={m}
                  stackId="1"
                  stroke={MODEL_COLORS[i % MODEL_COLORS.length]}
                  fill={MODEL_COLORS[i % MODEL_COLORS.length]}
                  fillOpacity={0.6}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </section>
    </div>
  );
}
