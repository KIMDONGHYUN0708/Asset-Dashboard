import { NextRequest, NextResponse } from 'next/server';

const BASE = process.env.KIS_BASE_URL ?? 'https://openapi.koreainvestment.com:9443';
const APP_KEY = process.env.KIS_APP_KEY!;
const APP_SECRET = process.env.KIS_APP_SECRET!;

const KV_URL = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;
const KV_KIS_KEY = 'kis:access_token';
const TOKEN_TTL_SEC = 82_800; // 23h (KIS 토큰 유효기간 24h보다 1h 짧게)

function kvHeaders() {
  return { Authorization: `Bearer ${KV_TOKEN}`, 'Content-Type': 'application/json' };
}

// 인스턴스 메모리 캐시 — warm 인스턴스에서 KV 왕복 생략
let tokenCache: { token: string; expiresAt: number } | null = null;

async function getTokenFromKV(): Promise<string | null> {
  if (!KV_URL || !KV_TOKEN) return null;
  try {
    const res = await fetch(KV_URL, {
      method: 'POST',
      headers: kvHeaders(),
      body: JSON.stringify(['GET', KV_KIS_KEY]),
    });
    const { result } = await res.json();
    return result ?? null;
  } catch {
    return null;
  }
}

async function saveTokenToKV(token: string): Promise<void> {
  if (!KV_URL || !KV_TOKEN) return;
  try {
    await fetch(KV_URL, {
      method: 'POST',
      headers: kvHeaders(),
      body: JSON.stringify(['SET', KV_KIS_KEY, token, 'EX', TOKEN_TTL_SEC]),
    });
  } catch {
    // best-effort
  }
}

async function getAccessToken(): Promise<string> {
  // 1단계: 인스턴스 메모리 (warm 재사용)
  if (tokenCache && Date.now() < tokenCache.expiresAt - 600_000) {
    return tokenCache.token;
  }
  // 2단계: KV 캐시 — cold start 이후에도 재발급 방지
  const kvToken = await getTokenFromKV();
  if (kvToken) {
    tokenCache = { token: kvToken, expiresAt: Date.now() + TOKEN_TTL_SEC * 1000 };
    return kvToken;
  }
  // 3단계: 신규 발급 후 KV에 저장
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
  const newToken: string = data.access_token;
  tokenCache = { token: newToken, expiresAt: Date.now() + 86_400_000 };
  await saveTokenToKV(newToken);
  return newToken;
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

const NAVER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'ko-KR,ko;q=0.9',
  'Referer': 'https://m.stock.naver.com/',
  'Origin': 'https://m.stock.naver.com',
};

function parseNaverPrice(d: Record<string, unknown>): number {
  // Naver Finance 응답 필드명 다중 fallback
  const raw = d.closePrice ?? d.stockPrice ?? d.price ?? d.nv ?? d.cv ?? d.lastPrice;
  const p = Number(String(raw ?? '').replace(/,/g, ''));
  return isNaN(p) ? 0 : p;
}

function parseNaverRate(d: Record<string, unknown>): number {
  const raw = d.fluctuationsRatio ?? d.priceChangeRate ?? d.changeRate ?? 0;
  return Number(String(raw).replace(/[^0-9.-]/g, '')) || 0;
}

// Naver Finance fallback — KIS가 처리 못하는 특수 티커(0064K0 등) 대응
async function fetchNaverStockPrice(ticker: string) {
  // /basic → /integration 순 시도 (ETF 특수 형식 대응)
  const endpoints = [
    `https://m.stock.naver.com/api/stock/${encodeURIComponent(ticker)}/basic`,
    `https://m.stock.naver.com/api/stock/${encodeURIComponent(ticker)}/integration`,
  ];

  let lastErr: unknown;
  for (const url of endpoints) {
    try {
      const res = await fetch(url, { headers: NAVER_HEADERS, cache: 'no-store' });
      if (!res.ok) { lastErr = new Error(`Naver HTTP ${res.status}`); continue; }
      const d: Record<string, unknown> = await res.json();

      // /integration 응답은 stockInfo 하위에 있을 수 있음
      const target = (d.stockInfo as Record<string, unknown>) ?? d;
      const price = parseNaverPrice(target);
      if (!price || price <= 0) {
        console.warn(`[Naver] ${ticker} price=0, raw keys: ${Object.keys(target).join(',')}`);
        lastErr = new Error(`Naver: zero price for ${ticker}`);
        continue;
      }
      return { ticker, price, changeRate: parseNaverRate(target), change: 0, volume: 0, high: 0, low: 0, open: 0 };
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}

// KIS ETF/ETN 현재가 전용 API (FHPST02400000) — 0064K0 같은 특수 티커 대응
async function fetchKISETFPrice(ticker: string, token: string) {
  const url = new URL(`${BASE}/uapi/etfetn/v1/quotations/inquire-price`);
  url.searchParams.set('FID_COND_MRKT_DIV_CODE', 'J');
  url.searchParams.set('FID_INPUT_ISCD', ticker);

  const res = await fetch(url.toString(), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      authorization: `Bearer ${token}`,
      appkey: APP_KEY,
      appsecret: APP_SECRET,
      tr_id: 'FHPST02400000',
      custtype: 'P',
    },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`KIS ETF price error (${ticker}): ${res.status} ${err}`);
  }

  const data = await res.json();
  if (data.rt_cd !== '0') throw new Error(`KIS ETF: ${data.msg1}`);

  const o = data.output;
  const price = Number(o.stck_prpr);
  if (!price || price <= 0) throw new Error(`Zero ETF price: ${ticker}`);

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

// 특수 ETF 티커 판별 (0064K0 패턴: 4자리숫자 + 알파벳 + 숫자)
function isSpecialETFTicker(ticker: string) {
  return /^\d{4}[A-Z]\d$/.test(ticker);
}

// ETF 티커: ETF API 먼저 → J/Q 주식 API → Naver
// 일반 티커: J → Q → ETF API → Naver
async function fetchStockPrice(ticker: string, token: string) {
  let lastErr: unknown;

  if (isSpecialETFTicker(ticker)) {
    // ETF 전용 API 우선 시도
    try { return await fetchKISETFPrice(ticker, token); } catch (e) { lastErr = e; }
  }

  for (const mrkt of ['J', 'Q'] as const) {
    try { return await fetchKISDomesticPrice(ticker, mrkt, token); } catch (e) { lastErr = e; }
  }

  if (!isSpecialETFTicker(ticker)) {
    // 일반 티커는 ETF API도 fallback으로 시도
    try { return await fetchKISETFPrice(ticker, token); } catch (e) { lastErr = e; }
  }

  // 최후 fallback: Naver Finance
  try { return await fetchNaverStockPrice(ticker); } catch (e) { lastErr = e; }
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
