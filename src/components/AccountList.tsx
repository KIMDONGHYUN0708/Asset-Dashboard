'use client';
import Image from 'next/image';
import { useAssetStore } from '@/lib/store';
import { formatKRWFull, CATEGORY_COLOR } from '@/lib/utils';
import { Account } from '@/lib/types';

const CATEGORY_GROUPS = [
  { label: '계좌', key: 'account' },
  { label: '적금', key: 'savings' },
  { label: '대출', key: 'loan' },
  { label: '연금저축', key: 'pension' },
  { label: '보험', key: 'insurance' },
] as const;

export default function AccountList() {
  const { accounts } = useAssetStore();

  return (
    <div className="rounded-2xl bg-th-card border border-th-border p-6">
      <h2 className="text-[13px] font-semibold text-th-text mb-5">계좌 · 금융 상품</h2>
      <div className="space-y-6">
        {CATEGORY_GROUPS.map(({ label, key }) => {
          const items = accounts.filter((a) => a.category === key);
          if (items.length === 0) return null;
          const total = items.reduce((s, a) => s + a.amount, 0);
          return (
            <div key={key}>
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest">{label}</span>
                <span className={`text-[11px] font-semibold tabular-nums ${key === 'loan' ? 'text-red-400' : 'text-slate-400'}`}>
                  {key === 'loan' ? '-' : ''}{formatKRWFull(total)}
                </span>
              </div>
              <div className="space-y-1.5">
                {items.map((acc) => (
                  <AccountCard key={acc.id} acc={acc} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AccountCard({ acc }: { acc: Account }) {
  const isLoan = acc.category === 'loan';
  const isInsurance = acc.category === 'insurance';

  return (
    <div className="group flex items-center justify-between px-3 py-2.5 rounded-xl bg-th-muted/40 border border-white/[0.04] hover:bg-th-muted/70 hover:border-th-border transition-all duration-150">
      <div className="flex items-center gap-3">
        {acc.logo ? (
          <Image src={acc.logo} alt={acc.institution} width={28} height={28} className="flex-shrink-0 rounded-full" />
        ) : (
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold text-th-text flex-shrink-0"
            style={{ backgroundColor: (CATEGORY_COLOR[acc.category] ?? '#475569') + '22' }}
          >
            {acc.institution.slice(0, 2)}
          </div>
        )}
        <div>
          <p className="text-[12px] font-medium text-th-text-sec leading-tight">{acc.name}</p>
          <p className="text-[10px] text-slate-600 mt-0.5">
            {acc.institution}
            {acc.interestRate && ` · ${acc.interestRate}%`}
            {acc.loanRate && ` · ${acc.loanRate}%`}
            {acc.maturityDate && ` · ${acc.maturityDate}`}
            {acc.monthlyPremium && ` · 월 ${(acc.monthlyPremium / 10000).toFixed(1)}만`}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className={`text-[12px] font-semibold tabular-nums ${isLoan ? 'text-red-400' : 'text-th-text-sec'}`}>
          {isLoan ? '-' : ''}{formatKRWFull(acc.amount)}
        </p>
        {isInsurance && acc.coverageAmount && (
          <p className="text-[10px] text-slate-600">보장 {(acc.coverageAmount / 100_000_000).toFixed(0)}억</p>
        )}
      </div>
    </div>
  );
}
