'use client';
import { useAssetStore } from '@/lib/store';
import { calcTotalAssets, buildBreakdown, formatKRW, formatKRWFull, calcInvestmentStats } from '@/lib/utils';
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from 'lucide-react';

export default function NetWorthBanner() {
  const store = useAssetStore();
  const total = calcTotalAssets(store);
  const breakdown = buildBreakdown(store);

  const history = store.history;
  const latest = history[history.length - 1];
  const yearAgo = latest ? (() => {
    const [ly, lm] = latest.date.split('-').map(Number);
    // 정확히 1년 전 같은 달 우선
    const exact = history.find((h) => {
      const [hy, hm] = h.date.split('-').map(Number);
      return hy === ly - 1 && hm === lm;
    });
    if (exact) return exact;
    // ±2개월 이내 (10~14개월 차이)로 가장 가까운 달 허용
    const close = history
      .map((h) => {
        const [hy, hm] = h.date.split('-').map(Number);
        return { h, diff: Math.abs((ly - hy) * 12 + (lm - hm) - 12) };
      })
      .filter(({ diff }) => diff <= 2)
      .sort((a, b) => a.diff - b.diff)[0];
    return close?.h ?? null;
  })() : undefined;

  const yoyChange = yearAgo ? total - yearAgo.total : null;
  const yoyPct = yearAgo && yearAgo.total > 0 ? ((total - yearAgo.total) / yearAgo.total * 100).toFixed(1) : null;
  const isUp = yoyChange !== null ? yoyChange >= 0 : true;

  const prev = history[history.length - 2];
  const momChange = latest ? latest.total - (prev?.total ?? latest.total) : 0;
  const momPct = prev ? ((momChange / prev.total) * 100).toFixed(1) : '0.0';

  const investTotal = store.investments.reduce((s, inv) => {
    const { totalQty } = calcInvestmentStats(inv);
    return s + inv.currentPrice * totalQty;
  }, 0);
  const savingsTotal = store.accounts.filter(a => ['account', 'savings'].includes(a.category)).reduce((s, a) => s + a.amount, 0);
  const loanTotal = store.accounts.filter(a => a.category === 'loan').reduce((s, a) => s + a.amount, 0);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-th-border bg-gradient-to-br from-th-card to-th-card/50 p-6 md:p-7">
      {/* Decorative glows */}
      <div className="pointer-events-none absolute -top-32 -right-32 w-80 h-80 rounded-full bg-blue-600/[0.07] blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-20 w-60 h-60 rounded-full bg-violet-600/[0.07] blur-3xl" />
      {/* Top accent line */}
      <div className="pointer-events-none absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/40 to-transparent" />

      <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-5">
        {/* 총 자산 */}
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-widest mb-2">총 순자산</p>
          <p className="text-4xl md:text-5xl font-bold text-th-text tracking-tight tabular-nums">
            {formatKRWFull(total)}
          </p>
          <div className="flex flex-wrap items-center gap-3 mt-3">
            {yoyChange !== null && yoyPct !== null && (
              <Badge
                icon={isUp ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                label={`전년 대비 ${isUp ? '+' : ''}${formatKRW(yoyChange)}`}
                sub={`${isUp ? '+' : ''}${yoyPct}%`}
                color={isUp ? 'emerald' : 'red'}
              />
            )}
            <Badge
              icon={momChange >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
              label={`전월 대비 ${momChange >= 0 ? '+' : ''}${formatKRW(momChange)}`}
              sub={`${momChange >= 0 ? '+' : ''}${momPct}%`}
              color={momChange >= 0 ? 'blue' : 'red'}
            />
          </div>
        </div>

        {/* 요약 스탯 */}
        <div className="flex items-stretch gap-3">
          <StatCard label="투자 자산" value={formatKRWFull(investTotal)} accent="blue" />
          <div className="w-px bg-th-muted/60" />
          <StatCard label="예·적금" value={formatKRWFull(savingsTotal)} accent="violet" />
          <div className="w-px bg-th-muted/60" />
          <StatCard label="대출" value={`-${formatKRWFull(loanTotal)}`} accent="red" />
        </div>
      </div>
    </div>
  );
}

function Badge({ icon, label, sub, color }: { icon: React.ReactNode; label: string; sub: string; color: 'emerald' | 'blue' | 'red' }) {
  const styles = {
    emerald: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
    blue: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
    red: 'bg-red-500/10 border-red-500/20 text-red-400',
  };
  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium ${styles[color]}`}>
      {icon}{label}
      <span className="opacity-70">{sub}</span>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent: 'blue' | 'violet' | 'red' }) {
  const colors = {
    blue: 'text-blue-400',
    violet: 'text-violet-400',
    red: 'text-red-400',
  };
  return (
    <div className="text-center px-4">
      <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide mb-1.5">{label}</p>
      <p className={`text-[14px] font-bold ${colors[accent]} tabular-nums`}>{value}</p>
    </div>
  );
}
