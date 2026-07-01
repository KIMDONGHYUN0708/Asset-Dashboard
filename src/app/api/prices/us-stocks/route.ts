import { NextRequest, NextResponse } from 'next/server';

const BASE = process.env.KIS_BASE_URL ?? 'https://openapi.koreainvestment.com:9443';
const APP_KEY = process.env.KIS_APP_KEY!;
const APP_SECRET = process.env.KIS_APP_SECRET!;

// 주요 미국 주식 거래소 코드 매핑 (KIS 기준)
// NAS=나스닥, NYS=뉴욕, AMS=아멕스
const EXCHANGE_MAP: Record<string, string> = {
  // NASDAQ
  AAPL: 'NAS', MSFT: 'NAS', NVDA: 'NAS', AMZN: 'NAS',
  GOOGL: 'NAS', GOOG: 'NAS', META: 'NAS', TSLA: 'NAS',
  AVGO: 'NAS', QCOM: 'NAS', AMD: 'NAS', INTC: 'NAS',
  ARM: 'NAS', MU: 'NAS', AMAT: 'NAS', LRCX: 'NAS',
  MRVL: 'NAS', KLAC: 'NAS', TXN: 'NAS', ADI: 'NAS',
  ASML: 'NAS', SMCI: 'NAS',
  NFLX: 'NAS', COST: 'NAS', DDOG: 'NAS', NET: 'NAS',
  MDB: 'NAS', WDAY: 'NAS', CRWD: 'NAS', NOW: 'NAS',
  ADBE: 'NAS', INTU: 'NAS', PYPL: 'NAS',
  ISRG: 'NAS', BKNG: 'NAS', COIN: 'NAS',
  QQQ: 'NAS', JEPQ: 'NAS', TQQQ: 'NAS', QQQM: 'NAS',
  SBUX: 'NAS', ABNB: 'NAS', MRNA: 'NAS', PANW: 'NAS',
  // NYSE / NYSE Arca (ETF 포함)
  SPY: 'NYS', VOO: 'NYS', SCHD: 'NYS', IVV: 'NYS',
  GLD: 'NYS', IAU: 'NYS', GDX: 'NYS',
  VGT: 'NYS', XLK: 'NYS', XLF: 'NYS', XLE: 'NYS',
  SMH: 'NYS', VYM: 'NYS', DGRO: 'NYS', HDV: 'NYS', NOBL: 'NYS',
  SOXL: 'NYS', QLD: 'NYS', UPRO: 'NYS', SPXL: 'NYS',
  SSO: 'NYS', FNGU: 'NYS',
  NKE: 'NYS', MCD: 'NYS', CAT: 'NYS',
  T: 'NYS', VZ: 'NYS', O: 'NYS', AMT: 'NYS',
  // NYSE 개별 종목
  TSM: 'NYS', JPM: 'NYS', V: 'NYS', MA: 'NYS',
  XOM: 'NYS', JNJ: 'NYS', LLY: 'NYS', UNH: 'NYS', PFE: 'NYS',
  'BRK-B': 'NYS', WMT: 'NYS', DIS: 'NYS',
  CRM: 'NYS', ORCL: 'NYS', UBER: 'NYS',
  CPNG: 'NYS', SQ: 'NYS', SPOT: 'NYS',
  PLTR: 'NYS', SNOW: 'NYS', CVX: 'NYS', SHOP: 'NYS',
};

let tokenCache: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expiresAt - 600_000) {
    return tokenCache.token;
  }
  const res = await fetch(`${BASE}/oauth2/tokenP`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ grant_type: 'client_credentials', appkey: APP_KEY, appsecret: APP_SECRET }),
  });
  if (!res.ok) throw new Error(`KIS token error: ${res.status}`);
  const data = await res.json();
  tokenCache = { token: data.access_token, expiresAt: Date.now() + 86_400_000 };
  return tokenCache.token;
}

async function fetchKISOverseaPrice(ticker: string, excd: string, token: string) {
  const url = new URL(`${BASE}/uapi/overseas-price/v1/quotations/price`);
  url.searchParams.set('AUTH', '');
  url.searchParams.set('EXCD', excd);
  url.searchParams.set('SYMB', ticker);

  const res = await fetch(url.toString(), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      authorization: `Bearer ${token}`,
      appkey: APP_KEY,
      appsecret: APP_SECRET,
      tr_id: 'HHDFS00000300',
      custtype: 'P',
    },
  });

  if (!res.ok) throw new Error(`KIS overseas HTTP ${res.status}: ${ticker}(${excd})`);
  const data = await res.json();
  if (data.rt_cd !== '0') throw new Error(`KIS: ${ticker}(${excd}) - ${data.msg1}`);

  const o = data.output;
  // last=현재가, base=전일종가 (last가 0이면 base로 fallback)
  const priceUsd = Number(o.last) || Number(o.base);
  if (!priceUsd || priceUsd <= 0) throw new Error(`Zero price: ${ticker}(${excd})`);

  return { ticker, excd, priceUsd, changeRate: Number(o.rate) };
}

async function fetchWithFallback(ticker: string, token: string) {
  const primary = EXCHANGE_MAP[ticker] ?? 'NAS';
  try {
    return await fetchKISOverseaPrice(ticker, primary, token);
  } catch {
    // primary 실패 시 NAS↔NYS 교차 시도
    const fallback = primary === 'NAS' ? 'NYS' : 'NAS';
    return await fetchKISOverseaPrice(ticker, fallback, token);
  }
}

async function fetchUSDKRW(): Promise<number> {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD', { next: { revalidate: 1800 } });
    const data = await res.json();
    return data?.rates?.KRW ?? 1380;
  } catch {
    return 1380;
  }
}

// GET /api/prices/us-stocks?tickers=AAPL,NVDA,MSFT
export async function GET(req: NextRequest) {
  const tickersParam = req.nextUrl.searchParams.get('tickers');
  if (!tickersParam) {
    return NextResponse.json({ error: 'tickers param required' }, { status: 400 });
  }
  if (!APP_KEY || !APP_SECRET) {
    return NextResponse.json({ error: 'KIS API keys not configured' }, { status: 503 });
  }

  const tickers = tickersParam.split(',').map(t => t.trim()).filter(Boolean);
  if (tickers.length === 0) {
    return NextResponse.json({ prices: {}, usdKrw: 1380 });
  }

  try {
    const [token, usdKrw] = await Promise.all([getAccessToken(), fetchUSDKRW()]);

    const results = await Promise.allSettled(tickers.map(t => fetchWithFallback(t, token)));

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
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
