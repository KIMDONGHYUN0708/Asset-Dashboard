import { NextResponse } from 'next/server';

const G_PER_OZ  = 31.1035;  // 트로이온스 → 그램
const G_PER_DON = 3.75;     // 1돈 = 3.75g
// KRX 금시세 = 국제 현물가 × 환율 (VAT 미포함 — KRX는 거래소 시세, 부가세는 실물 구매 시만 적용)

async function fetchGoldUSDPerOz(): Promise<number> {
  // ① XAUUSD=X : Yahoo Finance 금 현물(Spot) 가격 — 선물보다 정확
  try {
    const res = await fetch(
      'https://query1.finance.yahoo.com/v8/finance/chart/XAUUSD%3DX?interval=1d&range=1d',
      { next: { revalidate: 300 } }
    );
    if (res.ok) {
      const data = await res.json();
      const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
      if (price && price > 500) return price;
    }
  } catch { /* fallthrough */ }

  // ② GC=F : 금 선물 (현물 대비 소폭 높음, 2차 fallback)
  try {
    const res = await fetch(
      'https://query1.finance.yahoo.com/v8/finance/chart/GC%3DF?interval=1d&range=1d',
      { next: { revalidate: 300 } }
    );
    if (res.ok) {
      const data = await res.json();
      const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
      if (price && price > 500) return price;
    }
  } catch { /* fallthrough */ }

  // ③ metals.live (3차 fallback)
  try {
    const res = await fetch('https://api.metals.live/v1/spot', { next: { revalidate: 300 } });
    if (res.ok) {
      const data = await res.json();
      const price: number = Array.isArray(data) ? (data[0]?.gold ?? 0) : (data?.gold ?? 0);
      if (price > 500) return price;
    }
  } catch { /* fallthrough */ }

  // ④ 최종 fallback — 2026년 7월 현물 근삿값
  return 4440;
}

async function fetchUSDKRW(): Promise<number> {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD', {
      next: { revalidate: 1800 },
    });
    const data = await res.json();
    return data?.rates?.KRW ?? 1380;
  } catch {
    return 1380;
  }
}

export async function GET() {
  try {
    const [goldUsdPerOz, usdKrw] = await Promise.all([fetchGoldUSDPerOz(), fetchUSDKRW()]);

    const pricePerGram = Math.round((goldUsdPerOz / G_PER_OZ) * usdKrw);
    const pricePerDon  = Math.round(pricePerGram * G_PER_DON);

    return NextResponse.json({
      pricePerDon,
      pricePerGram,
      goldUsdPerOz: Math.round(goldUsdPerOz * 100) / 100,
      usdKrw: Math.round(usdKrw),
      source: 'yahoo-XAUUSD+er-api',
    });
  } catch {
    const fallbackGram = Math.round((4440 / G_PER_OZ) * 1380);
    return NextResponse.json({
      pricePerDon:  Math.round(fallbackGram * G_PER_DON),
      pricePerGram: fallbackGram,
      goldUsdPerOz: 4440,
      usdKrw: 1380,
      source: 'fallback',
    });
  }
}
