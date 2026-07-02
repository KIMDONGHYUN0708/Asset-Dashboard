'use client';
import { useState, useEffect } from 'react';
import { Key, Copy, Check, RefreshCw, CloudDownload, ShieldCheck, Trash2 } from 'lucide-react';
import { getStoredUUID, setStoredUUID, clearStoredUUID, loadFromCloud, saveToCloud } from '@/lib/useDataSync';

type LoadStatus = 'idle' | 'loading' | 'ok' | 'not_found' | 'error';
type SaveStatus = 'idle' | 'saving' | 'ok' | 'error';

export default function DataKeySetupPanel() {
  const [uuid, setUuid]               = useState('');
  const [inputKey, setInputKey]       = useState('');
  const [copied, setCopied]           = useState(false);
  const [loadStatus, setLoadStatus]   = useState<LoadStatus>('idle');
  const [saveStatus, setSaveStatus]   = useState<SaveStatus>('idle');

  useEffect(() => {
    setUuid(getStoredUUID() ?? '');
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
    if (result === 'not_found') {
      const ok = await saveToCloud(trimmed);
      setSaveStatus(ok ? 'ok' : 'error');
    }
    setTimeout(() => { setLoadStatus('idle'); setSaveStatus('idle'); }, 3000);
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

  const handleReset = () => {
    if (!confirm('키를 초기화하면 현재 기기에서 자동 동기화가 중단됩니다. 계속하시겠습니까?')) return;
    clearStoredUUID();
    setUuid('');
    setInputKey('');
  };

  return (
    <div className="max-w-lg space-y-5">
      {/* 현재 키 */}
      {uuid ? (
        <div className="rounded-2xl bg-th-muted/60 border border-th-border p-5 space-y-4">
          <div className="flex items-center gap-2">
            <ShieldCheck size={14} className="text-emerald-400" />
            <h3 className="text-[13px] font-semibold text-th-text">내 데이터 키</h3>
            <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">AES-256 암호화</span>
          </div>
          <p className="text-[11px] text-slate-500">이 키를 다른 기기에 입력하면 동일한 자산 데이터에 접근할 수 있습니다.</p>
          <div className="flex gap-2">
            <code className="flex-1 px-3 py-2 bg-th-card border border-th-border rounded-lg font-mono text-[11px] text-th-text-sec truncate">
              {uuid}
            </code>
            <button onClick={copyKey}
              className={`px-3 py-2 text-[11px] rounded-lg border flex items-center gap-1.5 transition-colors flex-shrink-0 ${
                copied ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                       : 'bg-th-muted border-th-border text-slate-400 hover:text-th-text'
              }`}>
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? '복사됨' : '복사'}
            </button>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSyncNow}
              className={`flex-1 py-2 text-[12px] font-medium rounded-lg border transition-colors flex items-center justify-center gap-1.5 ${
                saveStatus === 'saving' ? 'text-blue-400 border-blue-500/20 bg-blue-500/5 animate-pulse'
                : saveStatus === 'ok'   ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5'
                : saveStatus === 'error' ? 'text-red-400 border-red-500/20 bg-red-500/5'
                : 'text-slate-400 border-th-border hover:text-th-text bg-th-muted'
              }`}>
              <ShieldCheck size={12} />
              {saveStatus === 'saving' ? '저장 중...' : saveStatus === 'ok' ? '저장 완료' : saveStatus === 'error' ? '저장 실패' : '클라우드에 저장'}
            </button>
            <button onClick={handleLoadNow}
              className={`flex-1 py-2 text-[12px] font-medium rounded-lg border transition-colors flex items-center justify-center gap-1.5 ${
                loadStatus === 'loading' ? 'text-blue-400 border-blue-500/20 bg-blue-500/5 animate-pulse'
                : loadStatus === 'ok'   ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5'
                : loadStatus === 'error' ? 'text-red-400 border-red-500/20 bg-red-500/5'
                : 'text-slate-400 border-th-border hover:text-th-text bg-th-muted'
              }`}>
              <CloudDownload size={12} />
              {loadStatus === 'loading' ? '불러오는 중...' : loadStatus === 'ok' ? '불러옴' : loadStatus === 'not_found' ? '저장 없음' : loadStatus === 'error' ? '오류' : '클라우드에서 불러오기'}
            </button>
          </div>
          <div className="pt-2 border-t border-th-border/50 flex justify-between items-center">
            <p className="text-[10px] text-slate-600">데이터 변경 시 5초 후 자동 저장됩니다</p>
            <button onClick={handleReset}
              className="flex items-center gap-1 text-[11px] text-slate-600 hover:text-red-400 transition-colors">
              <Trash2 size={11} /> 키 초기화
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl bg-th-muted/60 border border-dashed border-th-border p-5 text-center">
          <Key size={24} className="text-slate-600 mx-auto mb-2" />
          <p className="text-[13px] text-slate-400 mb-1">데이터 키가 설정되지 않았습니다</p>
          <p className="text-[11px] text-slate-600">키를 생성하거나 기존 키를 입력하면 클라우드 동기화가 활성화됩니다</p>
        </div>
      )}

      {/* 새 키 생성 */}
      <div className="rounded-2xl bg-th-card border border-th-border p-5 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <RefreshCw size={13} className="text-blue-400" />
          <h3 className="text-[13px] font-semibold text-th-text">새 키 생성</h3>
        </div>
        <p className="text-[11px] text-slate-500">처음 사용 시 키를 생성하고 안전한 곳에 보관하세요.</p>
        <div className="flex gap-2">
          <input readOnly value={inputKey}
            placeholder="생성 버튼을 누르면 키가 만들어집니다"
            className="flex-1 px-3 py-2 text-[11px] bg-th-muted border border-th-border rounded-lg text-th-text-sec font-mono placeholder:text-slate-600 focus:outline-none" />
          <button onClick={generateKey}
            className="px-3 py-2 text-[12px] font-medium text-th-text bg-th-input hover:bg-th-input border border-th-border rounded-lg flex items-center gap-1.5 transition-colors flex-shrink-0">
            <RefreshCw size={12} /> 생성
          </button>
        </div>
        {inputKey && (
          <button onClick={() => applyKey(inputKey)}
            className="w-full py-2 text-[13px] font-semibold text-th-text bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors">
            이 키로 적용하기
          </button>
        )}
      </div>

      {/* 기존 키 입력 */}
      <div className="rounded-2xl bg-th-card border border-th-border p-5 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <CloudDownload size={13} className="text-blue-400" />
          <h3 className="text-[13px] font-semibold text-th-text">기존 키 입력</h3>
        </div>
        <p className="text-[11px] text-slate-500">다른 기기에서 사용하던 키를 입력하면 해당 데이터를 불러옵니다.</p>
        <div className="flex gap-2">
          <input id="existing-key"
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            className="flex-1 px-3 py-2 text-[11px] bg-th-muted border border-th-border rounded-lg text-th-text-sec font-mono placeholder:text-slate-600 focus:outline-none focus:border-blue-500/60" />
          <button onClick={() => {
            const v = (document.getElementById('existing-key') as HTMLInputElement)?.value;
            if (v) applyKey(v);
          }}
            className="px-3 py-2 text-[12px] font-medium text-th-text bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-lg flex items-center gap-1.5 transition-colors flex-shrink-0">
            <CloudDownload size={12} /> 불러오기
          </button>
        </div>
        {loadStatus === 'loading' && <p className="text-[11px] text-blue-400 animate-pulse">클라우드에서 데이터 불러오는 중...</p>}
        {loadStatus === 'ok' && <p className="text-[11px] text-emerald-400">✓ 데이터를 성공적으로 불러왔습니다</p>}
        {loadStatus === 'not_found' && <p className="text-[11px] text-amber-400">이 키로 저장된 데이터가 없습니다 (신규 키로 시작됩니다)</p>}
        {loadStatus === 'error' && <p className="text-[11px] text-red-400">오류가 발생했습니다. KV 환경변수를 확인하세요.</p>}
      </div>
    </div>
  );
}
