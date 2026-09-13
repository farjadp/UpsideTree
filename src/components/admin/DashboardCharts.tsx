"use client";

import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, PieChart, Pie, Cell } from "recharts";
import { formatPrice } from "@/lib/utils";

export type RevenuePoint = { name: string; total: number };
export type StatusSlice = { name: string; value: number; color: string };

const tooltipStyle = { backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "8px", color: "#f8fafc" };

export function RevenueChart({ data }: { data: RevenuePoint[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#1D4E89" stopOpacity={0.5} />
            <stop offset="95%" stopColor="#1D4E89" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} dy={10} />
        <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
        <Tooltip
          contentStyle={tooltipStyle}
          itemStyle={{ color: "#60a5fa" }}
          formatter={(value) => formatPrice(Number(value))}
        />
        <Area type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function OrderStatusChart({ data }: { data: StatusSlice[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={5} dataKey="value" stroke="none">
          {data.map((entry) => (
            <Cell key={entry.name} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} />
      </PieChart>
    </ResponsiveContainer>
  );
}
