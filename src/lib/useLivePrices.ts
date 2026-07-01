'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useAssetStore } from './store';

export interface LivePriceResult {
  BTC?: { price: number; changeRate: number };
  ETH?: { price: number; changeRate: number };
  gold?: { pricePerDon: number; pricePerGram: number; goldUsdPerOz: number; usdKrw: number };
  lastUpdated?: Date;
  loading: boolean;
  error: string | null;
}

const REFRESH_MS = 30_000;

export function useLivePrices(): LivePriceResult {
  const setStore = useAssetStore(s => s.setStore);
  const getInvestments = () => useAssetStore.getState().investments;

  const [state, setState] = useState<LivePriceResult>({ loading: true, error: null });
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchPrices = useCallback(async () => {
    try {
      // 주식 종목 티커 수집 (type=stock인 것만)
      const investments = getInvestments();
      const stockTickers = investments
        .filter(i => i.type === 'stock' && i.ticker)
        .map(i => i.ticker!);

      // crypto + gold는 필수, 주식은 실패해도 무시 (KIS 토큰 만료 등)
      const [cryptoRes, goldRes] = await Promise.all([
        fetch('/api/prices/crypto'),
        fetch('/api/prices/gold'),
      ]);
      if (!cryptoRes.ok || !goldRes.ok) throw new Error('API error');

      const [cryptoData, goldData] = await Promise.all([cryptoRes.json(), goldRes.json()]);

      // 주식은 별도 처리 — 실패해도 전체 에러 아님
      let stockData: { prices?: Record<string, { price: number; changeRate: number }> } = {};
      if (stockTickers.length > 0) {
        try {
          const stockRes = await fetch(`/api/prices/stocks?tickers=${stockTickers.join(',')}`);
          if (stockRes.ok) stockData = await stockRes.json();
        } catch { /* 주식 실패는 무시 */ }
      }

      // 최신 investments 다시 읽기 (stale closure 방지)
      const latest = getInvestments();
      const updated = latest.map(inv => {
        // 가상자산
        if (inv.ticker === 'BTC' && cryptoData?.BTC) {
          return { ...inv, currentPrice: Math.round(cryptoData.BTC.price), dailyChangeRate: +cryptoData.BTC.changeRate.toFixed(2) };
        }
        if (inv.ticker === 'ETH' && cryptoData?.ETH) {
          return { ...inv, currentPrice: Math.round(cryptoData.ETH.price), dailyChangeRate: +cryptoData.ETH.changeRate.toFixed(2) };
        }
        // 금 — currentPrice = 원/돈 (3.75g)
        if (inv.ticker === 'GOLD' && goldData?.pricePerDon) {
          return { ...inv, currentPrice: Math.round(goldData.pricePerDon) };
        }
        // 주식 (KIS)
        if (inv.type === 'stock' && inv.ticker && stockData?.prices?.[inv.ticker]) {
          const s = stockData.prices[inv.ticker];
          return { ...inv, currentPrice: s.price, dailyChangeRate: +s.changeRate.toFixed(2) };
        }
        return inv;
      });

      setStore({ investments: updated });

      setState({
        BTC: cryptoData?.BTC,
        ETH: cryptoData?.ETH,
        gold: goldData?.pricePerDon
          ? { pricePerDon: goldData.pricePerDon, pricePerGram: goldData.pricePerGram, goldUsdPerOz: goldData.goldUsdPerOz, usdKrw: goldData.usdKrw }
          : undefined,
        lastUpdated: new Date(),
        loading: false,
        error: null,
      });
    } catch {
      setState(prev => ({ ...prev, loading: false, error: '시세 업데이트 실패' }));
    }
  }, [setStore]);

  useEffect(() => {
    fetchPrices();
    timerRef.current = setInterval(fetchPrices, REFRESH_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [fetchPrices]);

  return state;
}
