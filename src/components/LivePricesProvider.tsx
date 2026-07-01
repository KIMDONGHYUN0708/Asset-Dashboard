'use client';
import { useLivePrices } from '@/lib/useLivePrices';
import { useMonthlySnapshot } from '@/lib/useMonthlySnapshot';

export default function LivePricesProvider() {
  useLivePrices();
  useMonthlySnapshot();
  return null;
}
