import { NextResponse } from 'next/server';

const G_PER_OZ  = 31.1035;  // 트로이온스 → 그램
const G_PER_DON = 3.75;     // 1돈 = 3.75g
// 국내 KRX 금시세 = 국제 시세 × 환율 × VAT(10%)
const KRX_VAT   = 1.10;

async function fetchGoldUSDPerOz(): Promise<number> {
  // ① Yahoo Finance GC=F (금 선물) — 무료, 키 불필요
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

  // ② metals.live (2차 fallback)
  try {
    const res = await fetch('https://api.metals.live/v1/spot', {
      next: { revalidate: 300 },
    });
    if (res.ok) {
      const data = await res.json();
      const price: number = Array.isArray(data) ? (data[0]?.gold ?? 0) : (data?.gold ?? 0);
      if (price > 500) return price;
    }
  } catch { /* fallthrough */ }

  // ③ 최종 fallback — 2026년 7월 기준 국제 금 시세 근삿값
  return 4050;
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

    // 국내 KRX 금시세 반영 (국제 시세 × 환율 × 부가세 10%)
    const pricePerGram = Math.round((goldUsdPerOz / G_PER_OZ) * usdKrw * KRX_VAT);
    const pricePerDon  = Math.round(pricePerGram * G_PER_DON);

    return NextResponse.json({
      pricePerDon,
      pricePerGram,
      goldUsdPerOz: Math.round(goldUsdPerOz * 100) / 100,
      usdKrw: Math.round(usdKrw),
      source: 'yahoo-GCF+er-api+10%VAT',
    });
  } catch {
    // 최종 fallback — 2026년 7월 KRX 수준
    const fallbackGram = Math.round((4050 / G_PER_OZ) * 1380 * KRX_VAT);
    return NextResponse.json({
      pricePerDon:  Math.round(fallbackGram * G_PER_DON),
      pricePerGram: fallbackGram,
      goldUsdPerOz: 4050,
      usdKrw: 1380,
      source: 'fallback',
    });
  }
}
