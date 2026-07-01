// 매수일 ~ 오늘까지 가격 히스토리 시뮬레이션 (실제 API 없을 때 사용)
export interface OHLCV {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

export function generatePriceHistory(
  ticker: string,
  purchaseDate: string,
  purchasePrice: number,
  currentPrice: number,
  days = 90
): OHLCV[] {
  const seed = ticker.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const rand = seededRandom(seed);

  const endDate = new Date();
  const startDate = new Date(purchaseDate);
  const totalDays = Math.min(
    Math.floor((endDate.getTime() - startDate.getTime()) / 86400000),
    days
  );

  const result: OHLCV[] = [];
  const logStart = Math.log(purchasePrice);
  const logEnd = Math.log(currentPrice);
  const logStep = (logEnd - logStart) / totalDays;

  let prevClose = purchasePrice;

  for (let i = 0; i < totalDays; i++) {
    const d = new Date(endDate);
    d.setDate(d.getDate() - (totalDays - i));
    const dateStr = d.toISOString().split('T')[0];

    if (d.getDay() === 0 || d.getDay() === 6) continue; // 주말 제외

    const trend = Math.exp(logStart + logStep * i);
    const noise = (rand() - 0.48) * 0.035;
    const close = Math.round(trend * (1 + noise));

    const range = close * (0.01 + rand() * 0.02);
    const open = Math.round(prevClose * (1 + (rand() - 0.5) * 0.01));
    const high = Math.round(Math.max(open, close) + range * rand());
    const low = Math.round(Math.min(open, close) - range * rand());
    const baseVol = currentPrice < 100_000 ? 5_000_000 : currentPrice < 1_000_000 ? 500_000 : 50_000;
    const volume = Math.round(baseVol * (0.5 + rand()));

    result.push({ date: dateStr, open, high, low, close, volume });
    prevClose = close;
  }

  return result;
}
