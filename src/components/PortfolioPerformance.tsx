'use client';
import { useMemo } from 'react';
import { useAssetStore } from '@/lib/store';
import { calcInvestmentStats, formatKRW, formatKRWFull, formatPercent } from '@/lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';
import CountryFlag from './CountryFlag';
import { Investment } from '@/lib/types';

interface PerformerData {
  inv: Investment;
  totalQty: number;
  totalInvested: number;
  currentValue: number;
  profit: number;
  roi: number;
  holdingDays: number;
}

const RANK_STYLE = [
  { badge: '🥇', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', text: 'text-yellow-300' },
  { badge: '🥈', bg: 'bg-slate-400/10',  border: 'border-slate-400/20',  text: 'text-slate-300' },
  { badge: '🥉', bg: 'bg-orange-600/10', border: 'border-orange-500/20', text: 'text-orange-300' },
];

export default function PortfolioPerformance({ filteredIds }: { filteredIds?: string[] }) {
  const investments = useAssetStore((s) => s.investments);

  const rows: PerformerData[] = useMemo(() => {
    const list = filteredIds ? investments.filter(i => filteredIds.includes(i.id)) : investments;
    return list.map(inv => {
      const { totalQty, totalInvested, firstDate } = calcInvestmentStats(inv);
      const currentValue = inv.currentPrice * totalQty;
      const profit = currentValue - totalInvested;
      const roi = totalInvested > 0 ? (profit / totalInvested) * 100 : 0;
      const holdingDays = firstDate
        ? Math.floor((Date.now() - new Date(firstDate).getTime()) / 86_400_000)
        : 0;
      return { inv, totalQty, totalInvested, currentValue, profit, roi, holdingDays };
    }).sort((a, b) => b.roi - a.roi);
  }, [investments, filteredIds]);

  if (rows.length === 0) return null;

  const totalInvested = rows.reduce((s, r) => s + r.totalInvested, 0);
  const totalCurrent  = rows.reduce((s, r) => s + r.currentValue, 0);
  const totalProfit   = totalCurrent - totalInvested;
  const totalROI      = totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0;
  const dailyProfit   = rows.reduce((s, r) =>
    s + r.inv.currentPrice * r.totalQty * ((r.inv.dailyChangeRate ?? 0) / 100), 0);
  const winners = rows.filter(r => r.roi > 0).length;
  const losers  = rows.filter(r => r.roi < 0).length;

  return (
    <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">

      {/* ── 요약 지표 ── */}
      <div className="grid grid-cols-2 md:grid-cols-5 divide-x divide-y md:divide-y-0 divide-slate-800">
        <StatCell label="총 투자금"   value={formatKRW(totalInvested)} sub={`${rows.length}종목`} />
        <StatCell label="총 평가금액" value={formatKRW(totalCurrent)}
          sub={totalROI >= 0 ? `+${totalROI.toFixed(2)}%` : `${totalROI.toFixed(2)}%`}
          subColor={totalROI >= 0 ? 'text-emerald-400' : 'text-red-400'} />
        <StatCell label="총 평가손익"
          value={(totalProfit >= 0 ? '+' : '') + formatKRW(totalProfit)}
          valueColor={totalProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}
          sub={formatPercent(totalROI)}
          subColor={totalProfit >= 0 ? 'text-emerald-400' : 'text-red-400'} />
        <StatCell label="오늘 손익"
          value={(dailyProfit >= 0 ? '+' : '') + formatKRW(Math.round(dailyProfit))}
          valueColor={dailyProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}
          sub="당일 기준" />
        <StatCell label="승/패 종목"
          value={`${winners}승 ${losers}패`}
          sub={`승률 ${rows.length > 0 ? Math.round((winners / rows.length) * 100) : 0}%`}
          valueColor="text-white" />
      </div>

      {/* ── 수익률 랭킹 ── */}
      <div className="p-5">
        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-4">수익률 랭킹</p>

        <div className="space-y-2">
          {rows.map((r, idx) => {
            const isUp  = r.roi >= 0;
            const rank  = idx + 1;
            const style = RANK_STYLE[idx];

            return (
              <div
                key={r.inv.id}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 border transition-colors ${
                  style
                    ? `${style.bg} ${style.border}`
                    : isUp
                      ? 'bg-slate-800/30 border-slate-800/60'
                      : 'bg-red-500/[0.03] border-red-900/30'
                }`}
              >
                {/* 순위 배지 */}
                <div className="w-8 flex-shrink-0 flex items-center justify-center">
                  {style
                    ? <span className="text-[18px] leading-none">{style.badge}</span>
                    : <span className={`text-[12px] font-bold tabular-nums ${isUp ? 'text-slate-500' : 'text-red-700'}`}>
                        {rank}
                      </span>
                  }
                </div>

                {/* 종목 정보 */}
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {r.inv.country && <CountryFlag country={r.inv.country} size={13} />}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className={`text-[13px] font-semibold truncate ${style ? style.text : isUp ? 'text-slate-200' : 'text-slate-400'}`}>
                        {r.inv.name}
                      </p>
                      {r.inv.accountType === 'pension' && (
                        <span className="text-[9px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1 py-0.5 rounded font-medium flex-shrink-0">연금</span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-600 mt-0.5">
                      {r.inv.institution} · {r.holdingDays}일 보유
                    </p>
                  </div>
                </div>

                {/* 수익률 (핵심) */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {isUp
                    ? <TrendingUp  size={12} className="text-emerald-400" />
                    : <TrendingDown size={12} className="text-red-400" />
                  }
                  <span className={`text-[15px] font-bold tabular-nums ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
                    {formatPercent(r.roi)}
                  </span>
                </div>

                {/* 손익 금액 */}
                <div className="text-right flex-shrink-0 min-w-[130px] pl-4">
                  <p className={`text-[12px] font-semibold tabular-nums whitespace-nowrap ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
                    {r.profit >= 0 ? '+' : ''}{formatKRWFull(r.profit)}
                  </p>
                  <p className="text-[10px] text-slate-600 tabular-nums whitespace-nowrap">
                    {formatKRW(r.currentValue)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StatCell({ label, value, sub, valueColor = 'text-white', subColor = 'text-slate-500' }: {
  label: string; value: string; sub?: string; valueColor?: string; subColor?: string;
}) {
  return (
    <div className="px-5 py-4">
      <p className="text-[10px] text-slate-500 mb-1.5 uppercase tracking-wider">{label}</p>
      <p className={`text-[17px] font-bold tabular-nums ${valueColor}`}>{value}</p>
      {sub && <p className={`text-[11px] mt-0.5 ${subColor}`}>{sub}</p>}
    </div>
  );
}
