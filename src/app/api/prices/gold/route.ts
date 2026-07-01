import { NextResponse } from 'next/server';

const G_PER_OZ = 31.1035;   // 트로이온스 → 그램
const G_PER_DON = 3.75;     // 1돈 = 3.75g

export async function GET() {
  try {
    // ① USD/KRW 환율 (open.er-api.com — 무료, 키 불필요)
    const fxRes = await fetch('https://open.er-api.com/v6/latest/USD', {
      next: { revalidate: 1800 },
    });
    const fxData = await fxRes.json();
    const usdKrw: number = fxData?.rates?.KRW ?? 1380;

    // ② 국제 금 현물가 USD/oz (metals.live — 무료, 키 불필요)
    // 응답 형식: [{ "gold": 3320.5, "silver": 33.1, ... }]
    const metalRes = await fetch('https://api.metals.live/v1/spot', {
      next: { revalidate: 300 }, // 5분마다 갱신
    });
    const metalData = await metalRes.json();
    const goldUsdPerOz: number = Array.isArray(metalData)
      ? (metalData[0]?.gold ?? 3300)
      : (metalData?.gold ?? 3300);

    const pricePerGram = Math.round((goldUsdPerOz / G_PER_OZ) * usdKrw);
    const pricePerDon  = Math.round(pricePerGram * G_PER_DON);   // 원/돈

    return NextResponse.json({
      pricePerDon,
      pricePerGram,
      goldUsdPerOz: Math.round(goldUsdPerOz * 100) / 100,
      usdKrw: Math.round(usdKrw),
      source: 'metals.live+er-api',
    });
  } catch {
    // fallback — 기준 단가 (금 약 3,300 USD/oz, 환율 1,380)
    const fallbackGram = Math.round((3300 / G_PER_OZ) * 1380);
    return NextResponse.json({
      pricePerDon:  Math.round(fallbackGram * G_PER_DON),
      pricePerGram: fallbackGram,
      goldUsdPerOz: 3300,
      usdKrw: 1380,
      source: 'fallback',
    });
  }
}
