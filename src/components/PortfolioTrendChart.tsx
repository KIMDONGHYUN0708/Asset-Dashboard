'use client';
import { useMemo, useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { useAssetStore } from '@/lib/store';
import { calcInvestmentStats, formatKRW } from '@/lib/utils';
import { generatePriceHistory } from '@/lib/generatePriceHistory';
import { TrendingUp, TrendingDown } from 'lucide-react';

const PERIODS = [
  { label: '1W', days: 7 },
  { label: '1M', days: 30 },
  { label: '3M', days: 90 },
  { label: '6M', days: 180 },
  { label: '전체', days: 999 },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const total = payload.find((p: any) => p.dataKey === 'total')?.value
    ?? payload.reduce((s: number, p: any) => s + (Number(p.value) || 0), 0);
  return (
    <div className="px-3 py-2.5 rounded-xl bg-th-muted border border-th-border shadow-xl min-w-[160px]">
      <p className="text-[10px] text-slate-500 mb-1.5">{label}</p>
      <p className="text-[13px] font-bold text-th-text tabular-nums">{formatKRW(total)}</p>
      {payload.length > 1 && (
        <div className="mt-1.5 space-y-0.5 border-t border-th-border/50 pt-1.5">
          {payload.map((p: any) => (
            <div key={p.dataKey} className="flex items-center justify-between gap-4 text-[10px]">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: p.color }} />
                <span className="text-slate-400">{p.name}</span>
              </span>
              <span className="tabular-nums text-th-text-sec">{formatKRW(Number(p.value))}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default function PortfolioTrendChart({ filteredIds }: { filteredIds?: string[] }) {
  const { investments } = useAssetStore();
  const [periodIdx, setPeriodIdx] = useState(2);
  const [showBreakdown, setShowBreakdown] = useState(false);

  const list = filteredIds
    ? investments.filter(i => filteredIds.includes(i.id))
    : investments;

  const data = useMemo(() => {
    const days = PERIODS[periodIdx].days;

    const entries = list.map(inv => {
      const { avgPrice, totalQty } = calcInvestmentStats(inv);
      return {
        inv,
        totalQty,
        history: generatePriceHistory(
          inv.ticker ?? inv.id,
          inv.purchaseDate,
          avgPrice || inv.purchasePrice,
          inv.currentPrice,
          days,
        ),
      };
    });

    // 날짜 합집합 (주말 제외됨)
    const dateSet = new Set<string>();
    entries.forEach(e => e.history.forEach(p => dateSet.add(p.date)));
    const dates = Array.from(dateSet).sort();

    const firstYear = dates[0]?.slice(0, 4);
    const lastYear = dates[dates.length - 1]?.slice(0, 4);
    const multiYear = firstYear !== lastYear;

    return dates.map(date => {
      let total = 0, stock = 0, crypto = 0, gold = 0;
      entries.forEach(({ inv, totalQty, history }) => {
        const pt = history.find(p => p.date === date);
        if (!pt) return;
        const val = pt.close * totalQty;
        total += val;
        if (inv.type === 'stock') stock += val;
        else if (inv.type === 'crypto') crypto += val;
        else if (inv.type === 'gold') gold += val;
      });
      const [y, m, d] = date.split('-');
      const dateLabel = multiYear ? `${y.slice(2)}/${m}` : `${m}/${d}`;
      return { date, dateLabel, total, stock, crypto, gold };
    }).filter(d => d.total > 0);
  }, [list, periodIdx]);

  if (!list.length || !data.length) return null;

  const firstTotal = data[0]?.total ?? 0;
  const lastTotal = data[data.length - 1]?.total ?? 0;
  const change = lastTotal - firstTotal;
  const changePct = firstTotal > 0 ? (change / firstTotal) * 100 : 0;
  const isUp = change >= 0;

  const yFmt = (v: number) =>
    v >= 100_000_000 ? `${(v / 100_000_000).toFixed(1)}억` : `${Math.round(v / 10_000)}만`;

  const tickInterval = Math.max(1, Math.floor(data.length / 7));

  const hasStock = list.some(i => i.type === 'stock');
  const hasCrypto = list.some(i => i.type === 'crypto');
  const hasGold = list.some(i => i.type === 'gold');

  return (
    <div className="rounded-2xl bg-th-card border border-th-border p-6">
      {/* 헤더 */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-[13px] font-semibold text-th-text">재테크 자산 추이</h2>
          <div className="flex items-center gap-2 mt-1">
            <span className={`flex items-center gap-1 text-[13px] font-bold tabular-nums ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
              {isUp ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
              {isUp ? '+' : ''}{formatKRW(change)}
            </span>
            <span className={`text-[11px] font-semibold tabular-nums ${isUp ? 'text-emerald-500' : 'text-red-500'}`}>
              ({isUp ? '+' : ''}{changePct.toFixed(1)}%)
            </span>
            <span className="text-[11px] text-slate-600">기간 중</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-th-muted/80 rounded-lg p-0.5 gap-0.5">
            {PERIODS.map((p, i) => (
              <button key={p.label} onClick={() => setPeriodIdx(i)}
                className={`px-2 py-1 text-[11px] rounded-md font-medium transition-all ${
                  periodIdx === i ? 'bg-blue-500 text-th-text shadow-sm' : 'text-slate-500 hover:text-th-text-sec'
                }`}>
                {p.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowBreakdown(v => !v)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all ${
              showBreakdown
                ? 'bg-th-input border-th-border text-th-text'
                : 'bg-th-muted border-th-border text-slate-400 hover:text-th-text hover:border-white/10'
            }`}>
            구분별
          </button>
        </div>
      </div>

      {/* 차트 */}
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
          <defs>
            <linearGradient id="ptGradTotal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={isUp ? '#22c55e' : '#ef4444'} stopOpacity={0.22} />
              <stop offset="100%" stopColor={isUp ? '#22c55e' : '#ef4444'} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="ptGradStock" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id="ptGradCrypto" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id="ptGradGold" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#eab308" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#eab308" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.04)" vertical={false} />
          <XAxis
            dataKey="dateLabel"
            tick={{ fill: '#475569', fontSize: 10 }}
            axisLine={false} tickLine={false}
            interval={tickInterval}
          />
          <YAxis
            tickFormatter={yFmt}
            tick={{ fill: '#475569', fontSize: 10 }}
            axisLine={false} tickLine={false}
            width={52}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.06)', strokeWidth: 1, strokeDasharray: '3 3' }} />

          {showBreakdown ? (
            <>
              {hasGold && (
                <Area type="monotone" dataKey="gold" name="금" stackId="s"
                  stroke="#eab308" strokeWidth={1.5} fill="url(#ptGradGold)" dot={false} />
              )}
              {hasCrypto && (
                <Area type="monotone" dataKey="crypto" name="가상자산" stackId="s"
                  stroke="#f59e0b" strokeWidth={1.5} fill="url(#ptGradCrypto)" dot={false} />
              )}
              {hasStock && (
                <Area type="monotone" dataKey="stock" name="주식" stackId="s"
                  stroke="#3b82f6" strokeWidth={2} fill="url(#ptGradStock)" dot={false} />
              )}
            </>
          ) : (
            <Area type="monotone" dataKey="total" name="전체"
              stroke={isUp ? '#22c55e' : '#ef4444'} strokeWidth={2}
              fill="url(#ptGradTotal)" dot={false}
              activeDot={{ r: 4, fill: isUp ? '#22c55e' : '#ef4444', stroke: '#0f172a', strokeWidth: 2 }}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>

      {/* 범례 */}
      {showBreakdown && (
        <div className="mt-2.5 flex items-center gap-4 text-[10px] text-slate-500">
          {hasStock && <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />주식</span>}
          {hasCrypto && <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />가상자산</span>}
          {hasGold && <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" />금</span>}
          <span className="ml-auto text-slate-700">시뮬레이션 기반 추정치</span>
        </div>
      )}
      {!showBreakdown && (
        <p className="mt-2 text-[10px] text-slate-700 text-right">시뮬레이션 기반 추정치</p>
      )}
    </div>
  );
}
