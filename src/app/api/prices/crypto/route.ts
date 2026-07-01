import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const res = await fetch(
      'https://api.upbit.com/v1/ticker?markets=KRW-BTC,KRW-ETH',
      { next: { revalidate: 60 } }
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
