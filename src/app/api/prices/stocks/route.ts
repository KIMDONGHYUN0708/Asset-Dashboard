import { NextRequest, NextResponse } from 'next/server';

const BASE = process.env.KIWOOM_BASE_URL ?? 'https://openapi.kiwoom.com:9443';
const APP_KEY = process.env.KIWOOM_APP_KEY!;
const APP_SECRET = process.env.KIWOOM_APP_SECRET!;

// 서버 메모리 토큰 캐시 (만료 10분 전 갱신)
let tokenCache: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expiresAt - 600_000) {
    return tokenCache.token;
  }
  const res = await fetch(`${BASE}/oauth2/tokenP`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      appkey: APP_KEY,
      appsecret: APP_SECRET,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Kiwoom token error: ${res.status} ${err}`);
  }
  const data = await res.json();
  tokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + 86_400_000, // 24h
  };
  return tokenCache.token;
}

async function fetchStockPrice(ticker: string, token: string) {
  const url = new URL(`${BASE}/uapi/domestic-stock/v1/quotations/inquire-price`);
  url.searchParams.set('FID_COND_MRKT_DIV_CODE', 'J');
  url.searchParams.set('FID_INPUT_ISCD', ticker);

  const res = await fetch(url.toString(), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      authorization: `Bearer ${token}`,
      appkey: APP_KEY,
      appsecret: APP_SECRET,
      tr_id: 'FHKST01010100',
      custtype: 'P',
    },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Kiwoom price error (${ticker}): ${res.status} ${err}`);
  }

  const data = await res.json();
  if (data.rt_cd !== '0') {
    throw new Error(`Kiwoom API: ${data.msg1}`);
  }

  const o = data.output;
  return {
    ticker,
    price: Number(o.stck_prpr),       // 현재가
    changeRate: Number(o.prdy_ctrt),   // 전일대비율 (%)
    change: Number(o.prdy_vrss),       // 전일대비 (원)
    volume: Number(o.acml_vol),        // 누적거래량
    high: Number(o.stck_hgpr),         // 고가
    low: Number(o.stck_lwpr),          // 저가
    open: Number(o.stck_oprc),         // 시가
  };
}

// GET /api/prices/stocks?tickers=005930,035720,000660
export async function GET(req: NextRequest) {
  const tickersParam = req.nextUrl.searchParams.get('tickers');
  if (!tickersParam) {
    return NextResponse.json({ error: 'tickers param required' }, { status: 400 });
  }
  if (!APP_KEY || !APP_SECRET || APP_KEY.includes('입력')) {
    return NextResponse.json({ error: 'Kiwoom API keys not configured' }, { status: 503 });
  }

  const tickers = tickersParam.split(',').map(t => t.trim()).filter(Boolean);

  try {
    const token = await getAccessToken();
    const results = await Promise.allSettled(
      tickers.map(ticker => fetchStockPrice(ticker, token))
    );

    const prices: Record<string, ReturnType<typeof fetchStockPrice> extends Promise<infer T> ? T : never> = {};
    const errors: string[] = [];

    results.forEach((r, i) => {
      if (r.status === 'fulfilled') {
        prices[tickers[i]] = r.value;
      } else {
        errors.push(`${tickers[i]}: ${r.reason?.message}`);
      }
    });

    return NextResponse.json({ prices, errors }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
