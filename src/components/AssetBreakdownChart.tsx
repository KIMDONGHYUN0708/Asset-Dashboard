'use client';
import { useRef, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { useAssetStore } from '@/lib/store';
import { buildBreakdown, CATEGORY_COLOR, CATEGORY_LABEL, formatKRW, calcTotalAssets } from '@/lib/utils';

const RADIAN = Math.PI / 180;

function CustomLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) {
  if (percent < 0.06) return null;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={10} fontWeight={700}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

type DataItem = { name: string; value: number; key: string; pct: string };

export default function AssetBreakdownChart() {
  const store = useAssetStore();
  const breakdown = buildBreakdown(store);
  const totalNet = calcTotalAssets(store);

  const data: DataItem[] = Object.entries(breakdown)
    .filter(([k, v]) => k !== 'loan' && v > 0)
    .map(([key, value]) => ({
      name: CATEGORY_LABEL[key as keyof typeof CATEGORY_LABEL],
      value,
      key,
      pct: totalNet > 0 ? ((value / totalNet) * 100).toFixed(1) : '0',
    }))
    .sort((a, b) => b.value - a.value);

  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{ visible: boolean; x: number; y: number; item: DataItem | null }>({
    visible: false, x: 0, y: 0, item: null,
  });

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setTooltip(prev => ({ ...prev, x: e.clientX - rect.left, y: e.clientY - rect.top }));
  };

  return (
    <div className="rounded-2xl bg-slate-900 border border-white/[0.06] p-6">
      <h2 className="text-[13px] font-semibold text-white mb-0">자산 구성</h2>

      <div ref={containerRef} className="relative" onMouseMove={handleMouseMove}>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={58}
              outerRadius={95}
              paddingAngle={2}
              dataKey="value"
              labelLine={false}
              label={CustomLabel}
              strokeWidth={0}
              onMouseEnter={(_, index) => {
                setTooltip(prev => ({ ...prev, visible: true, item: data[index] }));
              }}
              onMouseLeave={() => {
                setTooltip(prev => ({ ...prev, visible: false }));
              }}
            >
              {data.map((entry) => (
                <Cell
                  key={entry.key}
                  fill={CATEGORY_COLOR[entry.key as keyof typeof CATEGORY_COLOR] ?? '#475569'}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        {tooltip.visible && tooltip.item && (
          <div
            className="absolute px-3 py-2.5 rounded-xl bg-slate-800 border border-white/[0.08] shadow-xl pointer-events-none z-10 min-w-[120px]"
            style={{
              left: tooltip.x + 14,
              top: tooltip.y,
              transform: 'translateY(-50%)',
            }}
          >
            <p className="text-[11px] text-slate-400 mb-0.5">{tooltip.item.name}</p>
            <p className="text-sm font-bold text-white tabular-nums">{formatKRW(tooltip.item.value)}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">{tooltip.item.pct}%</p>
          </div>
        )}
      </div>

      {/* 커스텀 범례 — 수치 포함 */}
      <div className="space-y-1.5 mt-1">
        {data.slice(0, 6).map((item) => (
          <div key={item.key} className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-sm flex-shrink-0"
              style={{ backgroundColor: CATEGORY_COLOR[item.key as keyof typeof CATEGORY_COLOR] }}
            />
            <span className="text-[11px] text-slate-500 flex-1 truncate">{item.name}</span>
            <span className="text-[11px] text-slate-400 tabular-nums font-medium">{item.pct}%</span>
            <span className="text-[11px] text-slate-300 tabular-nums font-semibold w-14 text-right">{formatKRW(item.value)}</span>
          </div>
        ))}
        {data.length > 6 && (
          <p className="text-[10px] text-slate-600 pl-4">+{data.length - 6}개 더</p>
        )}
      </div>
    </div>
  );
}
