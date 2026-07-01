'use client';
import { useMemo } from 'react';
import {
  ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Scatter, ScatterChart,
  Area, AreaChart,
} from 'recharts';
import { useAssetStore } from '@/lib/store';
import { calcInvestmentStats, formatKRW, formatPercent } from '@/lib/utils';
import { generatePriceHistory } from '@/lib/generatePriceHistory';
import { TrendingUp, TrendingDown, ShoppingCart } from 'lucide-react';

interface Props { investmentId: string }

const formatDate = (d: string) => {
  const [, m, day] = d.split('-');
  return `${m}/${day}`;
};

export default function DCAChart({ investmentId }: Props) {
  const { investments } = useAssetStore();
  const inv = investments.find(i => i.id === investmentId);
  if (!inv || !inv.transactions || inv.transactions.length === 0) return null;

  const { avgPrice, totalQty, totalInvested } = calcInvestmentStats(inv);
  const txs = [...inv.transactions].sort((a, b) => a.date.localeCompare(b.date));
  const currentValue = inv.currentPrice * totalQty;
  const totalProfit = currentValue - totalInvested;
  const roi = (totalProfit / totalInvested) * 100;

  // 가격 히스토리 생성
  const history = useMemo(() =>
    generatePriceHistory(inv.ticker ?? inv.id, txs[0].date, txs[0].price, inv.currentPrice, 999),
    [inv.id, inv.currentPrice]
  );

  // 매수 시점을 히스토리에 마킹
  const chartData = history.map(h => {
    const tx = txs.find(t => t.date === h.date);
    return {
      date: formatDate(h.date),
      rawDate: h.date,
      price: h.close,
      buyPrice: tx ? h.close : null,
      buyQty: tx ? tx.quantity : null,
      avgLine: Math.round(avgPrice),
    };
  });

  // 누적 매수 현황 (매수 시점별)
  const accumData = txs.map((tx, i) => {
    const cumQty = txs.slice(0, i + 1).reduce((s, t) => s + t.quantity, 0);
    const cumInvested = txs.slice(0, i + 1).reduce((s, t) => s + t.price * t.quantity, 0);
    const cumAvg = cumInvested / cumQty;
    const currentVal = inv.currentPrice * cumQty;
    const profit = currentVal - cumInvested;
    return {
      label: `${i + 1}차`,
      date: tx.date,
      price: tx.price,
      qty: tx.quantity,
      cumQty,
      cumInvested,
      cumAvg: Math.round(cumAvg),
      currentVal,
      profit,
      roi: (profit / cumInvested) * 100,
      note: tx.note,
    };
  });

  const isUp = roi >= 0;

  return (
    <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-base font-semibold text-white">
            {inv.name} 적립식 매수 분석
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            총 {txs.length}회 매수 · 가중평균 {formatKRW(Math.round(avgPrice))} · 총 {totalQty.toLocaleString()}개
          </p>
        </div>
        <div className="text-right">
          <p className={`text-lg font-bold ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
            {isUp ? '+' : ''}{formatKRW(totalProfit)}
          </p>
          <p className={`text-sm ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
            {formatPercent(roi)}
          </p>
        </div>
      </div>

      {/* 가격 차트 + 매수 마커 */}
      <div>
        <p className="text-xs text-slate-500 mb-2">가격 추이 & 매수 시점</p>
        <ResponsiveContainer width="100%" height={220}>
          <ComposedChart data={chartData} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
            <defs>
              <linearGradient id="dcaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={isUp ? '#22c55e' : '#ef4444'} stopOpacity={0.15} />
                <stop offset="95%" stopColor={isUp ? '#22c55e' : '#ef4444'} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false}
              interval={Math.floor(chartData.length / 6)} />
            <YAxis domain={['auto', 'auto']} tickFormatter={v => formatKRW(v)}
              tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} width={54} />
            {/* 평균단가 기준선 */}
            <ReferenceLine y={avgPrice} stroke="#f59e0b" strokeDasharray="4 3" strokeWidth={1.5}
              label={{ value: `평균 ${formatKRW(Math.round(avgPrice))}`, position: 'insideTopRight', fill: '#f59e0b', fontSize: 10 }} />
            <Tooltip
              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 11 }}
              formatter={(v: unknown) => [formatKRW(Number(v)), '']}
            />
            <Area type="monotone" dataKey="price" stroke={isUp ? '#22c55e' : '#ef4444'}
              strokeWidth={2} fill="url(#dcaGrad)" dot={false} />
            {/* 매수 시점 마커 */}
            <Line type="monotone" dataKey="buyPrice" stroke="transparent" dot={(props: any) => {
              if (!props.payload.buyPrice) return <g key={props.key} />;
              return (
                <g key={props.key}>
                  <circle cx={props.cx} cy={props.cy} r={7} fill="#3b82f6" opacity={0.9} />
                  <text x={props.cx} y={props.cy + 1} textAnchor="middle" fill="white" fontSize={9} fontWeight="bold">
                    B
                  </text>
                </g>
              );
            }} />
          </ComposedChart>
        </ResponsiveContainer>
        <p className="text-xs text-slate-600 mt-1 flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-blue-500 inline-block" /> B = 매수 시점
          <span className="ml-3 w-4 border-t border-dashed border-amber-400 inline-block" /> 가중평균 단가
        </p>
      </div>

      {/* 누적 매수 현황 테이블 */}
      <div>
        <p className="text-xs text-slate-500 mb-3">회차별 매수 현황</p>
        <div className="space-y-2">
          {accumData.map((row, i) => {
            const isFirst = i === 0;
            const priceDiff = row.price - (i > 0 ? accumData[i - 1].price : row.price);
            const isBetter = row.price < inv.currentPrice;
            return (
              <div key={row.label}
                className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/50 hover:bg-slate-800 transition-colors">
                {/* 회차 뱃지 */}
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-blue-400">{i + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-white">{row.date}</span>
                    {row.note && <span className="text-xs text-slate-500 bg-slate-700 px-1.5 py-0.5 rounded">{row.note}</span>}
                    {isBetter
                      ? <span className="text-xs text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">✓ 현재가 대비 저가매수</span>
                      : <span className="text-xs text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">현재가 대비 고가매수</span>
                    }
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {row.qty.toLocaleString()}개 @ {formatKRW(row.price)} · 누적 {row.cumQty.toLocaleString()}개 / 평균 {formatKRW(row.cumAvg)}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={`text-sm font-semibold ${row.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {row.profit >= 0 ? '+' : ''}{formatKRW(row.profit)}
                  </p>
                  <p className={`text-xs ${row.roi >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {formatPercent(row.roi)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* 최종 요약 */}
        <div className="mt-3 p-3 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-between">
          <div className="text-xs text-slate-400 space-y-0.5">
            <p>총 투자금 <span className="text-white font-medium">{formatKRW(totalInvested)}</span></p>
            <p>현재 평가 <span className="text-white font-medium">{formatKRW(currentValue)}</span></p>
          </div>
          <div className="text-right">
            <p className={`text-xl font-bold ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
              {isUp ? '+' : ''}{formatPercent(roi)}
            </p>
            <p className={`text-sm ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
              {isUp ? '+' : ''}{formatKRW(totalProfit)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
