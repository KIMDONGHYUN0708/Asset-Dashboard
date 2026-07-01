'use client';
import { useEffect } from 'react';
import { useAssetStore } from './store';

/**
 * 월이 바뀌면 자동으로 스냅샷을 저장한다.
 * - 앱 첫 로드 시 최근 저장된 달과 현재 달을 비교
 * - 다른 달이면 즉시 새 스냅샷 생성
 * - 같은 달이면 현재 달 스냅샷을 최신 자산 기준으로 갱신 (라이브 반영)
 */
export function useMonthlySnapshot() {
  const saveSnapshot = useAssetStore((s) => s.saveSnapshot);
  // investments·accounts 변동을 감지하기 위해 구독
  const investments = useAssetStore((s) => s.investments);
  const accounts = useAssetStore((s) => s.accounts);
  const history = useAssetStore((s) => s.history);

  useEffect(() => {
    const now = new Date().toISOString().slice(0, 7); // YYYY-MM
    const latest = history[history.length - 1]?.date;

    if (!latest || latest !== now) {
      // 새 달 진입 → 스냅샷 생성
      saveSnapshot(now);
    } else {
      // 같은 달 → 현재 달 스냅샷을 최신 가격으로 갱신 (30초마다 live price가 바뀌므로)
      saveSnapshot(now);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [investments, accounts]);
}
