'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AssetStore, MonthlySnapshot, SnapshotInvestment, PhysicalAsset } from './types';
import { buildBreakdown, calcTotalAssets, calcInvestmentStats } from './utils';

/** 신규 사용자 기본 상태 — 더미 데이터 없음 */
const emptyStore: AssetStore = {
  cash: 0,
  accounts: [],
  investments: [],
  physicalAssets: [],
  depositAmount: 0,
  history: [],
  annualSnapshots: [],
  isOnboarded: false,
};

interface AppState extends AssetStore {
  setStore: (store: Partial<AssetStore>) => void;
  setCash: (amount: number) => void;
  setDeposit: (amount: number) => void;
  setOnboarded: (v: boolean) => void;
  saveSnapshot: (yyyyMm?: string) => void;
  setAnnualSnapshot: (snap: import('./types').AnnualSnapshot) => void;
  removeAnnualSnapshot: (date: string) => void;
}

export const useAssetStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...emptyStore,

      setStore: (partial) => set((s) => ({ ...s, ...partial })),
      setCash: (amount) => set({ cash: amount }),
      setDeposit: (amount) => set({ depositAmount: amount }),
      setOnboarded: (v) => set({ isOnboarded: v }),

      saveSnapshot: (yyyyMm?: string) => {
        const state = get();
        const date = yyyyMm ?? new Date().toISOString().slice(0, 7);
        const bd = buildBreakdown(state);

        // 스냅샷 시점 투자 종목 전체 상태 보존
        const investmentDetails: SnapshotInvestment[] = state.investments.map((inv) => {
          const { avgPrice, totalQty, totalInvested } = calcInvestmentStats(inv);
          const currentValue = inv.currentPrice * totalQty;
          const profit = currentValue - totalInvested;
          const roi = totalInvested > 0 ? (profit / totalInvested) * 100 : 0;
          return {
            id: inv.id,
            name: inv.name,
            ticker: inv.ticker,
            type: inv.type,
            quantity: totalQty,
            avgPrice: Math.round(avgPrice),
            priceAtSnapshot: inv.currentPrice,
            valueAtSnapshot: Math.round(currentValue),
            profitAtSnapshot: Math.round(profit),
            roiAtSnapshot: Math.round(roi * 100) / 100,
          };
        });

        const snap: MonthlySnapshot = {
          date,
          total: calcTotalAssets(state),
          ...bd,
          investmentDetails,
        };

        set((s) => ({
          history: [
            ...s.history.filter((h) => h.date !== date),
            snap,
          ].sort((a, b) => a.date.localeCompare(b.date)),
        }));
      },

      setAnnualSnapshot: (snap) =>
        set((s) => ({
          annualSnapshots: [
            ...(s.annualSnapshots ?? []).filter((a) => a.date !== snap.date),
            snap,
          ].sort((a, b) => a.date.localeCompare(b.date)),
        })),

      removeAnnualSnapshot: (date) =>
        set((s) => ({
          annualSnapshots: (s.annualSnapshots ?? []).filter((a) => a.date !== date),
        })),
    }),
    {
      name: 'asset-dashboard-store',
      version: 5,
      migrate: (persisted: any, version: number) => {
        const carsToPhysical = (cars: any[]): PhysicalAsset[] =>
          (cars ?? []).map((c: any) => ({
            id: c.id,
            category: 'car' as const,
            name: c.model ?? '',
            year: c.year,
            purchasePrice: c.purchasePrice,
            currentValue: c.currentValue,
            purchaseDate: c.purchaseDate,
          }));

        if (version <= 3) {
          return {
            ...emptyStore,
            ...persisted,
            isOnboarded: true,
            annualSnapshots: persisted.annualSnapshots ?? [],
            physicalAssets: carsToPhysical(persisted.cars),
          };
        }
        if (version === 4) {
          return {
            ...emptyStore,
            ...persisted,
            physicalAssets: persisted.physicalAssets ?? carsToPhysical(persisted.cars),
          };
        }
        return { ...emptyStore, ...persisted };
      },
    }
  )
);
