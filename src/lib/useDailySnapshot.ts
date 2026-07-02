'use client';
import { useEffect } from 'react';
import { useAssetStore } from './store';

/**
 * 앱 로드 시 오늘 날짜로 일별 스냅샷을 자동 저장.
 * investments / accounts 변경 시마다 오늘 값을 덮어써 최신 상태 유지.
 */
export function useDailySnapshot() {
  const saveDailySnapshot = useAssetStore((s) => s.saveDailySnapshot);
  const investments = useAssetStore((s) => s.investments);
  const accounts = useAssetStore((s) => s.accounts);

  useEffect(() => {
    saveDailySnapshot();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [investments, accounts]);
}
