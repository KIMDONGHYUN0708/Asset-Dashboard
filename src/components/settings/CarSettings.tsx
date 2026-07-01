'use client';
import { useState } from 'react';
import { useAssetStore } from '@/lib/store';
import { Car } from '@/lib/types';
import { formatKRWFull, formatKRW } from '@/lib/utils';
import SettingsShell, { Input, DeleteButton } from './SettingsShell';
import { Plus, TrendingDown, Check } from 'lucide-react';

const blank = (): Omit<Car, 'id'> => ({
  model: '', year: new Date().getFullYear(), purchasePrice: 0, currentValue: 0,
  purchaseDate: new Date().toISOString().slice(0, 10),
});

export default function CarSettings() {
  const { cars, setStore } = useAssetStore();
  const [editing, setEditing] = useState<Record<string, Car>>({});
  const [adding, setAdding] = useState(false);
  const [newItem, setNewItem] = useState<Omit<Car, 'id'>>(blank());

  const startEdit = (car: Car) => setEditing(p => ({ ...p, [car.id]: { ...car } }));
  const cancelEdit = (id: string) => setEditing(p => { const n = { ...p }; delete n[id]; return n; });

  const updateEdit = (id: string, field: keyof Car, value: unknown) =>
    setEditing(p => ({ ...p, [id]: { ...p[id], [field]: value } }));

  const saveItem = (id: string) => {
    setStore({ cars: cars.map(c => c.id === id ? editing[id] : c) });
    cancelEdit(id);
  };

  const deleteItem = (id: string) => setStore({ cars: cars.filter(c => c.id !== id) });

  const addItem = () => {
    setStore({ cars: [...cars, { ...newItem, id: `car-${Date.now()}` }] });
    setAdding(false);
    setNewItem(blank());
  };

  return (
    <SettingsShell
      title="자동차"
      description="보유 차량의 취득가 및 현재 시세를 입력하면 감가율이 자동 계산됩니다"
      action={
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-300 border border-slate-700 rounded-lg hover:bg-slate-800"
        >
          <Plus size={14} /> 차량 등록
        </button>
      }
    >
      {adding && (
        <div className="p-4 rounded-xl border border-blue-500/30 bg-blue-500/5 mb-4">
          <p className="text-sm font-medium text-blue-400 mb-3">새 차량 등록</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="col-span-2 md:col-span-1">
              <label className="text-xs text-slate-500 mb-1 block">차량명 *</label>
              <Input value={newItem.model} onChange={e => setNewItem(p => ({ ...p, model: e.target.value }))} placeholder="현대 아반떼 CN7" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">연식</label>
              <Input type="number" value={newItem.year} onChange={e => setNewItem(p => ({ ...p, year: Number(e.target.value) }))} />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">취득일</label>
              <Input type="date" value={newItem.purchaseDate} onChange={e => setNewItem(p => ({ ...p, purchaseDate: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">취득가 (원)</label>
              <Input type="number" value={newItem.purchasePrice || ''} onChange={e => setNewItem(p => ({ ...p, purchasePrice: Number(e.target.value) }))} placeholder="30000000" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">현재 시세 (원)
                <span className="text-slate-600 ml-1">— 엔카·KB차차차 참고</span>
              </label>
              <Input type="number" value={newItem.currentValue || ''} onChange={e => setNewItem(p => ({ ...p, currentValue: Number(e.target.value) }))} placeholder="20000000" />
            </div>
          </div>

          {/* 감가율 미리보기 */}
          {newItem.purchasePrice > 0 && newItem.currentValue > 0 && (
            <div className="mt-3 p-2.5 rounded-lg bg-slate-800/60 flex items-center gap-3">
              <TrendingDown size={14} className="text-red-400 flex-shrink-0" />
              <div className="flex-1">
                <div className="h-1.5 rounded-full bg-slate-700 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-slate-500 to-slate-400"
                    style={{ width: `${(newItem.currentValue / newItem.purchasePrice * 100).toFixed(0)}%` }}
                  />
                </div>
              </div>
              <span className="text-xs text-slate-400">
                잔존 <span className="text-white font-medium">{(newItem.currentValue / newItem.purchasePrice * 100).toFixed(1)}%</span>
                {' '}·{' '}감가 <span className="text-red-400 font-medium">{((newItem.purchasePrice - newItem.currentValue) / newItem.purchasePrice * 100).toFixed(1)}%</span>
                {' '}({formatKRW(newItem.purchasePrice - newItem.currentValue)})
              </span>
            </div>
          )}

          <div className="flex gap-2 mt-3">
            <button onClick={addItem} disabled={!newItem.model} className="px-4 py-1.5 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 disabled:opacity-50">등록 완료</button>
            <button onClick={() => { setAdding(false); setNewItem(blank()); }} className="px-4 py-1.5 text-slate-400 text-sm rounded-lg hover:bg-slate-800">취소</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {cars.length === 0 && !adding && (
          <p className="text-sm text-slate-600 text-center py-8">등록된 차량이 없습니다</p>
        )}
        {cars.map(car => {
          const ed = editing[car.id];
          const cur = ed ?? car;
          const dep = cur.purchasePrice > 0 ? ((cur.purchasePrice - cur.currentValue) / cur.purchasePrice * 100) : 0;
          const retainPct = cur.purchasePrice > 0 ? (cur.currentValue / cur.purchasePrice * 100) : 0;

          return (
            <div
              key={car.id}
              className={`rounded-xl ${ed ? 'bg-slate-800 border border-slate-700' : 'bg-slate-800/40 hover:bg-slate-800/60 cursor-pointer'}`}
              onClick={() => !ed && startEdit(car)}
            >
              <div className="p-4">
                {ed ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      <div>
                        <label className="text-xs text-slate-500 mb-0.5 block">차량명</label>
                        <Input value={ed.model} onChange={e => updateEdit(car.id, 'model', e.target.value)} />
                      </div>
                      <div>
                        <label className="text-xs text-slate-500 mb-0.5 block">연식</label>
                        <Input type="number" value={ed.year} onChange={e => updateEdit(car.id, 'year', Number(e.target.value))} />
                      </div>
                      <div>
                        <label className="text-xs text-slate-500 mb-0.5 block">취득일</label>
                        <Input type="date" value={ed.purchaseDate} onChange={e => updateEdit(car.id, 'purchaseDate', e.target.value)} />
                      </div>
                      <div>
                        <label className="text-xs text-slate-500 mb-0.5 block">취득가 (원)</label>
                        <Input type="number" value={ed.purchasePrice} onChange={e => updateEdit(car.id, 'purchasePrice', Number(e.target.value))} />
                      </div>
                      <div>
                        <label className="text-xs text-slate-500 mb-0.5 block">현재 시세 (원)</label>
                        <Input type="number" value={ed.currentValue} onChange={e => updateEdit(car.id, 'currentValue', Number(e.target.value))} />
                      </div>
                    </div>

                    {/* 감가율 미리보기 */}
                    {ed.purchasePrice > 0 && (
                      <div className="p-2.5 rounded-lg bg-slate-700/40 flex items-center gap-3">
                        <div className="flex-1">
                          <div className="h-1.5 rounded-full bg-slate-700 overflow-hidden">
                            <div className="h-full rounded-full bg-gradient-to-r from-slate-500 to-slate-400" style={{ width: `${retainPct.toFixed(0)}%` }} />
                          </div>
                        </div>
                        <span className="text-xs text-slate-400 flex-shrink-0">
                          잔존 <span className="text-white font-medium">{retainPct.toFixed(1)}%</span>
                          {' · '}감가 <span className="text-red-400 font-medium">{dep.toFixed(1)}%</span>
                        </span>
                      </div>
                    )}

                    {/* 행 저장/취소 */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => saveItem(car.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 text-white text-xs font-medium rounded-lg hover:bg-blue-600 transition-colors"
                      >
                        <Check size={12} /> 저장
                      </button>
                      <button
                        onClick={() => cancelEdit(car.id)}
                        className="px-3 py-1.5 text-slate-400 text-xs rounded-lg hover:bg-slate-700 transition-colors"
                      >
                        취소
                      </button>
                      <div className="flex-1" />
                      <DeleteButton onClick={() => deleteItem(car.id)} />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-white">{car.model} <span className="text-slate-500 font-normal">({car.year}년식)</span></p>
                      <p className="text-xs text-slate-500 mt-0.5">취득 {formatKRW(car.purchasePrice)} · {car.purchaseDate}</p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <div className="w-24 h-1 rounded-full bg-slate-700 overflow-hidden">
                          <div className="h-full rounded-full bg-gradient-to-r from-slate-500 to-slate-400" style={{ width: `${retainPct.toFixed(0)}%` }} />
                        </div>
                        <p className="text-xs text-red-400 flex items-center gap-0.5">
                          <TrendingDown size={10} /> 감가 {dep.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                    <p className="text-sm font-semibold text-white">{formatKRWFull(car.currentValue)}</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </SettingsShell>
  );
}
