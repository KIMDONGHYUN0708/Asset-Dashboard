'use client';
import { useState, useMemo } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import { useAssetStore } from '@/lib/store';
import { generatePriceHistory } from '@/lib/generatePriceHistory';
import { formatKRW, formatKRWFull, formatPercent, calcInvestmentStats } from '@/lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';
import CountryFlag from './CountryFlag';

const PERIODS = [
  { label: '1W', days: 7 },
  { label: '1M', days: 30 },
  { label: '3M', days: 90 },
  { label: '6M', days: 180 },
  { label: '전체', days: 999 },
];

export default function StockPriceChart({ selectedId }: { selectedId: string }) {
  const { investments } = useAssetStore();
  const [period, setPeriod] = useState(2);
  const inv = investments.find(i => i.id === selectedId);

  const { avgPrice, totalQty, firstDate, totalInvested } = inv ? calcInvestmentStats(inv) : { avgPrice: 0, totalQty: 0, firstDate: '', totalInvested: 0 };

  const history = useMemo(() => {
    if (!inv) return [];
    return generatePriceHistory(
      inv.ticker ?? inv.id,
      firstDate || inv.purchaseDate,
      avgPrice || inv.purchasePrice,
      inv.currentPrice,
      PERIODS[period].days
    );
  }, [inv?.id, inv?.currentPrice, period, firstDate, avgPrice]);

  if (!inv) return null;

  const currentValue = inv.currentPrice * totalQty;
  const totalProfit = currentValue - totalInvested;
  const roi = totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0;

  const firstClose = history[0]?.close ?? avgPrice;
  const lastClose = history[history.length - 1]?.close ?? inv.currentPrice;
  const periodROI = firstClose > 0 ? ((lastClose - firstClose) / firstClose) * 100 : 0;
  const isUp = periodROI >= 0;

  const formatDate = (d: string) => {
    const [, m, day] = d.split('-');
    return `${m}/${day}`;
  };

  const chartData = history.map(h => ({ ...h }));

  const dailyProfit = inv.currentPrice * totalQty * ((inv.dailyChangeRate ?? 0) / 100);
  const priceDiff = inv.currentPrice - avgPrice;
  const priceDiffPct = avgPrice > 0 ? (priceDiff / avgPrice) * 100 : 0;

  return (
    <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6">
      {/* 종목명 + 현재가 행 */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {inv.country && <CountryFlag country={inv.country} size={16} />}
            <h3 className="text-[15px] font-semibold text-white">{inv.name}</h3>
            {inv.ticker && <span className="text-[10px] text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">{inv.ticker}</span>}
            {inv.sector && <span className="text-[10px] text-blue-400 bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 rounded">{inv.sector}</span>}
          </div>
          <div className="flex items-baseline gap-2.5">
            <span className="text-[26px] font-bold text-white tabular-nums">{formatKRWFull(inv.currentPrice)}</span>
            <span className={`flex items-center gap-0.5 text-[13px] font-semibold ${(inv.dailyChangeRate ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {(inv.dailyChangeRate ?? 0) >= 0 ? <TrendingUp size={13}/> : <TrendingDown size={13}/>}
              {formatPercent(inv.dailyChangeRate ?? 0)} 오늘
            </span>
          </div>
          <p className="text-[11px] text-slate-600 mt-0.5">
            {totalQty.toLocaleString()}{inv.type === 'gold' ? '돈' : inv.type === 'stock' ? '주' : '개'} 보유 · {inv.institution}
          </p>
        </div>
        {/* 총 수익 */}
        <div className={`text-right px-3 py-2 rounded-xl ${totalProfit >= 0 ? 'bg-emerald-500/5 border border-emerald-500/10' : 'bg-red-500/5 border border-red-500/10'}`}>
          <p className="text-[10px] text-slate-600 mb-1">총 수익</p>
          <p className={`text-[18px] font-bold tabular-nums ${totalProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {totalProfit >= 0 ? '+' : ''}{formatKRWFull(totalProfit)}
          </p>
          <p className={`text-[11px] font-semibold tabular-nums ${roi >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{formatPercent(roi)}</p>
        </div>
      </div>

      {/* Period Selector */}
      <div className="flex gap-1 mb-4">
        {PERIODS.map((p, i) => (
          <button
            key={p.label}
            onClick={() => setPeriod(i)}
            className={`px-3 py-1 text-xs rounded-lg font-medium transition-colors ${
              period === i ? 'bg-blue-500 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            {p.label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-1">
          <span className={`text-xs font-medium ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
            기간 수익률 {formatPercent(periodROI)}
          </span>
        </div>
      </div>

      {/* Price Chart */}
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
          <defs>
            <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={isUp ? '#22c55e' : '#ef4444'} stopOpacity={0.2} />
              <stop offset="95%" stopColor={isUp ? '#22c55e' : '#ef4444'} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            tick={{ fill: '#64748b', fontSize: 10 }}
            axisLine={false} tickLine={false}
            interval={Math.floor(chartData.length / 6)}
          />
          <YAxis
            domain={['auto', 'auto']}
            tickFormatter={v => formatKRW(v)}
            tick={{ fill: '#64748b', fontSize: 10 }}
            axisLine={false} tickLine={false}
            width={54}
          />
          <Tooltip
            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 11 }}
            formatter={(v: unknown) => [formatKRW(Number(v)), '']}
          />
          <Area type="monotone" dataKey="close" stroke={isUp ? '#22c55e' : '#ef4444'}
            strokeWidth={2} fill="url(#priceGrad)" dot={false}
            activeDot={{ r: 4, fill: isUp ? '#22c55e' : '#ef4444', stroke: '#0f172a', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>

      {/* Volume Chart */}
      <div className="mt-1">
        <ResponsiveContainer width="100%" height={50}>
          <BarChart data={chartData} margin={{ top: 0, right: 4, left: 4, bottom: 0 }}>
            <YAxis hide domain={['auto', 'auto']} />
            <Bar dataKey="volume" fill="#334155" opacity={0.7} radius={[1, 1, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <p className="text-xs text-slate-600 text-center -mt-1">거래량</p>
      </div>

    </div>
  );
}
