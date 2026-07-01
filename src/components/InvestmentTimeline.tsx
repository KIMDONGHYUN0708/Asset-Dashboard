'use client';
import { useAssetStore } from '@/lib/store';
import { calcInvestmentStats, formatKRW, formatPercent } from '@/lib/utils';
import { TrendingUp, TrendingDown, ShoppingCart } from 'lucide-react';

const TYPE_COLOR: Record<string, string> = {
  stock: 'bg-blue-500',
  crypto: 'bg-amber-500',
  gold: 'bg-yellow-400',
};
const TYPE_LABEL: Record<string, string> = { stock: '주식', crypto: '가상자산', gold: '금' };

interface TxRow {
  invId: string;
  invName: string;
  invType: string;
  invTicker?: string;
  invInstitution?: string;
  invCurrentPrice: number;
  txId: string;
  txDate: string;
  txQty: number;
  txPrice: number;
  txNote?: string;
  txIndex: number;
  txTotal: number;
  isSingle: boolean;
  // 전체 종목 수익 (마지막 회차에만 표시)
  totalProfit: number;
  totalROI: number;
  totalQty: number;
  isLast: boolean;
}

export default function InvestmentTimeline() {
  const { investments } = useAssetStore();

  // 각 투자 종목의 개별 트랜잭션을 날짜순 flat 목록으로
  const rows: TxRow[] = [];

  investments.forEach(inv => {
    const { totalQty, totalInvested } = calcInvestmentStats(inv);
    const currentValue = inv.currentPrice * totalQty;
    const totalProfit = currentValue - totalInvested;
    const totalROI = totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0;

    const txs = inv.transactions && inv.transactions.length > 0
      ? [...inv.transactions].sort((a, b) => a.date.localeCompare(b.date))
      : [{ id: 'single', date: inv.purchaseDate, quantity: inv.quantity, price: inv.purchasePrice }];

    txs.forEach((tx, i) => {
      rows.push({
        invId: inv.id,
        invName: inv.name,
        invType: inv.type,
        invTicker: inv.ticker,
        invInstitution: inv.institution,
        invCurrentPrice: inv.currentPrice,
        txId: tx.id,
        txDate: tx.date,
        txQty: tx.quantity,
        txPrice: tx.price,
        txNote: (tx as any).note,
        txIndex: i,
        txTotal: txs.length,
        isSingle: txs.length === 1,
        totalProfit,
        totalROI,
        totalQty,
        isLast: i === txs.length - 1,
      });
    });
  });

  rows.sort((a, b) => a.txDate.localeCompare(b.txDate));

  return (
    <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6">
      <h2 className="text-base font-semibold text-white mb-5">매수 타이밍 타임라인</h2>
      <div className="relative">
        <div className="absolute left-[7px] top-2 bottom-2 w-px bg-slate-800" />
        <div className="space-y-4">
          {rows.map((row) => {
            const txValue = row.invCurrentPrice * row.txQty;
            const txInvested = row.txPrice * row.txQty;
            const txProfit = txValue - txInvested;
            const txROI = txInvested > 0 ? (txProfit / txInvested) * 100 : 0;
            const isBetter = row.txPrice < row.invCurrentPrice;

            return (
              <div key={`${row.invId}-${row.txId}`} className="relative flex gap-4">
                {/* 도트: 단일 매수는 TYPE_COLOR, 적립식은 회차별 파란점 */}
                <div className={`w-3.5 h-3.5 rounded-full flex-shrink-0 mt-1 ring-2 ring-slate-900 ${row.isSingle ? TYPE_COLOR[row.invType] : 'bg-blue-500'}`} />

                <div className="flex-1 pb-1">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-white">{row.invName}</span>
                        {!row.isSingle && (
                          <span className="text-xs text-blue-400 bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 rounded">
                            {row.txIndex + 1}차/{row.txTotal}차
                          </span>
                        )}
                        {row.txNote && (
                          <span className="text-xs text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">{row.txNote}</span>
                        )}
                        {!isBetter && (
                          <span className="text-xs text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">▲ 현재가 대비 고가</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {row.txDate} · {row.invInstitution} ·
                        {row.txQty.toLocaleString()} {row.invTicker ?? '개'} @{formatKRW(row.txPrice)}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-slate-400">{formatKRW(txInvested)} 투자</p>
                      <div className={`flex items-center justify-end gap-1 text-xs font-medium ${txProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {txProfit >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                        {txProfit >= 0 ? '+' : ''}{formatKRW(txProfit)} ({formatPercent(txROI)})
                      </div>
                    </div>
                  </div>

                  {/* 해당 회차 투자금 vs 현재 평가 바 */}
                  <div className="mt-1.5 flex items-center gap-2 text-xs text-slate-600">
                    <span className="w-10 text-right">{formatKRW(txInvested)}</span>
                    <div className="flex-1 h-1 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${txProfit >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`}
                        style={{ width: `${Math.min((txValue / Math.max(txValue, txInvested)) * 100, 100)}%` }}
                      />
                    </div>
                    <span className="w-10">{formatKRW(txValue)}</span>
                  </div>

                  {/* 마지막 회차이고 적립식인 경우 → 전체 합산 표시 */}
                  {!row.isSingle && row.isLast && (
                    <div className={`mt-2 p-2 rounded-lg border text-xs flex items-center justify-between
                      ${row.totalProfit >= 0 ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                      <span className="text-slate-400">전체 {row.txTotal}회 누적</span>
                      <span className={`font-semibold ${row.totalProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {row.totalProfit >= 0 ? '+' : ''}{formatKRW(row.totalProfit)} ({formatPercent(row.totalROI)})
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
