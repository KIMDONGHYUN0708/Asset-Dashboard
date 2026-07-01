'use client';
import { useLivePrices } from '@/lib/useLivePrices';
import { formatKRW } from '@/lib/utils';

function formatTime(d: Date): string {
  return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export default function LivePriceTicker() {
  const { BTC, ETH, gold, lastUpdated, loading, error } = useLivePrices();

  const tickers = [
    BTC && { key: 'BTC', label: 'BTC', price: BTC.price, rate: BTC.changeRate, dot: '#f59e0b' },
    ETH && { key: 'ETH', label: 'ETH', price: ETH.price, rate: ETH.changeRate, dot: '#6366f1' },
    gold && { key: 'GOLD', label: '금 /g', price: gold.pricePerGram, rate: null, sub: `$1=₩${gold.usdKrw.toLocaleString()}`, dot: '#eab308' },
  ].filter(Boolean) as { key: string; label: string; price: number; rate: number | null; sub?: string; dot: string }[];

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Live indicator */}
      <div className="flex items-center gap-1.5 pr-3 border-r border-white/[0.06]">
        {error ? (
          <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
        ) : loading ? (
          <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-pulse" />
        ) : (
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        )}
        <span className="text-[11px] text-slate-600 tabular-nums">
          {error ? 'offline' : loading ? 'loading…' : lastUpdated ? formatTime(lastUpdated) : 'LIVE'}
        </span>
      </div>

      {/* Tickers */}
      {tickers.map(t => (
        <div key={t.key} className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: t.dot }} />
          <span className="text-[11px] font-medium text-slate-500">{t.label}</span>
          <span className="text-[11px] font-semibold text-slate-200 tabular-nums">{formatKRW(t.price)}</span>
          {t.rate !== null && (
            <span className={`text-[11px] font-medium tabular-nums ${t.rate >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {t.rate >= 0 ? '+' : ''}{t.rate.toFixed(2)}%
            </span>
          )}
          {t.sub && <span className="text-[10px] text-slate-600">{t.sub}</span>}
          <span className="w-px h-3 bg-white/[0.06] last:hidden" />
        </div>
      ))}
    </div>
  );
}
