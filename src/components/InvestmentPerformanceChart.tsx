'use client';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts';
import { useAssetStore } from '@/lib/store';
import { calcROI, formatKRW, formatPercent } from '@/lib/utils';

export default function InvestmentPerformanceChart() {
  const { investments } = useAssetStore();

  const data = investments.map((inv) => {
    const { profit, roi } = calcROI(inv.currentPrice, inv.purchasePrice, inv.quantity);
    return { name: inv.name, profit, roi, type: inv.type };
  }).sort((a, b) => b.roi - a.roi);

  return (
    <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6">
      <h2 className="text-base font-semibold text-white mb-4">종목별 수익률 비교</h2>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }} barSize={36}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis
            tickFormatter={(v) => `${v.toFixed(0)}%`}
            tick={{ fill: '#64748b', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={40}
          />
          <ReferenceLine y={0} stroke="#334155" />
          <Tooltip
            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
            formatter={(value: unknown, name: unknown) => {
              const v = Number(value ?? 0);
              return name === 'roi'
                ? [formatPercent(v), '수익률']
                : [formatKRW(v), '손익'];
            }}
          />
          <Bar dataKey="roi" radius={[4, 4, 0, 0]}>
            {data.map((entry, i) => (
              <Cell
                key={i}
                fill={
                  entry.type === 'stock' ? '#3b82f6' :
                  entry.type === 'crypto' ? '#f59e0b' : '#eab308'
                }
                fillOpacity={entry.roi >= 0 ? 0.9 : 0.6}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
