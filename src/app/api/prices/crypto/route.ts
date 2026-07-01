import { NextRequest, NextResponse } from 'next/server';

// GET /api/prices/crypto?tickers=BTC,ETH,SOL,XRP
// tickers 미전달 시 BTC,ETH 기본 반환 (하위 호환)
export async function GET(req: NextRequest) {
  try {
    const param = req.nextUrl.searchParams.get('tickers');
    const tickers = param
      ? param.split(',').map(t => t.trim().toUpperCase()).filter(Boolean)
      : ['BTC', 'ETH'];

    const markets = tickers.map(t => `KRW-${t}`).join(',');
    const res = await fetch(
      `https://api.upbit.com/v1/ticker?markets=${markets}`,
      { next: { revalidate: 30 } }
    );
    if (!res.ok) throw new Error('Upbit API error');

    const data = await res.json();
    const result: Record<string, { price: number; changeRate: number }> = {};

    for (const item of data) {
      const key = item.market.replace('KRW-', '');
      result[key] = {
        price: item.trade_price,
        changeRate: item.signed_change_rate * 100,
      };
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}
