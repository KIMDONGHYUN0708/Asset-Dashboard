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

// 한국 주식 티커: 4~6자리 숫자 (005930) 또는 KRX 특수 형식 (0064K0 — 숫자4+영문1+숫자1)
// 미국 주식은 알파벳 티커 (TSLA, NFLX 등)
const isKoreanTicker = (ticker: string) =>
  /^\d{4,6}$/.test(ticker) || /^\d{4}[A-Z]\d$/.test(ticker);

export function useLivePrices(): LivePriceResult {
  const setStore = useAssetStore(s => s.setStore);
  const getInvestments = () => useAssetStore.getState().investments;

  const [state, setState] = useState<LivePriceResult>({ loading: true, error: null });
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchPrices = useCallback(async () => {
    try {
      const investments = getInvestments();

      // 가상자산: type=crypto인 모든 티커 → Upbit 동적 조회
      const cryptoTickers = [...new Set(
        investments.filter(i => i.type === 'crypto' && i.ticker).map(i => i.ticker!)
      )];

      // 한국 주식: 숫자 티커 → KIS 국내 API
      const koTickers = investments
        .filter(i => i.type === 'stock' && i.ticker && isKoreanTicker(i.ticker!))
        .map(i => i.ticker!);

      // 미국 주식: 알파벳 티커 → KIS 해외 API
      const usTickers = investments
        .filter(i => i.type === 'stock' && i.ticker && !isKoreanTicker(i.ticker!))
        .map(i => i.ticker!);

      // 가상자산 + 금 동시 조회
      const cryptoParam = cryptoTickers.length > 0 ? `?tickers=${cryptoTickers.join(',')}` : '';
      const [cryptoRes, goldRes] = await Promise.all([
        fetch(`/api/prices/crypto${cryptoParam}`),
        fetch('/api/prices/gold'),
      ]);
      if (!cryptoRes.ok || !goldRes.ok) throw new Error('API error');

      const [cryptoData, goldData] = await Promise.all([cryptoRes.json(), goldRes.json()]);

      // 한국 주식 (KIS 국내)
      let stockData: { prices?: Record<string, { price: number; changeRate: number }> } = {};
      if (koTickers.length > 0) {
        try {
          const res = await fetch(`/api/prices/stocks?tickers=${koTickers.join(',')}`);
          if (res.ok) stockData = await res.json();
        } catch { /* KIS 실패는 무시 */ }
      }

      // 미국 주식 (KIS 해외)
      let usStockData: { prices?: Record<string, { priceKrw: number; changeRate: number }> } = {};
      if (usTickers.length > 0) {
        try {
          const res = await fetch(`/api/prices/us-stocks?tickers=${usTickers.join(',')}`);
          if (res.ok) usStockData = await res.json();
        } catch { /* 실패 무시 */ }
      }

      // stale closure 방지: 최신 investments 다시 읽기
      const latest = getInvestments();
      const updated = latest.map(inv => {
        // 가상자산 — BTC/ETH 포함 등록된 모든 코인
        if (inv.type === 'crypto' && inv.ticker && cryptoData?.[inv.ticker]) {
          const c = cryptoData[inv.ticker];
          return { ...inv, currentPrice: Math.round(c.price), dailyChangeRate: +c.changeRate.toFixed(2) };
        }
        // 금 — currentPrice = 원/돈 (3.75g)
        if (inv.type === 'gold' && goldData?.pricePerDon) {
          return { ...inv, currentPrice: Math.round(goldData.pricePerDon) };
        }
        // 한국 주식 (KIS 국내)
        if (inv.type === 'stock' && inv.ticker && stockData?.prices?.[inv.ticker]) {
          const s = stockData.prices[inv.ticker];
          return { ...inv, currentPrice: s.price, dailyChangeRate: +s.changeRate.toFixed(2) };
        }
        // 미국 주식 (KIS 해외, KRW 변환 포함)
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
