'use client';
import { useAssetStore } from '@/lib/store';
import { formatKRWFull, formatKRW } from '@/lib/utils';
import { Home, Car, TrendingDown } from 'lucide-react';

export default function OtherAssets() {
  const { cars, depositAmount } = useAssetStore();

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

        {/* 자동차 */}
        {cars.map((car) => {
          const depreciation = car.purchasePrice - car.currentValue;
          const depreciationPct = ((depreciation / car.purchasePrice) * 100).toFixed(1);
          const retainPct = (car.currentValue / car.purchasePrice) * 100;
          return (
            <div key={car.id} className="px-3 py-3 rounded-xl bg-slate-800/40 border border-white/[0.04]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-700/50 border border-white/[0.06] flex items-center justify-center flex-shrink-0">
                  <Car size={15} className="text-slate-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium text-slate-200">{car.model}</p>
                  <p className="text-[10px] text-slate-600 mt-0.5">{car.year}년식 · 취득 {formatKRW(car.purchasePrice)}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-[13px] font-semibold text-white tabular-nums">{formatKRWFull(car.currentValue)}</p>
                  <p className="text-[10px] text-red-400 flex items-center justify-end gap-0.5 mt-0.5">
                    <TrendingDown size={10} />
                    {depreciationPct}% 감가
                  </p>
                </div>
              </div>
              {/* 잔존가치 바 */}
              <div className="mt-3 space-y-1">
                <div className="h-1 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-slate-500 to-slate-400 transition-all"
                    style={{ width: `${retainPct}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-600">
                  <span>잔존가치 {retainPct.toFixed(0)}%</span>
                  <span>{formatKRW(car.currentValue)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
