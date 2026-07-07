"use client";

// Chart wrappers with a validated dark-surface palette.
// Categorical slots (validated as a set): #3987e5 / #199e70 / #c98500.
// Single-series accents (validated): emerald #059669, sky #0284c7,
// rose #f43f5e, violet #8b5cf6, amber #d97706, teal #0d9488.

import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart,
  PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis, Line, LineChart,
} from "recharts";

export const CAT = ["#3987e5", "#199e70", "#c98500"];
const GRID = "rgba(255,255,255,0.06)";
const AXIS = "#898781";

const tooltipStyle = {
  background: "#18181b",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 8,
  fontSize: 12,
  color: "#fafafa",
};

const axisProps = {
  stroke: "none" as const,
  tick: { fill: AXIS, fontSize: 11 },
  tickLine: false,
  axisLine: false,
};

export function TrendArea({ data, dataKey, xKey, color = "#059669", height = 220, valueFormatter }: {
  data: Record<string, unknown>[]; dataKey: string; xKey: string; color?: string; height?: number;
  valueFormatter?: (v: number) => string;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <defs>
          <linearGradient id={`grad-${dataKey}-${color}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.25} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey={xKey} {...axisProps} />
        <YAxis {...axisProps} width={48} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v) => (valueFormatter ? valueFormatter(Number(v)) : v)} cursor={{ stroke: "rgba(255,255,255,0.15)" }} />
        <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} fill={`url(#grad-${dataKey}-${color})`} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function TrendLine({ data, dataKey, xKey, color = "#0284c7", height = 220 }: {
  data: Record<string, unknown>[]; dataKey: string; xKey: string; color?: string; height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey={xKey} {...axisProps} />
        <YAxis {...axisProps} width={48} domain={["auto", "auto"]} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: "rgba(255,255,255,0.15)" }} />
        <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={false} connectNulls />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function MiniBars({ data, dataKey, xKey, color = "#059669", height = 180 }: {
  data: Record<string, unknown>[]; dataKey: string; xKey: string; color?: string; height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey={xKey} {...axisProps} />
        <YAxis {...axisProps} width={40} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
        <Bar dataKey={dataKey} fill={color} radius={[4, 4, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function Donut({ data, height = 200 }: { data: { name: string; value: number }[]; height?: number }) {
  const total = data.reduce((a, d) => a + d.value, 0);
  return (
    <div className="flex items-center gap-4">
      <ResponsiveContainer width="50%" height={height}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="90%" paddingAngle={3} stroke="#111113" strokeWidth={2}>
            {data.map((_, i) => <Cell key={i} fill={CAT[i % CAT.length]} />)}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex flex-col gap-2">
        {data.map((d, i) => (
          <div key={d.name} className="flex items-center gap-2 text-[12px]">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: CAT[i % CAT.length] }} />
            <span className="text-zinc-400">{d.name}</span>
            <span className="tabular font-medium text-zinc-200">
              {total > 0 ? `${Math.round((d.value / total) * 100)}%` : "—"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkillRadar({ data, height = 260 }: { data: { skill: string; rating: number }[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RadarChart data={data} outerRadius="75%">
        <PolarGrid stroke={GRID} />
        <PolarAngleAxis dataKey="skill" tick={{ fill: AXIS, fontSize: 11 }} />
        <Radar dataKey="rating" stroke="#f43f5e" strokeWidth={2} fill="#f43f5e" fillOpacity={0.18} />
        <Tooltip contentStyle={tooltipStyle} />
      </RadarChart>
    </ResponsiveContainer>
  );
}
