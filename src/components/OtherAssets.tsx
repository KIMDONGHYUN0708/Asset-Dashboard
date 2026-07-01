'use client';
import { useAssetStore } from '@/lib/store';
import { formatKRWFull, formatKRW } from '@/lib/utils';
import { PhysicalAssetCategory } from '@/lib/types';
import { Home, Car, Package, Disc3, Watch, Box, TrendingDown, TrendingUp } from 'lucide-react';

const CATEGORY_CONFIG: Record<PhysicalAssetCategory, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  car:      { label: '자동차',      icon: Car,     color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/20' },
  sneakers: { label: '운동화·리셀', icon: Package, color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' },
  lp:       { label: 'LP·레코드',  icon: Disc3,   color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
  watch:    { label: '시계·명품',  icon: Watch,   color: 'text-amber-400',  bg: 'bg-amber-500/10 border-amber-500/20' },
  etc:      { label: '기타 실물',  icon: Box,     color: 'text-slate-400',  bg: 'bg-slate-700/50 border-slate-600/30' },
};

export default function OtherAssets() {
  const { physicalAssets, depositAmount } = useAssetStore();

  return (
    <div className="rounded-2xl bg-slate-900 border border-white/[0.06] p-6">
      <h2 className="text-[13px] font-semibold text-white mb-4">기타 자산</h2>
      <div className="space-y-2.5">
        {/* 전세 보증금 */}
        <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-slate-800/40 border border-white/[0.04]">
          <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center flex-shrink-0">
            <Home size={15} className="text-teal-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-medium text-slate-200">전세 보증금</p>
            <p className="text-[10px] text-slate-600 mt-0.5">계좌 외 보유 현금 자산</p>
          </div>
          <p className="text-[13px] font-semibold text-white tabular-nums">{formatKRWFull(depositAmount)}</p>
        </div>

        {/* 실물 자산 목록 */}
        {physicalAssets.map((asset) => {
          const config = CATEGORY_CONFIG[asset.category] ?? CATEGORY_CONFIG.etc;
          const Icon = config.icon;
          const isGain = asset.currentValue >= asset.purchasePrice;
          const diffPct = asset.purchasePrice > 0
            ? ((asset.currentValue - asset.purchasePrice) / asset.purchasePrice * 100)
            : 0;
          const retainPct = asset.purchasePrice > 0
            ? Math.min((asset.currentValue / asset.purchasePrice) * 100, 100)
            : 0;

          return (
            <div key={asset.id} className="px-3 py-3 rounded-xl bg-slate-800/40 border border-white/[0.04]">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg border flex items-center justify-center flex-shrink-0 ${config.bg}`}>
                  <Icon size={15} className={config.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium text-slate-200">
                    {asset.name}
                    {asset.year && asset.category === 'car' && (
                      <span className="text-slate-600 font-normal ml-1">({asset.year}년식)</span>
                    )}
                  </p>
                  <p className="text-[10px] text-slate-600 mt-0.5">
                    {config.label} · 구입 {formatKRW(asset.purchasePrice)}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-[13px] font-semibold text-white tabular-nums">{formatKRWFull(asset.currentValue)}</p>
                  {asset.purchasePrice > 0 && (
                    <p className={`text-[10px] flex items-center justify-end gap-0.5 mt-0.5 ${isGain ? 'text-emerald-400' : 'text-red-400'}`}>
                      {isGain ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                      {isGain ? '+' : ''}{diffPct.toFixed(1)}%
                    </p>
                  )}
                </div>
              </div>

              {/* 가치 바 */}
              {asset.purchasePrice > 0 && (
                <div className="mt-3 space-y-1">
                  <div className="h-1 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isGain
                          ? 'bg-gradient-to-r from-emerald-600 to-emerald-400'
                          : 'bg-gradient-to-r from-slate-500 to-slate-400'
                      }`}
                      style={{ width: `${retainPct}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-600">
                    <span>{isGain ? '수익' : '잔존가치'} {retainPct.toFixed(0)}%</span>
                    <span>{formatKRW(asset.currentValue)}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
