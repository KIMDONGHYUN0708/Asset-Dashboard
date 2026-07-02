'use client';
import { useDataSync } from '@/lib/useDataSync';
import { useDailySnapshot } from '@/lib/useDailySnapshot';

export default function DataSyncWatcher() {
  useDataSync();
  useDailySnapshot();
  return null;
}
