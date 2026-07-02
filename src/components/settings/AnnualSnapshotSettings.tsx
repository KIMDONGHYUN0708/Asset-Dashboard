'use client';
import { useState } from 'react';
import { useAssetStore } from '@/lib/store';
import { formatKRW } from '@/lib/utils';
import { Plus, Trash2, History, ChevronRight } from 'lucide-react';

const CUR_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 10 }, (_, i) => CUR_YEAR - 1 - i);
const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => i + 1);

function toDate(year: number, month: number) {
  return `${year}-${String(month).padStart(2, '0')}`;
}

function formatDisplayDate(date: string) {
  const [y, m] = date.split('-');
  return `${y}년 ${Number(m)}월`;
}

function Input({ ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full px-3 py-2 text-sm bg-th-input/60 border border-th-border/60 rounded-lg text-th-text placeholder:text-slate-600 focus:outline-none focus:border-blue-500/60"
    />
  );
}

export default function AnnualSnapshotSettings() {
  const annualSnapshots = useAssetStore((s) => s.annualSnapshots ?? []);
  const setAnnualSnapshot = useAssetStore((s) => s.setAnnualSnapshot);
  const removeAnnualSnapshot = useAssetStore((s) => s.removeAnnualSnapshot);

  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ year: CUR_YEAR - 1, month: 1, total: '', note: '' });

  const usedDates = new Set(annualSnapshots.map((s) => s.date));

  const handleAdd = () => {
    const total = Number(form.total);
    if (!total || total <= 0) return;
    setAnnualSnapshot({
      date: toDate(form.year, form.month),
      total,
      note: form.note || undefined,
    });
    setForm({ year: CUR_YEAR - 1, month: 1, total: '', note: '' });
    setAdding(false);
  };

  // 구간 계산: 각 스냅샷이 몇 월까지 유지되는지
  const sorted = [...annualSnapshots].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History size={14} className="text-blue-400" />
          <h2 className="text-[13px] font-semibold text-th-text">연도별 과거 자산 기록</h2>
        </div>
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-th-text bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors"
          >
            <Plus size={12} /> 기준점 추가
          </button>
        )}
      </div>

      <p className="text-[12px] text-slate-500 leading-relaxed">
        특정 월의 총자산을 입력하면, 그 이후 다음 기준점이 나타날 때까지 해당 값이 차트에 유지됩니다.
        <br />
        예) <span className="text-slate-400">2024년 1월 2억 입력</span> + <span className="text-slate-400">2025년 2월 3억 입력</span>
        → 2024-01 ~ 2025-01 구간은 2억으로 표시
      </p>

      {/* 입력 폼 */}
      {adding && (
        <div className="p-4 rounded-xl bg-th-muted border border-th-border space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">연도</label>
              <select
                value={form.year}
                onChange={(e) => setForm((f) => ({ ...f, year: Number(e.target.value) }))}
                className="w-full px-3 py-2 text-sm bg-th-input/60 border border-th-border/60 rounded-lg text-th-text focus:outline-none focus:border-blue-500/60"
              >
                {YEAR_OPTIONS.map((y) => (
                  <option key={y} value={y}>{y}년</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">월</label>
              <select
                value={form.month}
                onChange={(e) => setForm((f) => ({ ...f, month: Number(e.target.value) }))}
                className="w-full px-3 py-2 text-sm bg-th-input/60 border border-th-border/60 rounded-lg text-th-text focus:outline-none focus:border-blue-500/60"
              >
                {MONTH_OPTIONS.map((m) => {
                  const d = toDate(form.year, m);
                  return (
                    <option key={m} value={m}>
                      {m}월 {usedDates.has(d) ? '(기록 있음)' : ''}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">총자산 (원)</label>
            <Input
              type="number"
              placeholder="예: 200000000"
              value={form.total}
              onChange={(e) => setForm((f) => ({ ...f, total: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">메모 (선택)</label>
            <Input
              placeholder="예: 퇴직금 수령 전, 전세 입주 전 등"
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              className="px-4 py-1.5 bg-blue-500 text-th-text text-sm rounded-lg hover:bg-blue-600"
            >
              저장
            </button>
            <button
              onClick={() => setAdding(false)}
              className="px-4 py-1.5 text-slate-400 text-sm rounded-lg hover:bg-th-input"
            >
              취소
            </button>
          </div>
        </div>
      )}

      {/* 기록 목록 — 구간 표시 포함 */}
      {sorted.length === 0 && !adding ? (
        <div className="py-10 text-center text-[12px] text-slate-600">
          아직 과거 자산 기록이 없습니다. 위 버튼으로 추가해보세요.
        </div>
      ) : (
        <div className="space-y-1">
          {sorted.map((snap, i) => {
            const next = sorted[i + 1];
            const untilLabel = next
              ? (() => {
                  // 다음 기준점 바로 전달
                  const [ny, nm] = next.date.split('-').map(Number);
                  const prevM = nm === 1 ? 12 : nm - 1;
                  const prevY = nm === 1 ? ny - 1 : ny;
                  return `${prevY}년 ${prevM}월까지 유지`;
                })()
              : '월별 스냅샷 데이터 시작 전까지 유지';

            return (
              <div key={snap.date} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-th-muted/50 border border-th-border/50 hover:bg-th-muted/80 transition-colors">
                {/* 날짜 */}
                <div className="w-20 flex-shrink-0">
                  <p className="text-[13px] font-bold text-blue-400">{formatDisplayDate(snap.date)}</p>
                  <p className="text-[9px] text-slate-600 mt-0.5">기준점</p>
                </div>

                {/* 화살표 + 구간 */}
                <div className="flex items-center gap-1.5 flex-shrink-0 text-[10px] text-slate-600">
                  <ChevronRight size={10} />
                  <span>{untilLabel}</span>
                </div>

                {/* 총자산 */}
                <div className="flex-1 text-right">
                  <p className="text-[14px] font-semibold text-th-text tabular-nums">{formatKRW(snap.total)}</p>
                  {snap.note && <p className="text-[11px] text-slate-500 mt-0.5">{snap.note}</p>}
                </div>

                {/* 삭제 */}
                <button
                  onClick={() => removeAnnualSnapshot(snap.date)}
                  className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors flex-shrink-0"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
