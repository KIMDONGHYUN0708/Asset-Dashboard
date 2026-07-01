'use client';
import { useDataSync } from '@/lib/useDataSync';

export default function DataSyncWatcher() {
  useDataSync();
  return null;
}
