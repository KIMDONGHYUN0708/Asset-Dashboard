'use client';
import { X, TrendingUp, TrendingDown } from 'lucide-react';
import { MonthlySnapshot } from '@/lib/types';
import { formatKRW, formatPercent } from '@/lib/utils';
import { useAssetStore } from '@/lib/store';

interface Props {
  snapshot: MonthlySnapshot;
  prevSnapshot?: MonthlySnapshot | null;
  onClose: () => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  cash: '현금', stock: '주식', crypto: '가상자산', gold: '금',
  account: '계좌·예금', savings: '적금', loan: '대출', deposit: '보증금',
  car: '자동차', pension: '연금', insurance: '보험',
};

const CATEGORY_KEYS = [
  'deposit', 'account', 'savings', 'stock', 'crypto', 'gold',
  'car', 'pension', 'insurance', 'cash', 'loan',
] as const;

const CATEGORY_ACCENT: Record<string, string> = {
  cash: '#64748b', stock: '#3b82f6', crypto: '#f59e0b', gold: '#eab308',
  account: '#38bdf8', savings: '#0ea5e9', loan: '#ef4444',
  deposit: '#818cf8', car: '#a78bfa', pension: '#34d399', insurance: '#94a3b8',
};

function formatHeroKRW(amount: number): string {
  const uk = Math.floor(Math.abs(amount) / 100_000_000);
  const man = Math.round((Math.abs(amount) % 100_000_000) / 10_000);
  if (uk > 0 && man > 0) return `${uk}억 ${man.toLocaleString()}만`;
  if (uk > 0) return `${uk}억`;
  return `${man.toLocaleString()}만`;
}

function fmtMonthLabel(date: string): string {
  const [y, m] = date.split('-');
  return `${y.slice(2)}.${m}`;
}

export default function SnapshotDetailPanel({ snapshot, prevSnapshot, onClose }: Props) {
  const investments = useAssetStore((s) => s.investments);
  const [y, m] = snapshot.date.split('-');

  const details = snapshot.investmentDetails ?? [];

  const delta = prevSnapshot != null ? snapshot.total - prevSnapshot.total : null;
  const deltaPct = prevSnapshot != null && prevSnapshot.total > 0
    ? ((snapshot.total - prevSnapshot.total) / prevSnapshot.total) * 100
    : null;
  const isUp = delta !== null ? delta >= 0 : true;

  return (
    <div className="bg-th-card border-t border-th-border/80 overflow-hidden">

      {/* ── 히어로: 총 자산 + 전월 대비 ── */}
      <div className="flex items-end justify-between gap-4 px-5 pt-5 pb-4 border-b border-th-border/70">
        <div>
          <p className="text-[10px] font-bold tracking-[.12em] uppercase text-blue-500 mb-2.5">
            {y}년 {Number(m)}월 기준
          </p>
          <p className="text-[30px] font-extrabold text-th-text tracking-tight tabular-nums leading-none">
            {formatHeroKRW(snapshot.total)}
            <span className="text-[14px] font-semibold text-slate-500 ml-1.5">원</span>
          </p>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0 pb-0.5">
          {delta !== null && prevSnapshot && (
            <div className="text-right">
              <p className="text-[9px] font-bold tracking-[.1em] uppercase text-slate-500 mb-1.5">전월 대비</p>
              <p className="text-[10px] text-slate-600 mb-2 tabular-nums">
                {fmtMonthLabel(prevSnapshot.date)} · {formatHeroKRW(prevSnapshot.total)}원
              </p>
              <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold tabular-nums text-[13px] ${
                isUp
                  ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                  : 'bg-red-500/10 border border-red-500/20 text-red-400'
              }`}>
                {isUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {isUp ? '+' : ''}{formatKRW(delta)}
              </div>
              {deltaPct !== null && (
                <p className={`text-[10px] font-semibold mt-1.5 tabular-nums ${isUp ? 'text-emerald-500' : 'text-red-500'}`}>
                  {deltaPct >= 0 ? '+' : ''}{deltaPct.toFixed(2)}% {isUp ? '증가' : '감소'}
                </p>
              )}
            </div>
          )}
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-600 hover:text-th-text hover:bg-th-muted transition-colors self-start mt-0.5"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* ── 자산 구성 카드 그리드 ── */}
      <div className="px-5 py-4 border-b border-th-border/70">
        <p className="text-[9px] font-bold tracking-[.14em] uppercase text-slate-600 mb-3">자산 구성</p>
        <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-11 gap-2">
          {CATEGORY_KEYS.map((key) => {
            const val = (snapshot as any)[key] as number;
            if (!val) return null;
            const isLoan = key === 'loan';
            const pct = snapshot.total > 0 ? (Math.abs(val) / snapshot.total) * 100 : 0;
            const barWidth = Math.min(pct * 2.5, 100);
            const accent = CATEGORY_ACCENT[key];

            return (
              <div
                key={key}
                className={`rounded-xl px-3 py-2.5 border relative overflow-hidden ${
                  isLoan
                    ? 'bg-red-500/5 border-red-900/30'
                    : 'bg-th-muted/50 border-th-border/40'
                }`}
              >
                {/* 상단 컬러 accent 라인 */}
                <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: accent }} />

                <p className="text-[9px] font-medium text-slate-500 mb-1.5">
                  {CATEGORY_LABELS[key]}
                </p>
                <p className={`text-[13px] font-bold tabular-nums leading-tight ${
                  isLoan ? 'text-red-400' : 'text-th-text'
                }`}>
                  {isLoan ? '−' : ''}{formatKRW(Math.abs(val))}
                </p>
                <p className={`text-[9px] mt-1 tabular-nums ${
                  isLoan ? 'text-red-800' : 'text-slate-600'
                }`}>
                  {isLoan ? '부채' : `${pct.toFixed(1)}%`}
                </p>

                {!isLoan && (
                  <div className="mt-2 h-[2px] rounded-full bg-th-input/50 overflow-hidden">
                    <div
                      className="h-full rounded-full opacity-60"
                      style={{ width: `${barWidth}%`, background: accent }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 투자 종목 세부 ── */}
      {details.length > 0 ? (
        <div className="px-5 py-4">
          <p className="text-[9px] font-bold tracking-[.14em] uppercase text-slate-600 mb-3">
            투자 종목 — 스냅샷 당시 상태
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-th-border">
                  {['종목', '구분', '수량', '매입단가', '당시 현재가', '당시 평가금액', '당시 손익', 'ROI', '현재가 대비'].map((h) => (
                    <th key={h} className="text-left text-[10px] text-slate-500 pb-2 pr-3 whitespace-nowrap font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {details.map((d) => {
                  const currentInv = investments.find((i) => i.id === d.id);
                  const currentPrice = currentInv?.currentPrice ?? null;
                  const priceDiff = currentPrice !== null ? currentPrice - d.priceAtSnapshot : null;
                  const priceDiffPct = priceDiff !== null && d.priceAtSnapshot > 0
                    ? (priceDiff / d.priceAtSnapshot) * 100 : null;
                  const unit = d.type === 'gold' ? '돈' : d.type === 'stock' ? '주' : '개';

                  return (
                    <tr key={d.id} className="border-b border-th-border/50 hover:bg-th-muted/30 transition-colors">
                      <td className="py-2.5 pr-3">
                        <p className="font-medium text-th-text">{d.name}</p>
                        {d.ticker && <p className="text-[10px] text-slate-500">{d.ticker}</p>}
                      </td>
                      <td className="py-2.5 pr-3 text-slate-400">
                        {d.type === 'stock' ? '주식' : d.type === 'crypto' ? '코인' : '금'}
                      </td>
                      <td className="py-2.5 pr-3 text-th-text-sec whitespace-nowrap">
                        {d.quantity.toLocaleString()}{unit}
                      </td>
                      <td className="py-2.5 pr-3 text-slate-400 whitespace-nowrap">{formatKRW(d.avgPrice)}</td>
                      <td className="py-2.5 pr-3 text-th-text whitespace-nowrap font-medium">{formatKRW(d.priceAtSnapshot)}</td>
                      <td className="py-2.5 pr-3 text-th-text whitespace-nowrap">{formatKRW(d.valueAtSnapshot)}</td>
                      <td className={`py-2.5 pr-3 whitespace-nowrap font-medium ${d.profitAtSnapshot >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {d.profitAtSnapshot >= 0 ? '+' : ''}{formatKRW(d.profitAtSnapshot)}
                      </td>
                      <td className={`py-2.5 pr-3 whitespace-nowrap font-semibold ${d.roiAtSnapshot >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {d.roiAtSnapshot >= 0 ? '+' : ''}{d.roiAtSnapshot.toFixed(1)}%
                      </td>
                      <td className="py-2.5 whitespace-nowrap">
                        {currentPrice !== null && priceDiff !== null && priceDiffPct !== null ? (
                          <div className={`flex items-center gap-1 text-[11px] font-medium ${priceDiff >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {priceDiff >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                            <span>{priceDiff >= 0 ? '+' : ''}{formatKRW(priceDiff)}</span>
                            <span className="text-slate-600">({priceDiffPct >= 0 ? '+' : ''}{priceDiffPct.toFixed(1)}%)</span>
                          </div>
                        ) : (
                          <span className="text-slate-600 text-[10px]">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-slate-700 mt-3">
            * 현재가 대비: 스냅샷 시점의 주가 → 현재 주가 변화
          </p>
        </div>
      ) : (
        <div className="px-5 py-5 text-center text-[12px] text-slate-600">
          이 스냅샷에는 투자 종목 상세 기록이 없습니다.
          <br />
          <span className="text-[11px]">이후 저장된 스냅샷부터 상세 기록이 포함됩니다.</span>
        </div>
      )}
    </div>
  );
}
