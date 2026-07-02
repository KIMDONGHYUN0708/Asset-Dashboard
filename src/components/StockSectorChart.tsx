'use client';
import { useAssetStore } from '@/lib/store';
import { calcInvestmentStats, formatKRW } from '@/lib/utils';

const SECTOR_COLORS: Record<string, { bg: string; border: string; text: string; bar: string }> = {
  'IT/반도체':  { bg: 'bg-blue-500/5',   border: 'border-blue-500/20',   text: 'text-blue-400',   bar: 'bg-blue-500' },
  'IT/플랫폼':  { bg: 'bg-violet-500/5', border: 'border-violet-500/20', text: 'text-violet-400', bar: 'bg-violet-500' },
  '가상자산':   { bg: 'bg-amber-500/5',  border: 'border-amber-500/20',  text: 'text-amber-400',  bar: 'bg-amber-500' },
  '금':        { bg: 'bg-yellow-500/5', border: 'border-yellow-500/20', text: 'text-yellow-400', bar: 'bg-yellow-500' },
  '기타':      { bg: 'bg-th-input/20', border: 'border-th-border/40',  text: 'text-slate-400',  bar: 'bg-slate-500' },
};

const fallbackColor = { bg: 'bg-teal-500/5', border: 'border-teal-500/20', text: 'text-teal-400', bar: 'bg-teal-500' };

export default function StockSectorChart({ filteredIds }: { filteredIds: string[] }) {
  const { investments } = useAssetStore();
  const items = investments.filter(i => filteredIds.includes(i.id));

  type SectorEntry = { value: number; count: number };
  const sectorMap: Record<string, SectorEntry> = {};
  items.forEach(inv => {
    const { totalQty } = calcInvestmentStats(inv);
    const sector = inv.sector ?? '기타';
    if (!sectorMap[sector]) sectorMap[sector] = { value: 0, count: 0 };
    sectorMap[sector].value += inv.currentPrice * totalQty;
    sectorMap[sector].count += 1;
  });

  const data = Object.entries(sectorMap)
    .map(([name, { value, count }]) => ({ name, value, count }))
    .sort((a, b) => b.value - a.value);

  const total = data.reduce((s, d) => s + d.value, 0);

  if (data.length === 0) return null;

  return (
    <div className="rounded-2xl bg-th-card border border-th-border p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-[13px] font-semibold text-th-text">섹터 포트폴리오</h2>
          <p className="text-[11px] text-slate-500 mt-0.5">현재 스냅샷 · {items.length}종목</p>
        </div>
        <span className="text-[12px] font-semibold text-th-text-sec tabular-nums">{formatKRW(total)}</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        {data.map((d) => {
          const pct = total > 0 ? (d.value / total) * 100 : 0;
          const colors = SECTOR_COLORS[d.name] ?? fallbackColor;
          return (
            <div
              key={d.name}
              className={`rounded-xl border p-3.5 flex flex-col gap-2 ${colors.bg} ${colors.border}`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-semibold uppercase tracking-wide ${colors.text}`}>
                  {d.name}
                </span>
                <span className="text-[10px] text-slate-600">{d.count}종목</span>
              </div>
              <div>
                <p className="text-[15px] font-bold text-th-text tabular-nums leading-tight">
                  {formatKRW(d.value)}
                </p>
                <p className={`text-[12px] font-semibold mt-0.5 tabular-nums ${colors.text}`}>
                  {pct.toFixed(1)}%
                </p>
              </div>
              {/* 비중 바 (accent) */}
              <div className="h-1 rounded-full bg-th-muted overflow-hidden mt-auto">
                <div
                  className={`h-full rounded-full transition-all ${colors.bar}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
