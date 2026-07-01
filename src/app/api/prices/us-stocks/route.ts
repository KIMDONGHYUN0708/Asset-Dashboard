import { NextRequest, NextResponse } from 'next/server';

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

async function fetchYahooPrice(ticker: string) {
  const res = await fetch(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1d`,
    { next: { revalidate: 60 } }
  );
  if (!res.ok) throw new Error(`Yahoo Finance HTTP ${res.status}: ${ticker}`);
  const data = await res.json();
  const result = data?.chart?.result?.[0];
  if (!result) throw new Error(`No chart result for ${ticker}`);
  const meta = result.meta;
  const currentPrice: number = meta?.regularMarketPrice ?? meta?.chartPreviousClose;
  const prevClose: number = meta?.chartPreviousClose ?? meta?.previousClose ?? currentPrice;
  if (!currentPrice) throw new Error(`No price data for ${ticker}`);
  const changeRate = prevClose > 0
    ? ((currentPrice - prevClose) / prevClose) * 100
    : 0;
  return { ticker, priceUsd: currentPrice, changeRate: +changeRate.toFixed(2) };
}

// GET /api/prices/us-stocks?tickers=AAPL,NVDA,MSFT
export async function GET(req: NextRequest) {
  const tickersParam = req.nextUrl.searchParams.get('tickers');
  if (!tickersParam) {
    return NextResponse.json({ error: 'tickers param required' }, { status: 400 });
  }

  const tickers = tickersParam.split(',').map(t => t.trim()).filter(Boolean);
  if (tickers.length === 0) {
    return NextResponse.json({ prices: {}, usdKrw: 1380 });
  }

  const usdKrw = await fetchUSDKRW();

  const results = await Promise.allSettled(tickers.map(fetchYahooPrice));

  const prices: Record<string, { priceKrw: number; priceUsd: number; changeRate: number }> = {};
  const errors: string[] = [];

  results.forEach((r, i) => {
    if (r.status === 'fulfilled') {
      prices[tickers[i]] = {
        priceUsd: r.value.priceUsd,
        priceKrw: Math.round(r.value.priceUsd * usdKrw),
        changeRate: r.value.changeRate,
      };
    } else {
      errors.push(`${tickers[i]}: ${r.reason?.message ?? 'unknown'}`);
    }
  });

  return NextResponse.json({ prices, usdKrw, errors }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
