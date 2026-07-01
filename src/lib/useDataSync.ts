'use client';
import { useEffect, useRef, useCallback } from 'react';
import { useAssetStore } from './store';
import { encryptData, decryptData } from './crypto';
import { AssetStore } from './types';

const KEY_LS = 'asd-uuid';

export function getStoredUUID(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(KEY_LS);
}

export function setStoredUUID(uuid: string) {
  localStorage.setItem(KEY_LS, uuid);
}

export function clearStoredUUID() {
  localStorage.removeItem(KEY_LS);
}

/** KV에서 불러와서 Zustand 스토어에 덮어쓰기 */
export async function loadFromCloud(uuid: string): Promise<'ok' | 'not_found' | 'error'> {
  try {
    const res = await fetch(`/api/sync?uuid=${uuid}`);
    if (!res.ok) return 'error';
    const { payload, error } = await res.json();
    if (error === 'KV not configured') return 'error';
    if (!payload) return 'not_found';
    const plain = await decryptData(uuid, payload);
    const state: Partial<AssetStore> = JSON.parse(plain);
    useAssetStore.getState().setStore(state);
    return 'ok';
  } catch {
    return 'error';
  }
}

/** 현재 스토어 상태를 암호화해서 KV에 저장 */
export async function saveToCloud(uuid: string): Promise<boolean> {
  try {
    const state = useAssetStore.getState();
    const data: Partial<AssetStore> = {
      cash: state.cash,
      accounts: state.accounts,
      investments: state.investments,
      physicalAssets: state.physicalAssets,
      depositAmount: state.depositAmount,
      history: state.history,
      annualSnapshots: state.annualSnapshots ?? [],
    };
    const payload = await encryptData(uuid, JSON.stringify(data));
    const res = await fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uuid, payload }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** 스토어 변경 시 KV에 자동 동기화 (5초 디바운스) */
export function useDataSync() {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const investments  = useAssetStore(s => s.investments);
  const accounts     = useAssetStore(s => s.accounts);
  const cash         = useAssetStore(s => s.cash);
  const depositAmount = useAssetStore(s => s.depositAmount);
  const physicalAssets = useAssetStore(s => s.physicalAssets);

  const scheduleSave = useCallback(() => {
    const uuid = getStoredUUID();
    if (!uuid) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => saveToCloud(uuid), 5000);
  }, []);

  useEffect(() => {
    scheduleSave();
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [investments, accounts, cash, depositAmount, physicalAssets]);
}
