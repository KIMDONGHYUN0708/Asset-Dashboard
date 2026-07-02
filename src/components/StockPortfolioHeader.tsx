'use client';
import { useAssetStore } from '@/lib/store';
import { calcInvestmentStats, formatKRWFull, formatPercent } from '@/lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface Props { filteredIds?: string[] }

export default function StockPortfolioHeader({ filteredIds }: Props) {
  const { investments } = useAssetStore();
  const items = filteredIds
    ? investments.filter(i => filteredIds.includes(i.id))
    : investments;

  const rows = items.map(inv => {
    const { avgPrice, totalQty, totalInvested } = calcInvestmentStats(inv);
    const currentValue = inv.currentPrice * totalQty;
    const profit = currentValue - totalInvested;
    const roi = totalInvested > 0 ? (profit / totalInvested) * 100 : 0;
    const dailyProfit = inv.currentPrice * totalQty * ((inv.dailyChangeRate ?? 0) / 100);
    return { inv, avgPrice, totalQty, totalInvested, currentValue, profit, roi, dailyProfit };
  });

  const totalInvested = rows.reduce((s, r) => s + r.totalInvested, 0);
  const totalCurrent = rows.reduce((s, r) => s + r.currentValue, 0);
  const totalProfit = totalCurrent - totalInvested;
  const totalROI = totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0;
  const totalDaily = rows.reduce((s, r) => s + r.dailyProfit, 0);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <SummaryCard label="총 평가금액" value={formatKRWFull(totalCurrent)} sub={`투자 ${formatKRWFull(totalInvested)}`} color="text-white" />
      <SummaryCard
        label="총 수익" value={`${totalProfit >= 0 ? '+' : ''}${formatKRWFull(totalProfit)}`}
        sub={formatPercent(totalROI)} color={totalProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}
        up={totalProfit >= 0}
      />
      <SummaryCard
        label="총 수익률" value={formatPercent(totalROI)}
        sub={`${rows.length}종목`} color={totalROI >= 0 ? 'text-emerald-400' : 'text-red-400'}
        up={totalROI >= 0}
      />
      <SummaryCard
        label="일간 수익" value={`${totalDaily >= 0 ? '+' : ''}${formatKRWFull(totalDaily)}`}
        sub="오늘 기준" color={totalDaily >= 0 ? 'text-emerald-400' : 'text-red-400'}
        up={totalDaily >= 0}
      />
    </div>
  );
}

function SummaryCard({ label, value, sub, color, up }: {
  label: string; value: string; sub?: string; color: string; up?: boolean;
}) {
  return (
    <div className="rounded-xl bg-slate-900 border border-white/[0.06] px-4 py-3.5">
      <p className="text-[10px] font-medium text-slate-600 uppercase tracking-widest mb-2">{label}</p>
      <div className="flex items-end gap-1.5">
        {up !== undefined && (
          up ? <TrendingUp size={13} className="text-emerald-400 mb-0.5 flex-shrink-0" />
             : <TrendingDown size={13} className="text-red-400 mb-0.5 flex-shrink-0" />
        )}
        <p className={`text-lg font-bold tabular-nums ${color}`}>{value}</p>
      </div>
      {sub && <p className="text-[10px] text-slate-600 mt-0.5 tabular-nums">{sub}</p>}
    </div>
  );
}

