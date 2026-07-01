'use client';
import { useState } from 'react';
import { useAssetStore } from '@/lib/store';
import { PhysicalAsset, PhysicalAssetCategory } from '@/lib/types';
import { formatKRWFull, formatKRW } from '@/lib/utils';
import SettingsShell, { Input, DeleteButton } from './SettingsShell';
import { Plus, TrendingDown, TrendingUp, Check, Car, Package, Disc3, Watch, Box } from 'lucide-react';

const CATEGORIES: { key: PhysicalAssetCategory; label: string; icon: React.ElementType; color: string; bg: string }[] = [
  { key: 'car',      label: '자동차',      icon: Car,     color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/20' },
  { key: 'sneakers', label: '운동화·리셀', icon: Package, color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' },
  { key: 'lp',       label: 'LP·레코드',  icon: Disc3,   color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
  { key: 'watch',    label: '시계·명품',  icon: Watch,   color: 'text-amber-400',  bg: 'bg-amber-500/10 border-amber-500/20' },
  { key: 'etc',      label: '기타 실물',  icon: Box,     color: 'text-slate-400',  bg: 'bg-slate-700/50 border-slate-600/30' },
];

const getCategoryConfig = (key: PhysicalAssetCategory) =>
  CATEGORIES.find(c => c.key === key) ?? CATEGORIES[4];

const blank = (): Omit<PhysicalAsset, 'id'> => ({
  category: 'car',
  name: '',
  year: new Date().getFullYear(),
  purchasePrice: 0,
  currentValue: 0,
  purchaseDate: new Date().toISOString().slice(0, 10),
  memo: '',
});

export default function PhysicalAssetSettings() {
  const { physicalAssets, setStore } = useAssetStore();
  const [editing, setEditing] = useState<Record<string, PhysicalAsset>>({});
  const [adding, setAdding] = useState(false);
  const [newItem, setNewItem] = useState<Omit<PhysicalAsset, 'id'>>(blank());

  const startEdit = (item: PhysicalAsset) => setEditing(p => ({ ...p, [item.id]: { ...item } }));
  const cancelEdit = (id: string) => setEditing(p => { const n = { ...p }; delete n[id]; return n; });

  const updateEdit = (id: string, field: keyof PhysicalAsset, value: unknown) =>
    setEditing(p => ({ ...p, [id]: { ...p[id], [field]: value } }));

  const saveItem = (id: string) => {
    setStore({ physicalAssets: physicalAssets.map(a => a.id === id ? editing[id] : a) });
    cancelEdit(id);
  };

  const deleteItem = (id: string) =>
    setStore({ physicalAssets: physicalAssets.filter(a => a.id !== id) });

  const addItem = () => {
    setStore({ physicalAssets: [...physicalAssets, { ...newItem, id: `pa-${Date.now()}` }] });
    setAdding(false);
    setNewItem(blank());
  };

  const ValueBar = ({ purchase, current }: { purchase: number; current: number }) => {
    if (purchase <= 0) return null;
    const pct = Math.min((current / purchase) * 100, 200);
    const isGain = current >= purchase;
    const diff = Math.abs(current - purchase);
    const diffPct = ((current - purchase) / purchase * 100).toFixed(1);
    return (
      <div className="mt-3 p-2.5 rounded-lg bg-slate-800/60 flex items-center gap-3">
        {isGain
          ? <TrendingUp size={14} className="text-emerald-400 flex-shrink-0" />
          : <TrendingDown size={14} className="text-red-400 flex-shrink-0" />
        }
        <div className="flex-1">
          <div className="h-1.5 rounded-full bg-slate-700 overflow-hidden">
            <div
              className={`h-full rounded-full ${isGain ? 'bg-gradient-to-r from-emerald-600 to-emerald-400' : 'bg-gradient-to-r from-slate-500 to-slate-400'}`}
              style={{ width: `${Math.min(pct, 100)}%` }}
            />
          </div>
        </div>
        <span className="text-xs text-slate-400 flex-shrink-0">
          {isGain
            ? <span className="text-emerald-400 font-medium">+{diffPct}%</span>
            : <span className="text-red-400 font-medium">{diffPct}%</span>
          }
          {' '}({formatKRW(diff)})
        </span>
      </div>
    );
  };

  return (
    <SettingsShell
      title="실물 자산"
      description="자동차, 리셀 운동화, LP 레코드 등 실물 재테크 자산을 등록하세요. 모두 대시보드 기타 자산에 반영됩니다."
      action={
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-300 border border-slate-700 rounded-lg hover:bg-slate-800"
        >
          <Plus size={14} /> 자산 등록
        </button>
      }
    >
      {adding && (
        <div className="p-4 rounded-xl border border-blue-500/30 bg-blue-500/5 mb-4">
          <p className="text-sm font-medium text-blue-400 mb-3">새 실물 자산 등록</p>

          {/* 카테고리 선택 */}
          <div className="flex flex-wrap gap-2 mb-4">
            {CATEGORIES.map(cat => {
              const Icon = cat.icon;
              const active = newItem.category === cat.key;
              return (
                <button
                  key={cat.key}
                  onClick={() => setNewItem(p => ({ ...p, category: cat.key }))}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    active ? `${cat.bg} ${cat.color}` : 'border-slate-700 text-slate-500 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Icon size={12} /> {cat.label}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="col-span-2 md:col-span-1">
              <label className="text-xs text-slate-500 mb-1 block">
                {newItem.category === 'car' ? '차량명 *' : '품목명 *'}
              </label>
              <Input
                value={newItem.name}
                onChange={e => setNewItem(p => ({ ...p, name: e.target.value }))}
                placeholder={
                  newItem.category === 'car' ? '현대 아반떼 CN7' :
                  newItem.category === 'sneakers' ? 'Nike Dunk Low Panda' :
                  newItem.category === 'lp' ? 'Pink Floyd - The Wall' :
                  newItem.category === 'watch' ? 'Rolex Submariner' : '품목명'
                }
              />
            </div>
            {newItem.category === 'car' && (
              <div>
                <label className="text-xs text-slate-500 mb-1 block">연식</label>
                <Input type="number" value={newItem.year ?? ''} onChange={e => setNewItem(p => ({ ...p, year: Number(e.target.value) }))} />
              </div>
            )}
            <div>
              <label className="text-xs text-slate-500 mb-1 block">구입일</label>
              <Input type="date" value={newItem.purchaseDate} onChange={e => setNewItem(p => ({ ...p, purchaseDate: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">구입가 (원)</label>
              <Input type="number" value={newItem.purchasePrice || ''} onChange={e => setNewItem(p => ({ ...p, purchasePrice: Number(e.target.value) }))} placeholder="0" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">현재 시세 (원)</label>
              <Input type="number" value={newItem.currentValue || ''} onChange={e => setNewItem(p => ({ ...p, currentValue: Number(e.target.value) }))} placeholder="0" />
            </div>
            <div className="col-span-2 md:col-span-1">
              <label className="text-xs text-slate-500 mb-1 block">메모 (선택)</label>
              <Input value={newItem.memo ?? ''} onChange={e => setNewItem(p => ({ ...p, memo: e.target.value }))} placeholder="참고 사항" />
            </div>
          </div>

          {newItem.purchasePrice > 0 && newItem.currentValue > 0 && (
            <ValueBar purchase={newItem.purchasePrice} current={newItem.currentValue} />
          )}

          <div className="flex gap-2 mt-3">
            <button onClick={addItem} disabled={!newItem.name} className="px-4 py-1.5 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 disabled:opacity-50">등록 완료</button>
            <button onClick={() => { setAdding(false); setNewItem(blank()); }} className="px-4 py-1.5 text-slate-400 text-sm rounded-lg hover:bg-slate-800">취소</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {physicalAssets.length === 0 && !adding && (
          <p className="text-sm text-slate-600 text-center py-8">등록된 실물 자산이 없습니다</p>
        )}
        {physicalAssets.map(item => {
          const ed = editing[item.id];
          const cur = ed ?? item;
          const config = getCategoryConfig(cur.category);
          const Icon = config.icon;

          return (
            <div
              key={item.id}
              className={`rounded-xl ${ed ? 'bg-slate-800 border border-slate-700' : 'bg-slate-800/40 hover:bg-slate-800/60 cursor-pointer'}`}
              onClick={() => !ed && startEdit(item)}
            >
              <div className="p-4">
                {ed ? (
                  <div className="space-y-3">
                    {/* 카테고리 선택 */}
                    <div className="flex flex-wrap gap-1.5">
                      {CATEGORIES.map(cat => {
                        const CatIcon = cat.icon;
                        const active = ed.category === cat.key;
                        return (
                          <button
                            key={cat.key}
                            onClick={() => updateEdit(item.id, 'category', cat.key)}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                              active ? `${cat.bg} ${cat.color}` : 'border-slate-700 text-slate-500 hover:text-white hover:bg-slate-800'
                            }`}
                          >
                            <CatIcon size={11} /> {cat.label}
                          </button>
                        );
                      })}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      <div>
                        <label className="text-xs text-slate-500 mb-0.5 block">{ed.category === 'car' ? '차량명' : '품목명'}</label>
                        <Input value={ed.name} onChange={e => updateEdit(item.id, 'name', e.target.value)} />
                      </div>
                      {ed.category === 'car' && (
                        <div>
                          <label className="text-xs text-slate-500 mb-0.5 block">연식</label>
                          <Input type="number" value={ed.year ?? ''} onChange={e => updateEdit(item.id, 'year', Number(e.target.value))} />
                        </div>
                      )}
                      <div>
                        <label className="text-xs text-slate-500 mb-0.5 block">구입일</label>
                        <Input type="date" value={ed.purchaseDate} onChange={e => updateEdit(item.id, 'purchaseDate', e.target.value)} />
                      </div>
                      <div>
                        <label className="text-xs text-slate-500 mb-0.5 block">구입가 (원)</label>
                        <Input type="number" value={ed.purchasePrice} onChange={e => updateEdit(item.id, 'purchasePrice', Number(e.target.value))} />
                      </div>
                      <div>
                        <label className="text-xs text-slate-500 mb-0.5 block">현재 시세 (원)</label>
                        <Input type="number" value={ed.currentValue} onChange={e => updateEdit(item.id, 'currentValue', Number(e.target.value))} />
                      </div>
                      <div>
                        <label className="text-xs text-slate-500 mb-0.5 block">메모 (선택)</label>
                        <Input value={ed.memo ?? ''} onChange={e => updateEdit(item.id, 'memo', e.target.value)} placeholder="참고 사항" />
                      </div>
                    </div>

                    {ed.purchasePrice > 0 && (
                      <ValueBar purchase={ed.purchasePrice} current={ed.currentValue} />
                    )}

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => saveItem(item.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 text-white text-xs font-medium rounded-lg hover:bg-blue-600 transition-colors"
                      >
                        <Check size={12} /> 저장
                      </button>
                      <button onClick={() => cancelEdit(item.id)} className="px-3 py-1.5 text-slate-400 text-xs rounded-lg hover:bg-slate-700 transition-colors">
                        취소
                      </button>
                      <div className="flex-1" />
                      <DeleteButton onClick={() => deleteItem(item.id)} />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg border flex items-center justify-center flex-shrink-0 ${config.bg}`}>
                      <Icon size={15} className={config.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white">
                        {item.name}
                        {item.year && item.category === 'car' && <span className="text-slate-500 font-normal ml-1.5">({item.year}년식)</span>}
                      </p>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {config.label} · 구입 {formatKRW(item.purchasePrice)} · {item.purchaseDate}
                        {item.memo && ` · ${item.memo}`}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-white tabular-nums flex-shrink-0">{formatKRWFull(item.currentValue)}</p>
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
