'use client';
import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Wallet, Landmark, TrendingUp, Package, Shield, History, Key, CheckCircle2, ArrowRight, RotateCcw } from 'lucide-react';
import { useAssetStore } from '@/lib/store';
import CashSettings from '@/components/settings/CashSettings';
import AccountSettings from '@/components/settings/AccountSettings';
import InvestmentSettings from '@/components/settings/InvestmentSettings';
import PhysicalAssetSettings from '@/components/settings/PhysicalAssetSettings';
import PensionInsuranceSettings from '@/components/settings/PensionInsuranceSettings';
import AnnualSnapshotSettings from '@/components/settings/AnnualSnapshotSettings';
import DataKeySetupPanel from '@/components/DataKeySetupPanel';

const TABS = [
  { key: 'cash',    label: '현금·보증금',   icon: Wallet },
  { key: 'account', label: '계좌·적금·대출', icon: Landmark },
  { key: 'invest',  label: '투자 자산',       icon: TrendingUp },
  { key: 'physical', label: '실물 자산',        icon: Package },
  { key: 'pension', label: '연금·보험',       icon: Shield },
  { key: 'history', label: '연도별 기록',     icon: History },
  { key: 'sync',    label: '데이터 동기화',   icon: Key },
] as const;
type TabKey = typeof TABS[number]['key'];

function SettingsContent() {
  const router        = useRouter();
  const searchParams  = useSearchParams();
  const isOnboarding  = searchParams.get('onboarding') === '1';

  const { isOnboarded, setOnboarded, cash, accounts, investments, physicalAssets, depositAmount } = useAssetStore();
  const hasData = cash > 0 || accounts.length > 0 || investments.length > 0 || physicalAssets.length > 0 || depositAmount > 0;

  const [tab, setTab] = useState<TabKey>('cash');

  const handleComplete = () => {
    setOnboarded(true);
    router.push('/');
  };

  return (
    <div className="p-6 max-w-[1100px] mx-auto space-y-5">
      {/* 온보딩 배너 */}
      {isOnboarding && !isOnboarded && (
        <div className="rounded-2xl bg-blue-500/10 border border-blue-500/30 p-5">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
              <CheckCircle2 size={18} className="text-blue-400" />
            </div>
            <div className="flex-1">
              <h2 className="text-[14px] font-bold text-white mb-1">처음 오셨군요! 자산 데이터를 입력해주세요</h2>
              <p className="text-[12px] text-slate-400 leading-relaxed">
                아래 탭에서 현금, 계좌, 투자 자산 등 실제 보유 자산을 입력하면 대시보드가 활성화됩니다.
                <br />
                입력한 데이터는 암호화되어 클라우드에 저장되며, 언제든 수정할 수 있습니다.
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-500">
                <span className={`px-2 py-1 rounded-lg border ${cash > 0 || depositAmount > 0 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-slate-800 border-slate-700'}`}>
                  {cash > 0 || depositAmount > 0 ? '✓' : '○'} 현금·보증금
                </span>
                <span className={`px-2 py-1 rounded-lg border ${accounts.length > 0 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-slate-800 border-slate-700'}`}>
                  {accounts.length > 0 ? '✓' : '○'} 계좌·적금
                </span>
                <span className={`px-2 py-1 rounded-lg border ${investments.length > 0 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-slate-800 border-slate-700'}`}>
                  {investments.length > 0 ? '✓' : '○'} 투자 자산
                </span>
                <span className={`px-2 py-1 rounded-lg border ${physicalAssets.length > 0 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-slate-800 border-slate-700'}`}>
                  {physicalAssets.length > 0 ? '✓' : '○'} 실물 자산 (선택)
                </span>
              </div>
            </div>
            {hasData && (
              <button
                onClick={handleComplete}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-[13px] font-semibold rounded-xl transition-colors flex-shrink-0 mt-0.5"
              >
                대시보드로 이동 <ArrowRight size={14} />
              </button>
            )}
          </div>
        </div>
      )}

      <div>
        <h1 className="text-xl font-bold text-white">자산 입력 · 수정</h1>
        <p className="text-sm text-slate-500 mt-0.5">실제 보유 자산을 입력하세요. 저장 즉시 대시보드에 반영됩니다.</p>
      </div>

      {/* 탭 */}
      <div className="flex flex-wrap gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1 w-fit">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              tab === key
                ? 'bg-blue-500 text-white shadow'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {/* 탭 컨텐츠 */}
      <div>
        {tab === 'cash'    && <CashSettings />}
        {tab === 'account' && <AccountSettings />}
        {tab === 'invest'  && <InvestmentSettings />}
        {tab === 'physical' && <PhysicalAssetSettings />}
        {tab === 'pension' && <PensionInsuranceSettings />}
        {tab === 'history' && <AnnualSnapshotSettings />}
        {tab === 'sync'    && <DataKeySetupPanel />}
      </div>

      {/* 온보딩 하단 완료 버튼 */}
      {isOnboarding && !isOnboarded && hasData && (
        <div className="sticky bottom-4">
          <button
            onClick={handleComplete}
            className="w-full py-3.5 bg-blue-500 hover:bg-blue-600 text-white text-[14px] font-bold rounded-2xl transition-colors shadow-xl shadow-blue-500/20 flex items-center justify-center gap-2"
          >
            <CheckCircle2 size={16} />
            설정 완료 — 대시보드로 이동
          </button>
        </div>
      )}

      {/* 데이터 초기화 */}
      <div className="border-t border-slate-800/60 pt-5 mt-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">데이터 초기화</p>
            <p className="text-xs text-slate-700 mt-0.5">모든 자산 데이터와 동기화 키를 삭제하고 처음 상태로 돌아갑니다.</p>
          </div>
          <button
            onClick={() => {
              if (window.confirm('모든 자산 데이터가 영구 삭제됩니다.\n정말 초기화하시겠습니까?')) {
                localStorage.removeItem('asset-dashboard-store');
                localStorage.removeItem('asd-uuid');
                window.location.href = '/';
              }
            }}
            className="flex items-center gap-1.5 px-3 py-2 bg-red-500/10 border border-red-500/20 text-red-500/70 text-sm rounded-lg hover:bg-red-500/20 hover:text-red-400 transition-colors flex-shrink-0 ml-6"
          >
            <RotateCcw size={13} />
            초기화
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense>
      <SettingsContent />
    </Suspense>
  );
}
