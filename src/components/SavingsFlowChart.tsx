'use client';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts';
import { useAssetStore } from '@/lib/store';
import { formatKRW } from '@/lib/utils';

const formatMonth = (date: string) => {
  const [y, m] = date.split('-');
  return `${y.slice(2)}.${m}`;
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const v = Number(payload[0]?.value ?? 0);
  return (
    <div className="px-3 py-2 rounded-xl bg-th-muted border border-th-border shadow-xl">
      <p className="text-[11px] text-slate-400 mb-1">{label}</p>
      <p className={`text-sm font-bold tabular-nums ${v >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
        {v >= 0 ? '+' : ''}{formatKRW(v)}
      </p>
    </div>
  );
};

export default function SavingsFlowChart() {
  const { history } = useAssetStore();

  const data = history.slice(1).map((h, i) => {
    const prev = history[i];
    const delta = h.total - prev.total;
    return { date: formatMonth(h.date), delta };
  });

  return (
    <div className="rounded-2xl bg-th-card border border-th-border p-6">
      <div className="flex items-start justify-between mb-1">
        <div>
          <h2 className="text-[13px] font-semibold text-th-text">월 저축·자산 증감</h2>
          <p className="text-[11px] text-slate-600 mt-0.5">전월 대비 순자산 변화</p>
        </div>
      </div>

      <div className="mt-4">
        <ResponsiveContainer width="100%" height={190}>
          <BarChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }} barSize={22} barCategoryGap="35%">
            <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fill: '#475569', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v) => formatKRW(v)}
              tick={{ fill: '#475569', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={48}
            />
            <ReferenceLine y={0} stroke="rgba(255,255,255,0.08)" strokeWidth={1} />
            {/* cursor를 완전 투명으로 — 호버 회색 사각형 제거 */}
            <Tooltip
              content={<CustomTooltip />}
              cursor={false}
            />
            <Bar dataKey="delta" radius={[3, 3, 0, 0]} maxBarSize={28}>
              {data.map((entry, i) => (
                <Cell
                  key={i}
                  fill={entry.delta >= 0 ? '#22c55e' : '#ef4444'}
                  fillOpacity={0.75}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
