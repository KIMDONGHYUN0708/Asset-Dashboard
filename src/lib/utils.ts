import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { AssetCategory, AssetStore, Investment, Transaction } from './types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatKRW(amount: number): string {
  if (Math.abs(amount) >= 100_000_000) {
    const eok = amount / 100_000_000;
    return `${eok % 1 === 0 ? eok.toFixed(0) : eok.toFixed(1)}억`;
  }
  if (Math.abs(amount) >= 10_000) {
    const man = Math.round(amount / 10_000);
    return `${man.toLocaleString()}만`;
  }
  return `${Math.round(amount).toLocaleString()}원`;
}

export function formatKRWFull(amount: number): string {
  return `${amount.toLocaleString('ko-KR')}원`;
}

export function formatPercent(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

export function calcROI(currentPrice: number, purchasePrice: number, quantity: number) {
  const invested = purchasePrice * quantity;
  const current = currentPrice * quantity;
  const profit = current - invested;
  const roi = invested > 0 ? ((current - invested) / invested) * 100 : 0;
  return { invested, current, profit, roi };
}

/** transactions 배열에서 가중평균 단가·총수량·최초매수일 계산 */
export function calcInvestmentStats(inv: Investment): {
  avgPrice: number;
  totalQty: number;
  firstDate: string;
  totalInvested: number;
} {
  const txs = inv.transactions;
  if (!txs || txs.length === 0) {
    return {
      avgPrice: inv.purchasePrice,
      totalQty: inv.quantity,
      firstDate: inv.purchaseDate,
      totalInvested: inv.purchasePrice * inv.quantity,
    };
  }
  const sorted = [...txs].sort((a, b) => a.date.localeCompare(b.date));
  const totalQty = sorted.reduce((s, t) => s + t.quantity, 0);
  const totalInvested = sorted.reduce((s, t) => s + t.price * t.quantity, 0);
  const avgPrice = totalQty > 0 ? totalInvested / totalQty : 0;
  return { avgPrice, totalQty, firstDate: sorted[0]?.date ?? inv.purchaseDate, totalInvested };
}

/** Investment를 stats 기준으로 정규화 (렌더 전처리용) */
export function normalizeInvestment(inv: Investment): Investment {
  if (!inv.transactions || inv.transactions.length === 0) return inv;
  const { avgPrice, totalQty, firstDate } = calcInvestmentStats(inv);
  return { ...inv, purchasePrice: Math.round(avgPrice), quantity: totalQty, purchaseDate: firstDate };
}

export const CATEGORY_LABEL: Record<AssetCategory, string> = {
  cash: '현금', stock: '주식', crypto: '가상자산', gold: '금',
  account: '계좌', savings: '적금', loan: '대출', deposit: '보증금',
  car: '실물 자산', pension: '연금저축', insurance: '보험',
};

export const CATEGORY_COLOR: Record<AssetCategory, string> = {
  cash: '#22c55e', stock: '#3b82f6', crypto: '#f59e0b', gold: '#eab308',
  account: '#6366f1', savings: '#8b5cf6', loan: '#ef4444', deposit: '#14b8a6',
  car: '#64748b', pension: '#ec4899', insurance: '#06b6d4',
};

export function calcTotalAssets(store: AssetStore): number {
  const accountSum = store.accounts.filter(a => a.category !== 'loan').reduce((s, a) => s + a.amount, 0);
  const loanSum = store.accounts.filter(a => a.category === 'loan').reduce((s, a) => s + a.amount, 0);
  const investSum = store.investments.reduce((s, inv) => {
    const { totalQty } = calcInvestmentStats(inv);
    return s + inv.currentPrice * totalQty;
  }, 0);
  const physicalSum = (store.physicalAssets ?? []).reduce((s, a) => s + a.currentValue, 0);
  return store.cash + accountSum - loanSum + investSum + store.depositAmount + physicalSum;
}

export function buildBreakdown(store: AssetStore) {
  const sum = (type: string) => store.investments
    .filter(i => i.type === type)
    .reduce((s, i) => s + i.currentPrice * calcInvestmentStats(i).totalQty, 0);

  return {
    cash: store.cash,
    stock: sum('stock'),
    crypto: sum('crypto'),
    gold: sum('gold'),
    account: store.accounts.filter(a => a.category === 'account').reduce((s, a) => s + a.amount, 0),
    savings: store.accounts.filter(a => a.category === 'savings').reduce((s, a) => s + a.amount, 0),
    pension: store.accounts.filter(a => a.category === 'pension').reduce((s, a) => s + a.amount, 0),
    insurance: store.accounts.filter(a => a.category === 'insurance').reduce((s, a) => s + a.amount, 0),
    loan: store.accounts.filter(a => a.category === 'loan').reduce((s, a) => s + a.amount, 0),
    deposit: store.depositAmount,
    car: (store.physicalAssets ?? []).reduce((s, a) => s + a.currentValue, 0),
  };
}
