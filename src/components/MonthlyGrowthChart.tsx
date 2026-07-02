'use client';
import { useState, useMemo } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import { useAssetStore } from '@/lib/store';
import { formatKRW } from '@/lib/utils';
import { Save } from 'lucide-react';
import { MonthlySnapshot, DailySnapshot } from '@/lib/types';
import SnapshotDetailPanel from './SnapshotDetailPanel';

const PERIODS = [
  { label: '3M', count: 3 },
  { label: '6M', count: 6 },
  { label: '1Y', count: 12 },
  { label: 'ALL', count: 999 },
];

const DAILY_PERIODS = [
  { label: '7일', days: 7 },
  { label: '30일', days: 30 },
  { label: '90일', days: 90 },
];

const UNITS = [
  { label: '만', divisor: 10_000 },
  { label: '억', divisor: 100_000_000 },
];

function nextMonth(yyyyMm: string): string {
  const [y, m] = yyyyMm.split('-').map(Number);
  const nm = m === 12 ? 1 : m + 1;
  const ny = m === 12 ? y + 1 : y;
  return `${ny}-${String(nm).padStart(2, '0')}`;
}

const formatMonth = (date: string) => {
  const [y, m] = date.split('-');
  return `${y.slice(2)}.${m}`;
};

/** YYYY-MM-DD 형식으로 오늘 날짜 반환 (로컬 타임존 기준) */
function getTodayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** 일별 차트 포인트 — forward-fill 포함 */
type DailyPoint = {
  dateStr: string;
  dateLabel: string;
  rawTotal: number;
  total: number;
  captured: boolean;
  delta: number;
  realVal: number | null;  // 실측 Series (+ 전환 bridge)
  fillVal: number | null;  // 추정 Series (+ 전환 bridge)
};

function buildDailyPoints(dailyHistory: DailySnapshot[], days: number, divisor: number): DailyPoint[] {
  const histMap = new Map(dailyHistory.map((h) => [h.date, h.total]));

  // 범위 시작일 이전의 마지막 알려진 값 찾기 (forward-fill 시작점)
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - (days - 1));
  const startStr = `${startDate.getFullYear()}-${String(startDate.getMonth()+1).padStart(2,'0')}-${String(startDate.getDate()).padStart(2,'0')}`;

  let lastKnown = 0;
  for (const h of dailyHistory) {
    if (h.date < startStr) lastKnown = h.total;
  }

  const raw: { dateStr: string; total: number; captured: boolean }[] = [];
  const today = getTodayStr();

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    if (dateStr > today) continue;

    if (histMap.has(dateStr)) {
      lastKnown = histMap.get(dateStr)!;
      raw.push({ dateStr, total: lastKnown, captured: true });
    } else if (lastKnown > 0) {
      raw.push({ dateStr, total: lastKnown, captured: false });
    }
  }

  return raw.map((p, i) => {
    const prevFill = i > 0 && !raw[i - 1].captured;
    const nextFill = i + 1 < raw.length && !raw[i + 1].captured;
    const isBridge = p.captured && (prevFill || nextFill);

    const prevCapIdx = raw.slice(0, i).findLastIndex((r) => r.captured);
    const delta = p.captured && prevCapIdx >= 0 ? p.total - raw[prevCapIdx].total : 0;

    const [, mm, dd] = p.dateStr.split('-');
    const dateLabel = `${parseInt(mm)}/${parseInt(dd)}`;

    const tv = +(p.total / divisor).toFixed(2);
    return {
      dateStr: p.dateStr,
      dateLabel,
      rawTotal: p.total,
      total: tv,
      captured: p.captured,
      delta,
      realVal: p.captured ? tv : null,
      fillVal: !p.captured ? tv : (isBridge ? tv : null),
    };
  });
}

/* ── Tooltip ── */
const CustomTooltip = ({ active, payload, label, unit, viewMode }: any) => {
  if (!active || !payload?.length) return null;
  const item = payload.find((p: any) => p.value != null) ?? payload[0];
  const v = Number(item?.value ?? 0);
  const raw = v * unit.divisor;
  const delta = item?.payload?.delta ?? 0;
  const isAnchor = item?.payload?.isAnchor;
  const isForwardFill = item?.payload?.isForwardFill;
  const captured = item?.payload?.captured;

  const isDailyFill = viewMode === 'daily' && captured === false;

  return (
    <div className="px-3 py-2.5 rounded-xl bg-th-muted border border-th-border shadow-xl min-w-[140px]">
      <p className="text-[10px] text-slate-500 mb-1.5 flex items-center gap-1.5">
        {label}
        {isAnchor && <span className="text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded text-[9px]">기준점</span>}
        {(isForwardFill || isDailyFill) && (
          <span className="text-slate-500 bg-th-input px-1.5 py-0.5 rounded text-[9px]">추정</span>
        )}
      </p>
      <p className="text-sm font-bold text-th-text tabular-nums">{formatKRW(raw)}</p>
      {delta !== 0 && !isForwardFill && !isDailyFill && (
        <p className={`text-[11px] font-medium mt-0.5 tabular-nums ${delta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          {delta >= 0 ? '▲ +' : '▼ '}{formatKRW(delta)}
        </p>
      )}
      {isDailyFill && (
        <p className="text-[10px] text-slate-500 mt-0.5">접속 기록 없음 — 직전 값 유지</p>
      )}
      {item?.payload?.note && (
        <p className="text-[10px] text-slate-500 mt-1 italic">{item.payload.note}</p>
      )}
    </div>
  );
};

type ChartPoint = {
  date: string;
  total: number;
  isAnchor?: boolean;
  isForwardFill?: boolean;
  note?: string;
};

export default function MonthlyGrowthChart() {
  const history = useAssetStore((s) => s.history);
  const annualSnapshots = useAssetStore((s) => s.annualSnapshots ?? []);
  const dailyHistory = useAssetStore((s) => s.dailyHistory ?? []);
  const saveSnapshot = useAssetStore((s) => s.saveSnapshot);
  const [periodIdx, setPeriodIdx] = useState(3);
  const [unitIdx, setUnitIdx] = useState(1);
  const [viewMode, setViewMode] = useState<'monthly' | 'daily' | 'yearly'>('monthly');
  const [dailyPeriodIdx, setDailyPeriodIdx] = useState(1); // 기본 30일
  const [saved, setSaved] = useState(false);
  const [selectedSnap, setSelectedSnap] = useState<MonthlySnapshot | null>(null);
  const [prevSnap, setPrevSnap] = useState<MonthlySnapshot | null>(null);

  const handleSave = () => {
    saveSnapshot();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const period = PERIODS[periodIdx];
  const unit = UNITS[unitIdx];

  /* ── 월별 forward-fill (기존 로직) ── */
  const filledPoints = useMemo((): ChartPoint[] => {
    if (annualSnapshots.length === 0) return [];
    const sorted = [...annualSnapshots].sort((a, b) => a.date.localeCompare(b.date));
    const monthlyDates = new Set(history.map((h) => h.date));
    const result: ChartPoint[] = [];
    for (let i = 0; i < sorted.length; i++) {
      const cur = sorted[i];
      const nextAnchorDate = sorted[i + 1]?.date ?? null;
      if (!monthlyDates.has(cur.date)) {
        result.push({ date: cur.date, total: cur.total, isAnchor: true, note: cur.note });
      }
      let d = nextMonth(cur.date);
      const stopAt = nextAnchorDate ?? history[0]?.date ?? null;
      while (stopAt && d < stopAt) {
        if (!monthlyDates.has(d)) {
          result.push({ date: d, total: cur.total, isForwardFill: true });
        }
        d = nextMonth(d);
      }
    }
    return result;
  }, [annualSnapshots, history]);

  const merged = useMemo((): ChartPoint[] => {
    return [...filledPoints, ...history.map((h): ChartPoint => ({ date: h.date, total: h.total }))]
      .reduce<ChartPoint[]>((acc, p) => {
        const existsHistory = history.some((h) => h.date === p.date);
        if (existsHistory && (p.isAnchor || p.isForwardFill)) return acc;
        acc.push(p);
        return acc;
      }, [])
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [filledPoints, history]);

  const sliced = useMemo(() => {
    if (period.count >= 999) return merged;
    return merged.slice(-period.count);
  }, [merged, periodIdx]);

  const monthlyData = sliced.map((h, i) => {
    const prev = sliced[i - 1];
    const delta = prev ? h.total - prev.total : 0;
    return {
      ...h,
      dateLabel: formatMonth(h.date),
      rawTotal: h.total,
      total: +(h.total / unit.divisor).toFixed(2),
      delta,
    };
  });

  /* ── 연도별 차트 데이터 ── */
  const yearlyData = useMemo(() => {
    const years = [...new Set(history.map((h) => h.date.slice(0, 4)))];
    const byYear: Record<string, MonthlySnapshot> = {};
    years.forEach((year) => {
      const yearSnaps = history.filter((h) => h.date.startsWith(year));
      const july = yearSnaps.find((h) => h.date === `${year}-07`);
      if (july) { byYear[year] = july; return; }
      byYear[year] = yearSnaps.reduce((best, h) => {
        const bestDiff = Math.abs(parseInt(best.date.slice(5, 7)) - 7);
        const curDiff = Math.abs(parseInt(h.date.slice(5, 7)) - 7);
        return curDiff < bestDiff ? h : best;
      });
    });
    const sorted = Object.entries(byYear).sort(([a], [b]) => a.localeCompare(b));
    return sorted.map(([year, snap], i) => {
      const prevSnap = sorted[i - 1]?.[1];
      const delta = prevSnap ? snap.total - prevSnap.total : 0;
      const deltaPct = prevSnap && prevSnap.total > 0
        ? ((snap.total - prevSnap.total) / prevSnap.total) * 100 : 0;
      return {
        ...snap,
        year,
        dateLabel: `${year}년`,
        rawTotal: snap.total,
        total: +(snap.total / unit.divisor).toFixed(2),
        delta,
        deltaPct,
        isUp: delta >= 0,
      };
    });
  }, [history, unitIdx]);

  /* ── 일별 차트 데이터 ── */
  const dailyData = useMemo((): DailyPoint[] => {
    const days = DAILY_PERIODS[dailyPeriodIdx].days;
    return buildDailyPoints(dailyHistory, days, unit.divisor);
  }, [dailyHistory, dailyPeriodIdx, unitIdx]);

  /* ── 공통 y축 계산 ── */
  const activeData = viewMode === 'yearly' ? yearlyData : viewMode === 'daily' ? dailyData : monthlyData;
  const minVal = Math.min(...activeData.map((d) => d.total));
  const maxVal = Math.max(...activeData.map((d) => d.total));
  const yPad = (maxVal - minVal) * 0.15 || maxVal * 0.1;
  const yMin = Math.floor((minVal - yPad) * 10) / 10;
  const yMax = Math.ceil((maxVal + yPad) * 10) / 10;

  const startTotal = activeData[0]?.rawTotal ?? 0;
  const endTotal = activeData[activeData.length - 1]?.rawTotal ?? 0;
  const totalGrowth = endTotal - startTotal;
  const totalGrowthPct = startTotal > 0 ? ((totalGrowth / startTotal) * 100).toFixed(1) : '0.0';
  const isUp = totalGrowth >= 0;

  const tickFormatter = (v: number) =>
    unitIdx === 1 ? `${v.toFixed(1)}억` : `${Math.round(v)}만`;

  /* ── 일별 x축 tick 간격 ── */
  const dailyTickInterval = useMemo(() => {
    const days = DAILY_PERIODS[dailyPeriodIdx].days;
    if (days <= 7) return 0;
    if (days <= 30) return 4;
    return 13;
  }, [dailyPeriodIdx]);

  /* ── 클릭 핸들러 (월별 / 연도별) ── */
  const handleChartClick = (chartData: any) => {
    const label = chartData?.activeLabel;
    if (!label) { setSelectedSnap(null); setPrevSnap(null); return; }

    if (viewMode === 'yearly') {
      const item = yearlyData.find((d) => d.dateLabel === label);
      if (!item) { setSelectedSnap(null); setPrevSnap(null); return; }
      const snap = history.find((h) => h.date === item.date) ?? null;
      if (snap && snap !== selectedSnap) {
        setSelectedSnap(snap);
        const idx = yearlyData.findIndex((d) => d.dateLabel === label);
        const prevItem = idx > 0 ? yearlyData[idx - 1] : null;
        setPrevSnap(prevItem ? (history.find((h) => h.date === prevItem.date) ?? null) : null);
      } else {
        setSelectedSnap(null); setPrevSnap(null);
      }
    } else if (viewMode === 'monthly') {
      const snapIdx = history.findIndex((h) => formatMonth(h.date) === label);
      const snap = snapIdx >= 0 ? history[snapIdx] : null;
      if (snap && snap !== selectedSnap) {
        setSelectedSnap(snap);
        setPrevSnap(snapIdx > 0 ? history[snapIdx - 1] : null);
      } else {
        setSelectedSnap(null); setPrevSnap(null);
      }
    }
  };

  const switchView = (mode: 'monthly' | 'daily' | 'yearly') => {
    setViewMode(mode);
    setSelectedSnap(null);
    setPrevSnap(null);
  };

  return (
    <div className="rounded-2xl bg-th-card border border-th-border p-6">
      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-4 flex-wrap gap-2">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-[13px] font-semibold text-th-text">
              {viewMode === 'daily' ? '일별' : viewMode === 'yearly' ? '연도별' : '월별'} 자산 추이
            </h2>
            {viewMode === 'monthly' && (
              <span className="text-[10px] text-slate-500">{history.length}개월 기록</span>
            )}
            {viewMode === 'daily' && (
              <span className="text-[10px] text-slate-500">
                {dailyHistory.length}일 기록 · 미접속일은 직전 값으로 표시
              </span>
            )}
            {viewMode === 'monthly' && annualSnapshots.length > 0 && (
              <span className="text-[10px] text-amber-500/80 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-full">
                +{annualSnapshots.length}개 기준점
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[11px] text-slate-500">
              {activeData[0]?.dateLabel} – {activeData[activeData.length - 1]?.dateLabel}
            </span>
            {totalGrowth !== 0 && (
              <span className={`text-[11px] font-semibold ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
                {isUp ? '+' : ''}{formatKRW(totalGrowth)} ({isUp ? '+' : ''}{totalGrowthPct}%)
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* 단위 토글 */}
          <div className="flex bg-th-muted/80 rounded-lg p-0.5 gap-0.5">
            {UNITS.map((u, i) => (
              <button key={u.label} onClick={() => setUnitIdx(i)}
                className={`px-2 py-1 text-[11px] rounded-md font-medium transition-all ${
                  unitIdx === i ? 'bg-th-input text-th-text shadow-sm' : 'text-slate-500 hover:text-th-text-sec'
                }`}>
                {u.label}
              </button>
            ))}
          </div>

          {/* 뷰 모드 토글 */}
          <div className="flex bg-th-muted/80 rounded-lg p-0.5 gap-0.5">
            <button onClick={() => switchView('monthly')}
              className={`px-2 py-1 text-[11px] rounded-md font-medium transition-all ${
                viewMode === 'monthly' ? 'bg-th-input text-th-text shadow-sm' : 'text-slate-500 hover:text-th-text-sec'
              }`}>
              월별
            </button>
            <button onClick={() => switchView('daily')}
              className={`px-2 py-1 text-[11px] rounded-md font-medium transition-all ${
                viewMode === 'daily' ? 'bg-blue-500 text-white shadow-sm' : 'text-slate-500 hover:text-th-text-sec'
              }`}>
              일별
            </button>
            <button
              onClick={() => { if (yearlyData.length >= 2) switchView('yearly'); }}
              disabled={yearlyData.length < 2}
              title={yearlyData.length < 2 ? '비교할 연도 데이터가 부족합니다' : undefined}
              className={`px-2 py-1 text-[11px] rounded-md font-medium transition-all ${
                yearlyData.length < 2
                  ? 'text-slate-700 cursor-not-allowed'
                  : viewMode === 'yearly'
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'text-slate-500 hover:text-th-text-sec'
              }`}>
              연도별
            </button>
          </div>

          {/* 기간 필터 */}
          {viewMode === 'monthly' && (
            <div className="flex bg-th-muted/80 rounded-lg p-0.5 gap-0.5">
              {PERIODS.map((p, i) => (
                <button key={p.label} onClick={() => setPeriodIdx(i)}
                  className={`px-2 py-1 text-[11px] rounded-md font-medium transition-all ${
                    periodIdx === i ? 'bg-blue-500 text-white shadow-sm' : 'text-slate-500 hover:text-th-text-sec'
                  }`}>
                  {p.label}
                </button>
              ))}
            </div>
          )}
          {viewMode === 'daily' && (
            <div className="flex bg-th-muted/80 rounded-lg p-0.5 gap-0.5">
              {DAILY_PERIODS.map((p, i) => (
                <button key={p.label} onClick={() => setDailyPeriodIdx(i)}
                  className={`px-2 py-1 text-[11px] rounded-md font-medium transition-all ${
                    dailyPeriodIdx === i ? 'bg-blue-500 text-white shadow-sm' : 'text-slate-500 hover:text-th-text-sec'
                  }`}>
                  {p.label}
                </button>
              ))}
            </div>
          )}

          {/* 월별 저장 버튼 (일별은 자동 저장) */}
          {viewMode !== 'daily' && (
            <button onClick={handleSave}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all ${
                saved
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                  : 'bg-th-muted border-th-border text-slate-400 hover:text-th-text hover:border-white/10'
              }`}>
              <Save size={11} />
              {saved ? '저장됨' : '지금 저장'}
            </button>
          )}
        </div>
      </div>

      {/* ── 연도별 차트 ── */}
      {viewMode === 'yearly' ? (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart
            data={yearlyData}
            margin={{ top: 4, right: 4, left: 4, bottom: 0 }}
            onClick={handleChartClick}
            style={{ cursor: 'pointer' }}
          >
            <CartesianGrid strokeDasharray="2 4" stroke="rgba(100,116,139,0.1)" vertical={false} />
            <XAxis dataKey="dateLabel" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis domain={[yMin, yMax]} tickFormatter={tickFormatter} tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} width={48} />
            <Tooltip content={(props: any) => <CustomTooltip {...props} unit={unit} viewMode={viewMode} />} cursor={{ fill: 'rgba(100,116,139,0.05)' }} />
            <Bar dataKey="total" radius={[4, 4, 0, 0]} maxBarSize={64}>
              {yearlyData.map((entry, index) => (
                <Cell key={`cell-${index}`}
                  fill={selectedSnap?.date === entry.date ? '#3b82f6' : entry.isUp ? '#22c55e' : '#ef4444'}
                  fillOpacity={selectedSnap?.date === entry.date ? 1 : 0.65}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

      ) : viewMode === 'daily' ? (
        /* ── 일별 차트 ── */
        dailyData.length < 2 ? (
          <div className="h-[220px] flex flex-col items-center justify-center gap-2">
            <p className="text-[13px] text-slate-500">아직 일별 데이터가 부족합니다</p>
            <p className="text-[11px] text-slate-600">앱을 매일 열면 자동으로 기록됩니다</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={dailyData} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
              <defs>
                <linearGradient id="gradDailyReal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.18} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradDailyFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#64748b" stopOpacity={0.1} />
                  <stop offset="100%" stopColor="#64748b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="2 4" stroke="rgba(100,116,139,0.1)" vertical={false} />
              <XAxis
                dataKey="dateLabel"
                tick={{ fill: '#64748b', fontSize: 10 }}
                axisLine={false} tickLine={false}
                interval={dailyTickInterval}
              />
              <YAxis
                domain={[yMin, yMax]}
                tickFormatter={tickFormatter}
                tick={{ fill: '#64748b', fontSize: 10 }}
                axisLine={false} tickLine={false}
                width={48}
              />
              <Tooltip
                content={(props: any) => <CustomTooltip {...props} unit={unit} viewMode={viewMode} />}
                cursor={{ stroke: 'rgba(100,116,139,0.2)', strokeWidth: 1, strokeDasharray: '3 3' }}
              />
              {/* 추정값(forward-fill) — 점선 회색 */}
              <Area
                type="linear"
                dataKey="fillVal"
                stroke="#94a3b8"
                strokeWidth={1.5}
                strokeDasharray="5 3"
                fill="url(#gradDailyFill)"
                dot={(props: any) => {
                  if (!props.payload?.captured) {
                    return (
                      <circle key={props.key}
                        cx={props.cx} cy={props.cy} r={2.5}
                        fill="none" stroke="#94a3b8" strokeWidth={1.5}
                      />
                    );
                  }
                  return <g key={props.key} />;
                }}
                activeDot={false}
                connectNulls={false}
                isAnimationActive={false}
              />
              {/* 실측값 — 실선 파란색 */}
              <Area
                type="linear"
                dataKey="realVal"
                stroke="#3b82f6"
                strokeWidth={2}
                fill="url(#gradDailyReal)"
                dot={(props: any) => {
                  if (props.payload?.captured) {
                    return (
                      <circle key={props.key}
                        cx={props.cx} cy={props.cy} r={3}
                        fill="#3b82f6" stroke="none"
                      />
                    );
                  }
                  return <g key={props.key} />;
                }}
                activeDot={{ r: 4, fill: '#3b82f6', stroke: '#1e3a5f', strokeWidth: 2 }}
                connectNulls={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )

      ) : (
        /* ── 월별 차트 ── */
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart
            data={monthlyData}
            margin={{ top: 4, right: 4, left: 4, bottom: 0 }}
            onClick={handleChartClick}
            style={{ cursor: 'pointer' }}
          >
            <defs>
              <linearGradient id="gradReal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#64748b" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#64748b" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="2 4" stroke="rgba(100,116,139,0.1)" vertical={false} />
            <XAxis dataKey="dateLabel" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis domain={[yMin, yMax]} tickFormatter={tickFormatter} tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} width={48} />
            <Tooltip content={(props: any) => <CustomTooltip {...props} unit={unit} viewMode={viewMode} />} cursor={{ stroke: 'rgba(100,116,139,0.1)', strokeWidth: 1, strokeDasharray: '3 3' }} />
            <Area
              type="stepAfter"
              dataKey={(d) => (d.isAnchor || d.isForwardFill) ? d.total : null}
              stroke="#64748b" strokeWidth={1.5} strokeDasharray="4 3"
              fill="url(#gradFill)"
              dot={(props: any) => {
                if (!props.payload?.isAnchor) return <g key={props.key} />;
                return <circle key={props.key} cx={props.cx} cy={props.cy} r={4} fill="#f59e0b" stroke="#1e293b" strokeWidth={2} />;
              }}
              activeDot={false} connectNulls={false} isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey={(d) => (!d.isAnchor && !d.isForwardFill) ? d.total : null}
              stroke="#3b82f6" strokeWidth={2} fill="url(#gradReal)"
              dot={false}
              activeDot={{ r: 4, fill: '#3b82f6', stroke: '#1e3a5f', strokeWidth: 2 }}
              connectNulls={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}

      {/* ── 범례 ── */}
      <div className="mt-3 flex items-center gap-4 text-[10px] text-slate-500 flex-wrap">
        {viewMode === 'daily' ? (
          <>
            <span className="flex items-center gap-1.5">
              <span className="w-3 border-t-2 border-blue-500 inline-block" />
              <span>실측 (접속일 기록)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 border-t border-dashed border-slate-400 inline-block" />
              <span>추정 (미접속일 — 직전 값 유지)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <circle className="inline-block" r={3} cx={4} cy={4} fill="none" stroke="#94a3b8" strokeWidth={1.5} />
              <svg width="8" height="8" className="inline-block -mt-0.5">
                <circle cx="4" cy="4" r="3" fill="none" stroke="#94a3b8" strokeWidth="1.5"/>
              </svg>
              <span>빈 원 = 추정일</span>
            </span>
          </>
        ) : viewMode === 'monthly' ? (
          <>
            <span className="flex items-center gap-1.5">
              <span className="w-3 border-t-2 border-blue-500 inline-block" />
              <span>실측 (월별 스냅샷)</span>
            </span>
            {annualSnapshots.length > 0 && (
              <>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 border-t border-dashed border-slate-500 inline-block" />
                  <span>추정 (기준점 fill-forward)</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                  <span className="text-amber-400/80">기준점 입력</span>
                </span>
              </>
            )}
          </>
        ) : (
          <>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500/60 inline-block" />
              <span>자산 증가</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-red-500/60 inline-block" />
              <span>자산 감소</span>
            </span>
            <span className="text-slate-600">7월 기준 연간 스냅샷</span>
          </>
        )}
        {viewMode !== 'daily' && history.length > 0 && (
          <span className="ml-auto text-slate-600">그래프를 클릭해 시점 상세 보기</span>
        )}
      </div>

      {/* ── 스냅샷 상세 패널 ── */}
      {selectedSnap && (
        <div className="-mx-6 -mb-6 mt-3">
          <SnapshotDetailPanel
            snapshot={selectedSnap}
            prevSnapshot={prevSnap}
            onClose={() => { setSelectedSnap(null); setPrevSnap(null); }}
          />
        </div>
      )}
    </div>
  );
}
