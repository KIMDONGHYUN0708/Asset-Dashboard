'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Key, Copy, Check, RefreshCw, CloudDownload, ShieldCheck } from 'lucide-react';
import { getStoredUUID, setStoredUUID, loadFromCloud, saveToCloud } from '@/lib/useDataSync';
import { useAssetStore } from '@/lib/store';

type Phase = 'idle' | 'setup' | 'manage';
type LoadStatus = 'idle' | 'loading' | 'ok' | 'not_found' | 'error';
type SaveStatus = 'idle' | 'saving' | 'ok' | 'error';

export default function DataKeySetup() {
  const router = useRouter();
  const isOnboarded = useAssetStore((s) => s.isOnboarded);

  const [phase, setPhase]           = useState<Phase>('idle');
  const [uuid, setUuid]             = useState('');
  const [inputKey, setInputKey]     = useState('');
  const [copied, setCopied]         = useState(false);
  const [loadStatus, setLoadStatus] = useState<LoadStatus>('idle');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');

  useEffect(() => {
    const stored = getStoredUUID();
    if (stored) { setUuid(stored); setPhase('manage'); }
    else setPhase('setup');
  }, []);

  const generateKey = () => setInputKey(crypto.randomUUID());

  const applyKey = async (key: string) => {
    const trimmed = key.trim();
    if (!trimmed) return;
    setStoredUUID(trimmed);
    setUuid(trimmed);
    setLoadStatus('loading');
    const result = await loadFromCloud(trimmed);
    setLoadStatus(result);

    if (result === 'ok') {
      // 클라우드 데이터 불러옴 → isOnboarded 값이 복원됨
      // 잠시 후 라우팅 처리 (store hydration 기다림)
      setTimeout(() => {
        const onboarded = useAssetStore.getState().isOnboarded;
        if (!onboarded) router.push('/settings?onboarding=1');
        else setPhase('manage');
      }, 200);
    } else if (result === 'not_found') {
      // 신규 키 → 빈 상태로 설정 화면으로
      setPhase('manage');
      router.push('/settings?onboarding=1');
    } else {
      // error → 그냥 manage로
      setPhase('manage');
    }
  };

  const copyKey = () => {
    navigator.clipboard.writeText(uuid);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSyncNow = async () => {
    setSaveStatus('saving');
    const ok = await saveToCloud(uuid);
    setSaveStatus(ok ? 'ok' : 'error');
    setTimeout(() => setSaveStatus('idle'), 3000);
  };

  const handleLoadNow = async () => {
    setLoadStatus('loading');
    const result = await loadFromCloud(uuid);
    setLoadStatus(result);
    setTimeout(() => setLoadStatus('idle'), 3000);
  };

  if (phase === 'idle') return null;

  // ── 초기 설정 화면 ──────────────────────────────────────────────
  if (phase === 'setup') {
    return (
      <div className="fixed inset-0 z-50 bg-th-base/90 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-th-card border border-th-border rounded-2xl p-8 max-w-md w-full shadow-2xl">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
              <Key size={18} className="text-blue-400" />
            </div>
            <div>
              <h2 className="text-[15px] font-bold text-th-text">나만의 데이터 키 설정</h2>
              <p className="text-[12px] text-slate-500 mt-0.5">키 하나로 여러 기기에서 내 자산 데이터에 접근합니다</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* 새 키 생성 */}
            <div className="p-4 rounded-xl bg-th-muted border border-th-border">
              <p className="text-[12px] font-medium text-th-text mb-1">처음 사용하시나요?</p>
              <p className="text-[11px] text-slate-500 mb-3">
                키를 생성하면 자산 입력 화면으로 이동합니다. 키는 반드시 안전한 곳에 보관하세요.
              </p>
              <div className="flex gap-2">
                <input
                  className="flex-1 px-3 py-2 text-[12px] bg-th-input border border-th-border rounded-lg text-th-text placeholder:text-slate-500 font-mono"
                  value={inputKey}
                  onChange={(e) => setInputKey(e.target.value)}
                  placeholder="생성 버튼을 눌러주세요"
                  readOnly={!!inputKey}
                />
                <button onClick={generateKey}
                  className="px-3 py-2 text-[12px] font-medium text-th-text bg-th-input hover:bg-slate-500 border border-slate-500 rounded-lg flex items-center gap-1.5 transition-colors flex-shrink-0">
                  <RefreshCw size={12} /> 생성
                </button>
              </div>
              {inputKey && (
                <button onClick={() => applyKey(inputKey)}
                  className="mt-2 w-full py-2 text-[13px] font-semibold text-th-text bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors">
                  이 키로 시작하기 →
                </button>
              )}
            </div>

            {/* 기존 키 입력 */}
            <div className="p-4 rounded-xl bg-th-muted border border-th-border">
              <p className="text-[12px] font-medium text-th-text mb-2">기존 키가 있으신가요?</p>
              <div className="flex gap-2">
                <input id="existing-key-modal"
                  className="flex-1 px-3 py-2 text-[12px] bg-th-input border border-th-border rounded-lg text-th-text placeholder:text-slate-500 font-mono"
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                />
                <button onClick={() => {
                  const v = (document.getElementById('existing-key-modal') as HTMLInputElement)?.value;
                  if (v) applyKey(v);
                }}
                  className="px-3 py-2 text-[12px] font-medium text-th-text bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-lg flex items-center gap-1.5 transition-colors flex-shrink-0">
                  <CloudDownload size={12} /> 불러오기
                </button>
              </div>
            </div>
          </div>

          {loadStatus === 'loading' && (
            <p className="text-[11px] text-blue-400 text-center mt-3 animate-pulse">데이터 확인 중...</p>
          )}
        </div>
      </div>
    );
  }

  // ── 관리 화면 — 이미 설정 완료 상태, 설정 페이지에서 DataKeySetupPanel 사용 ──
  return null;
}
