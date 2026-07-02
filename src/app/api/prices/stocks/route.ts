import { NextRequest, NextResponse } from 'next/server';

const BASE = process.env.KIS_BASE_URL ?? 'https://openapi.koreainvestment.com:9443';
const APP_KEY = process.env.KIS_APP_KEY!;
const APP_SECRET = process.env.KIS_APP_SECRET!;

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
    throw new Error(`KIS token error: ${res.status} ${err}`);
  }
  const data = await res.json();
  tokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + 86_400_000, // 24h
  };
  return tokenCache.token;
}

async function fetchKISDomesticPrice(ticker: string, mrkt: string, token: string) {
  const url = new URL(`${BASE}/uapi/domestic-stock/v1/quotations/inquire-price`);
  url.searchParams.set('FID_COND_MRKT_DIV_CODE', mrkt);
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
    throw new Error(`KIS price error (${ticker}/${mrkt}): ${res.status} ${err}`);
  }

  const data = await res.json();
  if (data.rt_cd !== '0') throw new Error(`KIS(${mrkt}): ${data.msg1}`);

  const o = data.output;
  const price = Number(o.stck_prpr);
  if (!price || price <= 0) throw new Error(`Zero price: ${ticker}(${mrkt})`);

  return {
    ticker,
    price,
    changeRate: Number(o.prdy_ctrt),
    change: Number(o.prdy_vrss),
    volume: Number(o.acml_vol),
    high: Number(o.stck_hgpr),
    low: Number(o.stck_lwpr),
    open: Number(o.stck_oprc),
  };
}

// Naver Finance fallback — KIS가 처리 못하는 특수 티커(0064K0 등) 대응
async function fetchNaverStockPrice(ticker: string) {
  const res = await fetch(
    `https://m.stock.naver.com/api/stock/${encodeURIComponent(ticker)}/basic`,
    { headers: { 'User-Agent': 'Mozilla/5.0 (compatible)' }, cache: 'no-store' }
  );
  if (!res.ok) throw new Error(`Naver HTTP ${res.status}: ${ticker}`);
  const d = await res.json();
  const price = Number(String(d.closePrice ?? '').replace(/,/g, ''));
  if (!price || price <= 0) throw new Error(`Naver: zero price for ${ticker}`);
  return {
    ticker,
    price,
    changeRate: Number(d.fluctuationsRatio ?? 0),
    change: Number(String(d.compareToPreviousClosePrice ?? '').replace(/,/g, '')),
    volume: 0, high: 0, low: 0, open: 0,
  };
}

// J=KOSPI → Q=KOSDAQ → Naver Finance 순 시도
async function fetchStockPrice(ticker: string, token: string) {
  let lastErr: unknown;
  for (const mrkt of ['J', 'Q'] as const) {
    try {
      return await fetchKISDomesticPrice(ticker, mrkt, token);
    } catch (e) {
      lastErr = e;
    }
  }
  // KIS 실패 시 Naver Finance로 fallback
  try {
    return await fetchNaverStockPrice(ticker);
  } catch (e) {
    lastErr = e;
  }
  throw lastErr;
}

// GET /api/prices/stocks?tickers=005930,035720,000660
export async function GET(req: NextRequest) {
  const tickersParam = req.nextUrl.searchParams.get('tickers');
  if (!tickersParam) {
    return NextResponse.json({ error: 'tickers param required' }, { status: 400 });
  }
  if (!APP_KEY || !APP_SECRET) {
    return NextResponse.json({ error: 'KIS API keys not configured' }, { status: 503 });
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
