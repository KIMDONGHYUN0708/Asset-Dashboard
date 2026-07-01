'use client';
import { useState, useMemo, useRef, useEffect } from 'react';
import { useAssetStore } from '@/lib/store';
import { calcInvestmentStats, formatKRW, formatKRWFull, formatPercent } from '@/lib/utils';
import StockSectorChart from '@/components/StockSectorChart';
import StockPriceChart from '@/components/StockPriceChart';
import PortfolioPerformance from '@/components/PortfolioPerformance';
import PortfolioTrendChart from '@/components/PortfolioTrendChart';
import ErrorBoundary from '@/components/ErrorBoundary';
import CountryFlag from '@/components/CountryFlag';
import { TrendingUp, TrendingDown, Minus, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

type SortKey = 'name' | 'currentValue' | 'profit' | 'roi' | 'dailyChange';
type SortDir = 'asc' | 'desc';

const PERIODS: { label: string; months: number }[] = [
  { label: '1개월', months: 1 },
  { label: '3개월', months: 3 },
  { label: '6개월', months: 6 },
  { label: '1년', months: 12 },
  { label: '전체', months: 999 },
];

const TYPE_OPTS = ['전체', '주식', '가상자산', '금'];
const TYPE_MAP: Record<string, string> = { '주식': 'stock', '가상자산': 'crypto', '금': 'gold' };

export default function InvestmentsPage() {
  const { investments } = useAssetStore();
  const [typeFilter, setTypeFilter] = useState('전체');
  const [institutionFilter, setInstitutionFilter] = useState('전체');
  const [sectorFilter, setSectorFilter] = useState('전체');
  const [periodIdx, setPeriodIdx] = useState(4);
  const [selectedId, setSelectedId] = useState(investments[0]?.id ?? '');
  const [sortKey, setSortKey] = useState<SortKey>('currentValue');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const chartRef = useRef<HTMLDivElement>(null);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const institutions = ['전체', ...Array.from(new Set(investments.map(i => i.institution ?? '').filter(Boolean)))];
  const sectors = ['전체', ...Array.from(new Set(investments.map(i => i.sector ?? '').filter(Boolean)))];

  const filtered = useMemo(() => {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - PERIODS[periodIdx].months);
    return investments.filter(inv => {
      if (typeFilter !== '전체' && inv.type !== TYPE_MAP[typeFilter]) return false;
      if (institutionFilter !== '전체' && inv.institution !== institutionFilter) return false;
      if (sectorFilter !== '전체' && inv.sector !== sectorFilter) return false;
      if (PERIODS[periodIdx].months !== 999 && new Date(inv.purchaseDate) > cutoff) return false;
      return true;
    });
  }, [investments, typeFilter, institutionFilter, sectorFilter, periodIdx]);

  const sortedFiltered = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const { totalQty: aqty, totalInvested: ai } = calcInvestmentStats(a);
      const { totalQty: bqty, totalInvested: bi } = calcInvestmentStats(b);
      const aVal = a.currentPrice * aqty;
      const bVal = b.currentPrice * bqty;
      let diff = 0;
      if (sortKey === 'name') diff = a.name.localeCompare(b.name);
      else if (sortKey === 'currentValue') diff = aVal - bVal;
      else if (sortKey === 'profit') diff = (aVal - ai) - (bVal - bi);
      else if (sortKey === 'roi') diff = (ai > 0 ? (aVal - ai) / ai : 0) - (bi > 0 ? (bVal - bi) / bi : 0);
      else if (sortKey === 'dailyChange') diff = (a.dailyChangeRate ?? 0) - (b.dailyChangeRate ?? 0);
      return sortDir === 'asc' ? diff : -diff;
    });
  }, [filtered, sortKey, sortDir]);

  const filteredIds = useMemo(() => filtered.map(i => i.id), [filtered]);

  // 필터 변경 시 선택 종목을 필터 내 첫 번째로 자동 동기화
  useEffect(() => {
    if (filteredIds.length > 0 && !filteredIds.includes(selectedId)) {
      setSelectedId(filteredIds[0]);
    }
  }, [filteredIds]);

  return (
    <div className="p-6 space-y-5 max-w-[1400px] mx-auto">
      <div>
        <h1 className="text-xl font-bold text-white">재테크 분석</h1>
        <p className="text-sm text-slate-500 mt-0.5">주식 · 가상자산 · 금 보유 현황 및 수익률</p>
      </div>

      {/* 필터 바 */}
      <div className="flex flex-wrap gap-3 p-4 rounded-xl bg-slate-900 border border-slate-800">
        <FilterGroup label="구분" value={typeFilter} options={TYPE_OPTS} onChange={setTypeFilter} />
        <FilterGroup label="증권사" value={institutionFilter} options={institutions} onChange={setInstitutionFilter} />
        <FilterGroup label="섹터" value={sectorFilter} options={sectors} onChange={setSectorFilter} />
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs text-slate-500">기간</span>
          {PERIODS.map((p, i) => (
            <button key={p.label} onClick={() => setPeriodIdx(i)}
              className={`px-3 py-1 text-xs rounded-lg font-medium transition-colors ${
                periodIdx === i ? 'bg-blue-500 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* 투자 성과 요약 + 랭킹 */}
      <ErrorBoundary label="투자 성과">
        <PortfolioPerformance filteredIds={filteredIds} />
      </ErrorBoundary>

      {/* 재테크 자산 추이 */}
      <ErrorBoundary label="재테크 자산 추이">
        <PortfolioTrendChart filteredIds={filteredIds} />
      </ErrorBoundary>

      {/* 섹터 포트폴리오 스냅샷 */}
      <ErrorBoundary label="섹터 분석">
        <StockSectorChart filteredIds={filteredIds} />
      </ErrorBoundary>

      {/* 보유 종목 현황 + 차트 */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-5 items-start">
        {/* 종목 테이블 */}
        <div className="xl:col-span-3 rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800">
            <h2 className="text-[13px] font-semibold text-white">보유 종목 현황</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">{filtered.length}종목 · 클릭하면 차트 표시</p>
          </div>
          <div className="overflow-x-auto overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left text-[10px] text-slate-500 px-5 py-2.5 whitespace-nowrap font-medium uppercase tracking-wider">
                    <SortHeader label="종목" col="name" sortKey={sortKey} sortDir={sortDir} onSort={(k) => handleSort(k)} align="left" />
                  </th>
                  <th className="text-right text-[10px] text-slate-500 px-3 py-2.5 whitespace-nowrap font-medium uppercase tracking-wider">보유수량</th>
                  <th className="text-right text-[10px] text-slate-500 px-3 py-2.5 whitespace-nowrap font-medium uppercase tracking-wider">평균단가</th>
                  <th className="text-right text-[10px] text-slate-500 px-3 py-2.5 whitespace-nowrap font-medium uppercase tracking-wider">현재가</th>
                  <th className="text-right text-[10px] text-slate-500 px-3 py-2.5 whitespace-nowrap font-medium uppercase tracking-wider">
                    <SortHeader label="평가금액" col="currentValue" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} align="right" />
                  </th>
                  <th className="text-right text-[10px] text-slate-500 px-3 py-2.5 whitespace-nowrap font-medium uppercase tracking-wider">
                    <SortHeader label="수익" col="profit" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} align="right" />
                  </th>
                  <th className="text-right text-[10px] text-slate-500 pr-5 py-2.5 whitespace-nowrap font-medium uppercase tracking-wider">
                    <SortHeader label="일간" col="dailyChange" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} align="right" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-sm text-slate-600">
                      필터 조건에 맞는 종목이 없습니다
                    </td>
                  </tr>
                )}
                {sortedFiltered.map(inv => {
                  const { avgPrice, totalQty, totalInvested } = calcInvestmentStats(inv);
                  const currentValue = inv.currentPrice * totalQty;
                  const profit = currentValue - totalInvested;
                  const roi = totalInvested > 0 ? (profit / totalInvested) * 100 : 0;
                  const isSelected = selectedId === inv.id;
                  const isUp = profit >= 0;
                  return (
                    <tr key={inv.id} onClick={() => setSelectedId(inv.id)}
                      className={`border-b border-slate-800/40 cursor-pointer transition-colors ${
                        isSelected ? 'bg-blue-500/[0.06] border-l-2 border-l-blue-500' : 'hover:bg-slate-800/30'
                      }`}
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2 min-w-[140px]">
                          {inv.country && <CountryFlag country={inv.country} size={14} />}
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className={`text-[13px] font-semibold whitespace-nowrap ${isSelected ? 'text-white' : 'text-slate-200'}`}>
                                {inv.name}
                              </span>
                              <TypeBadge type={inv.type} />
                            </div>
                            {inv.ticker && <p className="text-[10px] text-slate-600 mt-0.5 whitespace-nowrap">{inv.ticker} · {inv.institution}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3.5 text-right">
                        <span className="text-[12px] text-slate-300 tabular-nums">{totalQty.toLocaleString()}</span>
                      </td>
                      <td className="px-3 py-3.5 text-right">
                        <span className="text-[12px] text-slate-400 tabular-nums">{formatKRWFull(Math.round(avgPrice))}</span>
                      </td>
                      <td className="px-3 py-3.5 text-right">
                        <div>
                          <span className="text-[12px] font-semibold text-white tabular-nums">{formatKRWFull(inv.currentPrice)}</span>
                          {inv.dailyChangeRate !== undefined && (
                            <p className={`text-[10px] tabular-nums ${(inv.dailyChangeRate ?? 0) >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                              {formatPercent(inv.dailyChangeRate)}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3.5 text-right">
                        <span className="text-[13px] font-bold text-white tabular-nums">{formatKRWFull(currentValue)}</span>
                      </td>
                      <td className="px-3 py-3.5 text-right">
                        <div>
                          <span className={`text-[12px] font-semibold tabular-nums ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
                            {isUp ? '+' : ''}{formatKRWFull(profit)}
                          </span>
                          <div className="flex items-center justify-end gap-1 mt-0.5">
                            {roi > 0.5 ? <TrendingUp size={10} className="text-emerald-500" />
                              : roi < -0.5 ? <TrendingDown size={10} className="text-red-500" />
                              : <Minus size={10} className="text-slate-500" />}
                            <span className={`text-[10px] font-semibold tabular-nums ${isUp ? 'text-emerald-500' : 'text-red-500'}`}>
                              {formatPercent(roi)}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="pr-5 px-3 py-3.5 text-right">
                        {inv.dailyChangeRate !== undefined ? (
                          <span className={`text-[12px] font-medium tabular-nums ${(inv.dailyChangeRate ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {inv.dailyChangeRate >= 0 ? '+' : ''}{formatKRWFull(Math.round(inv.currentPrice * totalQty * (inv.dailyChangeRate / 100)))}
                          </span>
                        ) : <span className="text-slate-600">-</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* 선택 종목 차트 */}
        <div className="xl:col-span-2" ref={chartRef}>
          <ErrorBoundary label="종목 차트">
            {selectedId
              ? <StockPriceChart selectedId={selectedId} />
              : (
                <div className="rounded-2xl bg-slate-900 border border-slate-800 p-8 flex items-center justify-center h-64">
                  <p className="text-sm text-slate-600">종목을 선택하면 차트가 표시됩니다</p>
                </div>
              )
            }
          </ErrorBoundary>
        </div>
      </div>

    </div>
  );
}

function FilterGroup({ label, value, options, onChange }: {
  label: string; value: string; options: string[]; onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-500">{label}</span>
      <div className="flex gap-1">
        {options.map(opt => (
          <button key={opt} onClick={() => onChange(opt)}
            className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors ${
              value === opt ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}>
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

const TYPE_STYLE: Record<string, string> = {
  stock: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  crypto: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  gold: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
};
const TYPE_LABEL: Record<string, string> = { stock: '주식', crypto: '가상자산', gold: '금' };

function TypeBadge({ type }: { type: string }) {
  return (
    <span className={`text-[9px] px-1 py-0.5 rounded border ${TYPE_STYLE[type] ?? ''}`}>
      {TYPE_LABEL[type] ?? type}
    </span>
  );
}

function SortHeader({ label, col, sortKey, sortDir, onSort, align }: {
  label: string; col: SortKey; sortKey: SortKey; sortDir: SortDir;
  onSort: (k: SortKey) => void; align?: 'left' | 'right';
}) {
  const active = sortKey === col;
  return (
    <button
      onClick={() => onSort(col)}
      className={`inline-flex items-center gap-1 font-medium uppercase tracking-wider transition-colors ${
        align === 'right' ? 'flex-row-reverse' : ''
      } ${active ? 'text-slate-300' : 'text-slate-500 hover:text-slate-400'}`}
    >
      {label}
      {active ? (
        sortDir === 'desc' ? <ChevronDown size={10} /> : <ChevronUp size={10} />
      ) : (
        <ChevronsUpDown size={10} className="opacity-40" />
      )}
    </button>
  );
}
