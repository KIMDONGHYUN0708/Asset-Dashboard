'use client';
import { useState } from 'react';
import { useAssetStore } from '@/lib/store';
import { Car } from '@/lib/types';
import { formatKRWFull, formatKRW } from '@/lib/utils';
import SettingsShell, { Input, SaveButton, DeleteButton } from './SettingsShell';
import { Plus, TrendingDown } from 'lucide-react';

const blank = (): Omit<Car, 'id'> => ({
  model: '', year: 2023, purchasePrice: 0, currentValue: 0, purchaseDate: '2023-01-01',
});

export default function CarSettings() {
  const { cars, setStore } = useAssetStore();
  const [editing, setEditing] = useState<Record<string, Car>>({});
  const [adding, setAdding] = useState(false);
  const [newItem, setNewItem] = useState<Omit<Car, 'id'>>(blank());
  const [saved, setSaved] = useState(false);

  const startEdit = (car: Car) => setEditing(p => ({ ...p, [car.id]: { ...car } }));
  const updateEdit = (id: string, field: keyof Car, value: unknown) =>
    setEditing(p => ({ ...p, [id]: { ...p[id], [field]: value } }));

  const saveAll = () => {
    setStore({ cars: cars.map(c => editing[c.id] ?? c) });
    setEditing({});
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
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
      description="보유 차량의 취득가 및 현재 시세를 입력하세요"
      action={
        <div className="flex gap-2">
          <button onClick={() => setAdding(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-300 border border-slate-700 rounded-lg hover:bg-slate-800">
            <Plus size={14} /> 추가
          </button>
          <SaveButton onClick={saveAll} label={saved ? '✓ 저장됨' : '저장'} />
        </div>
      }
    >
      {adding && (
        <div className="p-4 rounded-xl border border-blue-500/30 bg-blue-500/5 mb-4">
          <p className="text-sm font-medium text-blue-400 mb-3">새 차량 추가</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div><label className="text-xs text-slate-500 mb-1 block">차량명 *</label>
              <Input value={newItem.model} onChange={e => setNewItem(p => ({ ...p, model: e.target.value }))} placeholder="현대 아반떼 CN7" />
            </div>
            <div><label className="text-xs text-slate-500 mb-1 block">연식</label>
              <Input type="number" value={newItem.year} onChange={e => setNewItem(p => ({ ...p, year: Number(e.target.value) }))} />
            </div>
            <div><label className="text-xs text-slate-500 mb-1 block">취득일</label>
              <Input type="date" value={newItem.purchaseDate} onChange={e => setNewItem(p => ({ ...p, purchaseDate: e.target.value }))} />
            </div>
            <div><label className="text-xs text-slate-500 mb-1 block">취득가 (원)</label>
              <Input type="number" value={newItem.purchasePrice || ''} onChange={e => setNewItem(p => ({ ...p, purchasePrice: Number(e.target.value) }))} />
            </div>
            <div><label className="text-xs text-slate-500 mb-1 block">현재 시세 (원)</label>
              <Input type="number" value={newItem.currentValue || ''} onChange={e => setNewItem(p => ({ ...p, currentValue: Number(e.target.value) }))} />
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={addItem} className="px-4 py-1.5 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600">추가</button>
            <button onClick={() => setAdding(false)} className="px-4 py-1.5 text-slate-400 text-sm rounded-lg hover:bg-slate-800">취소</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {cars.map(car => {
          const ed = editing[car.id];
          const cur = ed ?? car;
          const dep = ((cur.purchasePrice - cur.currentValue) / cur.purchasePrice * 100).toFixed(1);
          return (
            <div key={car.id} className={`p-4 rounded-xl ${ed ? 'bg-slate-800 border border-slate-700' : 'bg-slate-800/40 hover:bg-slate-800/60 cursor-pointer'}`}
              onClick={() => !ed && startEdit(car)}>
              {ed ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div><label className="text-xs text-slate-500 mb-0.5 block">차량명</label>
                    <Input value={ed.model} onChange={e => updateEdit(car.id, 'model', e.target.value)} />
                  </div>
                  <div><label className="text-xs text-slate-500 mb-0.5 block">연식</label>
                    <Input type="number" value={ed.year} onChange={e => updateEdit(car.id, 'year', Number(e.target.value))} />
                  </div>
                  <div><label className="text-xs text-slate-500 mb-0.5 block">취득일</label>
                    <Input type="date" value={ed.purchaseDate} onChange={e => updateEdit(car.id, 'purchaseDate', e.target.value)} />
                  </div>
                  <div><label className="text-xs text-slate-500 mb-0.5 block">취득가</label>
                    <Input type="number" value={ed.purchasePrice} onChange={e => updateEdit(car.id, 'purchasePrice', Number(e.target.value))} />
                  </div>
                  <div><label className="text-xs text-slate-500 mb-0.5 block">현재 시세</label>
                    <Input type="number" value={ed.currentValue} onChange={e => updateEdit(car.id, 'currentValue', Number(e.target.value))} />
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">{car.model} ({car.year}년식)</p>
                    <p className="text-xs text-slate-500 mt-0.5">취득 {formatKRW(car.purchasePrice)} · 취득일 {car.purchaseDate}</p>
                    <p className="text-xs text-red-400 flex items-center gap-0.5 mt-0.5">
                      <TrendingDown size={11} /> 감가 {dep}%
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-white">{formatKRWFull(car.currentValue)}</p>
                </div>
              )}
              <div className="flex justify-end mt-2">
                <DeleteButton onClick={() => deleteItem(car.id)} />
              </div>
            </div>
          );
        })}
      </div>
    </SettingsShell>
  );
}
