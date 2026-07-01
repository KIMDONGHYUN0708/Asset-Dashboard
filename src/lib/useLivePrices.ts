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

// 한국 주식 티커는 4~6자리 숫자 (005930, 411060 등)
// 미국 주식은 알파벳 티커 (TSLA, NFLX, QQQ 등) — country 필드보다 ticker 형식이 신뢰도 높음
const isKoreanTicker = (ticker: string) => /^\d{4,6}$/.test(ticker);

export function useLivePrices(): LivePriceResult {
  const setStore = useAssetStore(s => s.setStore);
  const getInvestments = () => useAssetStore.getState().investments;

  const [state, setState] = useState<LivePriceResult>({ loading: true, error: null });
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchPrices = useCallback(async () => {
    try {
      const investments = getInvestments();

      // 한국 주식: 티커가 숫자 형식 → KIS 국내 API
      const koTickers = investments
        .filter(i => i.type === 'stock' && i.ticker && isKoreanTicker(i.ticker!))
        .map(i => i.ticker!);

      // 미국 주식: 티커가 알파벳 형식 → KIS 해외 API (country 무관)
      const usTickers = investments
        .filter(i => i.type === 'stock' && i.ticker && !isKoreanTicker(i.ticker!))
        .map(i => i.ticker!);

      const [cryptoRes, goldRes] = await Promise.all([
        fetch('/api/prices/crypto'),
        fetch('/api/prices/gold'),
      ]);
      if (!cryptoRes.ok || !goldRes.ok) throw new Error('API error');

      const [cryptoData, goldData] = await Promise.all([cryptoRes.json(), goldRes.json()]);

      // 한국 주식 (KIS)
      let stockData: { prices?: Record<string, { price: number; changeRate: number }> } = {};
      if (koTickers.length > 0) {
        try {
          const res = await fetch(`/api/prices/stocks?tickers=${koTickers.join(',')}`);
          if (res.ok) stockData = await res.json();
        } catch { /* KIS 실패는 무시 */ }
      }

      // 미국 주식 (Yahoo Finance)
      let usStockData: { prices?: Record<string, { priceKrw: number; changeRate: number }> } = {};
      if (usTickers.length > 0) {
        try {
          const res = await fetch(`/api/prices/us-stocks?tickers=${usTickers.join(',')}`);
          if (res.ok) usStockData = await res.json();
        } catch { /* Yahoo Finance 실패는 무시 */ }
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
        if (inv.type === 'gold' && goldData?.pricePerDon) {
          return { ...inv, currentPrice: Math.round(goldData.pricePerDon) };
        }
        // 한국 주식 (KIS)
        if (inv.type === 'stock' && inv.ticker && stockData?.prices?.[inv.ticker]) {
          const s = stockData.prices[inv.ticker];
          return { ...inv, currentPrice: s.price, dailyChangeRate: +s.changeRate.toFixed(2) };
        }
        // 미국 주식 (Yahoo Finance — KRW 변환 포함)
        if (inv.type === 'stock' && inv.ticker && usStockData?.prices?.[inv.ticker]) {
          const s = usStockData.prices[inv.ticker];
          return { ...inv, currentPrice: s.priceKrw, dailyChangeRate: +s.changeRate.toFixed(2) };
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
