"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, ShoppingBag, Package, Users, Activity, ShieldAlert, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, PieChart, Pie, Cell } from "recharts";
import { formatPrice } from "@/lib/utils";
import Link from "next/link";

const revenueData = [
  { name: "Jan", total: 1200 },
  { name: "Feb", total: 2100 },
  { name: "Mar", total: 1800 },
  { name: "Apr", total: 2400 },
  { name: "May", total: 2800 },
  { name: "Jun", total: 3200 },
  { name: "Jul", total: 4100 },
];

const orderStatusData = [
  { name: "Pending", value: 400, color: "#eab308" }, // yellow-500
  { name: "Processing", value: 300, color: "#3b82f6" }, // blue-500
  { name: "Shipped", value: 300, color: "#10b981" }, // emerald-500
  { name: "Delivered", value: 200, color: "#8b5cf6" }, // violet-500
];

const kpiData = [
  { 
    title: "Total Revenue", 
    value: 45231.89, 
    isCurrency: true, 
    change: 20.1, 
    trend: "up", 
    icon: DollarSign,
    color: "from-emerald-500/20 to-emerald-500/0",
    textColor: "text-emerald-500"
  },
  { 
    title: "Total Orders", 
    value: 2350, 
    isCurrency: false, 
    change: 18.2, 
    trend: "up", 
    icon: ShoppingBag,
    color: "from-blue-500/20 to-blue-500/0",
    textColor: "text-blue-500"
  },
  { 
    title: "Products", 
    value: 124, 
    isCurrency: false, 
    change: -2.4, 
    trend: "down", 
    icon: Package,
    color: "from-pomegranate-500/20 to-pomegranate-500/0",
    textColor: "text-pomegranate-500"
  },
  { 
    title: "Active Customers", 
    value: 573, 
    isCurrency: false, 
    change: 12.5, 
    trend: "up", 
    icon: Users,
    color: "from-gold-500/20 to-gold-500/0",
    textColor: "text-gold-400"
  },
];

export default function AdminDashboard() {
  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-semibold text-white tracking-tight">Dashboard Overview</h1>
          <p className="text-sm text-slate-400 mt-1">Here's what's happening with your store today.</p>
        </div>
      </div>
      
      {/* KPI Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {kpiData.map((kpi, idx) => (
          <div key={idx} className="relative overflow-hidden rounded-2xl bg-slate-900/50 backdrop-blur-sm border border-white/10 p-6 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
            <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl ${kpi.color} rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-110`} />
            
            <div className="flex items-center justify-between relative z-10">
              <p className="text-sm font-medium text-slate-400">{kpi.title}</p>
              <div className={`p-2 rounded-xl bg-slate-950/50 border border-white/5 shadow-inner`}>
                <kpi.icon className={`h-4 w-4 ${kpi.textColor}`} />
              </div>
            </div>
            
            <div className="mt-4 relative z-10">
              <h3 className="text-3xl font-bold text-white tracking-tight">
                {kpi.isCurrency ? formatPrice(kpi.value) : kpi.value.toLocaleString()}
              </h3>
              <div className="flex items-center mt-2">
                <span className={`flex items-center text-xs font-medium ${kpi.trend === 'up' ? 'text-emerald-400' : 'text-pomegranate-400'}`}>
                  {kpi.trend === 'up' ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowDownRight className="h-3 w-3 mr-1" />}
                  {Math.abs(kpi.change)}%
                </span>
                <span className="text-xs text-slate-500 ml-2">vs last month</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        {/* Revenue Chart */}
        <div className="col-span-4 rounded-2xl bg-slate-900/50 backdrop-blur-sm border border-white/10 shadow-lg p-6 flex flex-col">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white">Revenue Analytics</h3>
            <p className="text-sm text-slate-400">Monthly revenue breakdown</p>
          </div>
          <div className="flex-1 min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1D4E89" stopOpacity={0.5}/>
                    <stop offset="95%" stopColor="#1D4E89" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="name" 
                  stroke="#64748b" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                  dy={10}
                />
                <YAxis 
                  stroke="#64748b" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                  tickFormatter={(value) => `$${value}`} 
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc' }}
                  itemStyle={{ color: '#60a5fa' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="total" 
                  stroke="#3b82f6" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorTotal)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Order Status Donut */}
        <div className="col-span-3 rounded-2xl bg-slate-900/50 backdrop-blur-sm border border-white/10 shadow-lg p-6 flex flex-col">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white">Order Status</h3>
            <p className="text-sm text-slate-400">Distribution of current orders</p>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center min-h-[300px]">
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={orderStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {orderStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-3 mt-6 text-sm text-slate-300 w-full">
              {orderStatusData.map(status => (
                <div key={status.name} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: status.color }} />
                  {status.name}
                  <span className="font-semibold text-white ml-1">{status.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Logging Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl bg-slate-900/50 backdrop-blur-sm border border-white/10 shadow-lg p-6">
          <div className="flex items-center gap-2 mb-6">
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <Activity className="w-5 h-5 text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-white">Activity Pulse</h3>
            <span className="text-xs text-slate-500 ml-2">Last 24h</span>
          </div>
          <div className="h-56 flex items-center justify-center text-slate-500 bg-slate-950/50 rounded-xl border border-dashed border-white/5">
            Chart: Events per hour (User / Admin / System)
          </div>
        </div>

        <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-pomegranate-900/20 backdrop-blur-sm border border-pomegranate-900/30 shadow-lg p-6">
          <div className="flex items-center gap-2 mb-6">
            <div className="p-2 rounded-xl bg-pomegranate-500/10 border border-pomegranate-500/20">
              <ShieldAlert className="w-5 h-5 text-pomegranate-400" />
            </div>
            <h3 className="text-lg font-semibold text-white">Recent Alerts</h3>
            <span className="ml-auto flex items-center gap-2 text-xs font-medium text-pomegranate-400 bg-pomegranate-500/10 px-2.5 py-1 rounded-full border border-pomegranate-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-pomegranate-500 animate-pulse" />
              2 Critical
            </span>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-slate-950/40 rounded-xl border border-white/5 hover:border-pomegranate-500/30 transition-colors group">
              <span className="text-xs text-slate-400 font-mono mt-0.5">17:45</span>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-200">Printful API: Timeout</p>
                <p className="text-xs text-slate-400 mt-1">Failed to sync product ID #4092</p>
              </div>
              <Link href="/admin/logs" className="text-xs font-semibold text-pomegranate-400 hover:text-pomegranate-300 opacity-0 group-hover:opacity-100 transition-opacity">View →</Link>
            </div>
            
            <div className="flex items-start gap-3 p-4 bg-slate-950/40 rounded-xl border border-white/5 hover:border-gold-500/30 transition-colors group">
              <span className="text-xs text-slate-400 font-mono mt-0.5">16:12</span>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-200">Rate Limit Triggered</p>
                <p className="text-xs text-slate-400 mt-1">IP 192.168.x.x hit auth limit</p>
              </div>
              <Link href="/admin/logs" className="text-xs font-semibold text-gold-400 hover:text-gold-300 opacity-0 group-hover:opacity-100 transition-opacity">View →</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
