'use client';
import { useAssetStore } from '@/lib/store';
import { calcInvestmentStats, formatKRW, formatKRWFull, formatPercent } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import CountryFlag from './CountryFlag';

const TYPE_LABEL: Record<string, string> = { stock: '주식', crypto: '가상자산', gold: '금' };
const TYPE_COLOR: Record<string, string> = {
  stock: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  crypto: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  gold: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
};

export default function InvestmentTable() {
  const { investments } = useAssetStore();

  const rows = investments.map((inv) => {
    const { avgPrice, totalQty, firstDate, totalInvested } = calcInvestmentStats(inv);
    const currentValue = inv.currentPrice * totalQty;
    const profit = currentValue - totalInvested;
    const roi = totalInvested > 0 ? (profit / totalInvested) * 100 : 0;
    const txCount = inv.transactions?.length ?? 0;
    return { ...inv, avgPrice, totalQty, firstDate, totalInvested, currentValue, profit, roi, txCount };
  });

  const totalInvested = rows.reduce((s, r) => s + r.totalInvested, 0);
  const totalCurrent = rows.reduce((s, r) => s + r.currentValue, 0);
  const totalProfit = totalCurrent - totalInvested;
  const totalROI = totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0;

  return (
    <div className="rounded-2xl bg-th-card border border-th-border p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-th-text">재테크 수익률</h2>
        <div className={`flex items-center gap-1.5 text-sm font-semibold ${totalProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          {totalProfit >= 0 ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
          <span>{formatPercent(totalROI)}</span>
          <span className="text-slate-500 font-normal">({formatKRW(totalProfit)})</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-th-border">
              {['종목', '구분', '최초매수일', '수량', '현재가', '평가금액', '손익', 'ROI'].map((h) => (
                <th key={h} className="text-left text-xs text-slate-500 pb-2 pr-4 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-th-border/50 hover:bg-th-muted/30 transition-colors">
                <td className="py-3 pr-4">
                  <div className="font-medium text-th-text flex items-center gap-1.5">
                    {r.country && <CountryFlag country={r.country} size={14} />}
                    {r.name}
                  </div>
                  {r.ticker && <div className="text-xs text-slate-500">{r.ticker}</div>}
                </td>
                <td className="py-3 pr-4">
                  <span className={`text-xs px-1.5 py-0.5 rounded-md border ${TYPE_COLOR[r.type]}`}>
                    {TYPE_LABEL[r.type]}
                  </span>
                </td>
                <td className="py-3 pr-4 text-slate-400 whitespace-nowrap text-xs">{r.firstDate}</td>
                <td className="py-3 pr-4 text-th-text-sec text-xs whitespace-nowrap">
                  {r.totalQty.toLocaleString()}
                  <span className="text-slate-600 ml-0.5">{r.type === 'gold' ? '돈' : r.type === 'stock' ? '주' : '개'}</span>
                </td>
                <td className="py-3 pr-4 text-th-text-sec whitespace-nowrap text-xs">
                  {formatKRWFull(r.currentPrice)}
                  {r.type === 'gold' && <span className="text-slate-600">/돈</span>}
                </td>
                <td className="py-3 pr-4 text-th-text font-medium whitespace-nowrap text-xs">{formatKRWFull(r.currentValue)}</td>
                <td className={`py-3 pr-4 font-medium whitespace-nowrap text-xs ${r.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {r.profit >= 0 ? '+' : ''}{formatKRWFull(r.profit)}
                </td>
                <td className="py-3">
                  <div className={`flex items-center gap-1 font-semibold text-xs ${r.roi >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {r.roi > 0.5 ? <TrendingUp size={12} /> : r.roi < -0.5 ? <TrendingDown size={12} /> : <Minus size={12} />}
                    {formatPercent(r.roi)}
                  </div>
                  <div className="mt-1 h-1 w-16 rounded-full bg-th-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full ${r.roi >= 0 ? 'bg-emerald-400' : 'bg-red-400'}`}
                      style={{ width: `${Math.min(Math.abs(r.roi) * 2, 100)}%` }}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-th-border">
              <td colSpan={5} className="pt-3 text-xs text-slate-500">합계</td>
              <td className="pt-3 text-th-text font-semibold text-xs">{formatKRWFull(totalCurrent)}</td>
              <td className={`pt-3 font-semibold text-xs ${totalProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {totalProfit >= 0 ? '+' : ''}{formatKRWFull(totalProfit)}
              </td>
              <td className={`pt-3 font-bold text-xs ${totalROI >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {formatPercent(totalROI)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
