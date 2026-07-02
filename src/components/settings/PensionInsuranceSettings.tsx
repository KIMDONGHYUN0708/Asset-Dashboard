'use client';
import { useState } from 'react';
import Image from 'next/image';
import { useAssetStore } from '@/lib/store';
import { Account, AssetCategory } from '@/lib/types';
import { formatKRWFull, CATEGORY_LABEL } from '@/lib/utils';
import SettingsShell, { Input, Select, SaveButton, DeleteButton } from './SettingsShell';
import { Plus } from 'lucide-react';

const CATS: AssetCategory[] = ['pension', 'insurance'];
const INSTITUTIONS = ['삼성생명', '한화생명', '교보생명', '미래에셋', 'KB손보', '현대해상', '메리츠화재', '기타'];
const LOGO_MAP: Record<string, string> = {
  '삼성생명': '/logos/삼성.svg', '한화생명': '/logos/한화.svg',
  '교보생명': '/logos/교보.svg', '미래에셋': '/logos/미래에셋.svg',
};

const blank = (cat: AssetCategory): Omit<Account, 'id'> => ({
  institution: '삼성생명', name: '', category: cat, amount: 0,
  logo: '/logos/삼성.svg', monthlyPremium: undefined, coverageAmount: undefined,
});

export default function PensionInsuranceSettings() {
  const { accounts, setStore } = useAssetStore();
  const [editing, setEditing] = useState<Record<string, Account>>({});
  const [adding, setAdding] = useState<AssetCategory | null>(null);
  const [newItem, setNewItem] = useState<Omit<Account, 'id'>>(blank('pension'));
  const [saved, setSaved] = useState(false);

  const startEdit = (acc: Account) => setEditing(p => ({ ...p, [acc.id]: { ...acc } }));
  const updateEdit = (id: string, field: keyof Account, value: unknown) =>
    setEditing(p => ({ ...p, [id]: { ...p[id], [field]: value } }));

  const saveAll = () => {
    setStore({ accounts: accounts.map(a => editing[a.id] ?? a) });
    setEditing({});
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const deleteItem = (id: string) => setStore({ accounts: accounts.filter(a => a.id !== id) });

  const addItem = () => {
    if (!adding) return;
    const logo = LOGO_MAP[newItem.institution] ?? undefined;
    setStore({ accounts: [...accounts, { ...newItem, id: `acc-${Date.now()}`, logo }] });
    setAdding(null);
  };

  return (
    <SettingsShell
      title="연금저축 · 보험"
      description="연금저축펀드, IRP, 종신/실손 보험을 관리합니다"
      action={
        <div className="flex gap-2">
          <button onClick={() => { setAdding('pension'); setNewItem(blank('pension')); }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-th-text-sec border border-th-border rounded-lg hover:bg-th-muted">
            <Plus size={14} /> 연금
          </button>
          <button onClick={() => { setAdding('insurance'); setNewItem(blank('insurance')); }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-th-text-sec border border-th-border rounded-lg hover:bg-th-muted">
            <Plus size={14} /> 보험
          </button>
          <SaveButton onClick={saveAll} label={saved ? '✓ 저장됨' : '저장'} />
        </div>
      }
    >
      {adding && (
        <div className="p-4 rounded-xl border border-blue-500/30 bg-blue-500/5 mb-4">
          <p className="text-sm font-medium text-blue-400 mb-3">
            새 {CATEGORY_LABEL[adding]} 추가
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div><label className="text-xs text-slate-500 mb-1 block">금융사</label>
              <Select value={newItem.institution} onChange={e => setNewItem(p => ({ ...p, institution: e.target.value }))}>
                {INSTITUTIONS.map(i => <option key={i}>{i}</option>)}
              </Select>
            </div>
            <div><label className="text-xs text-slate-500 mb-1 block">상품명 *</label>
              <Input value={newItem.name} onChange={e => setNewItem(p => ({ ...p, name: e.target.value }))} placeholder="미래에셋 연금저축펀드" />
            </div>
            <div><label className="text-xs text-slate-500 mb-1 block">평가금액 (원)</label>
              <Input type="number" value={newItem.amount || ''} onChange={e => setNewItem(p => ({ ...p, amount: Number(e.target.value) }))} />
            </div>
            {adding === 'insurance' && (
              <>
                <div><label className="text-xs text-slate-500 mb-1 block">월 보험료 (원)</label>
                  <Input type="number" value={newItem.monthlyPremium ?? ''} onChange={e => setNewItem(p => ({ ...p, monthlyPremium: Number(e.target.value) }))} placeholder="180000" />
                </div>
                <div><label className="text-xs text-slate-500 mb-1 block">보장금액 (원)</label>
                  <Input type="number" value={newItem.coverageAmount ?? ''} onChange={e => setNewItem(p => ({ ...p, coverageAmount: Number(e.target.value) }))} placeholder="300000000" />
                </div>
              </>
            )}
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={addItem} className="px-4 py-1.5 bg-blue-500 text-th-text text-sm rounded-lg hover:bg-blue-600">추가</button>
            <button onClick={() => setAdding(null)} className="px-4 py-1.5 text-slate-400 text-sm rounded-lg hover:bg-th-muted">취소</button>
          </div>
        </div>
      )}

      {CATS.map(cat => {
        const items = accounts.filter(a => a.category === cat);
        if (items.length === 0) return null;
        return (
          <div key={cat} className="mb-5">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">{CATEGORY_LABEL[cat]}</p>
            <div className="space-y-2">
              {items.map(acc => {
                const ed = editing[acc.id];
                const cur = ed ?? acc;
                return (
                  <div key={acc.id}
                    className={`flex items-center gap-3 p-3 rounded-xl ${ed ? 'bg-th-muted border border-th-border' : 'bg-th-muted/40 hover:bg-th-muted/60 cursor-pointer'}`}
                    onClick={() => !ed && startEdit(acc)}>
                    {cur.logo && (
                      <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center flex-shrink-0 p-0.5">
                        <Image src={cur.logo} alt={cur.institution} width={26} height={26} className="object-contain" />
                      </div>
                    )}
                    {ed ? (
                      <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-2">
                        <div><label className="text-xs text-slate-500 mb-0.5 block">상품명</label>
                          <Input value={ed.name} onChange={e => updateEdit(acc.id, 'name', e.target.value)} />
                        </div>
                        <div><label className="text-xs text-slate-500 mb-0.5 block">평가금액</label>
                          <Input type="number" value={ed.amount} onChange={e => updateEdit(acc.id, 'amount', Number(e.target.value))} />
                        </div>
                        {cat === 'insurance' && (
                          <>
                            <div><label className="text-xs text-slate-500 mb-0.5 block">월 보험료</label>
                              <Input type="number" value={ed.monthlyPremium ?? ''} onChange={e => updateEdit(acc.id, 'monthlyPremium', Number(e.target.value))} />
                            </div>
                            <div><label className="text-xs text-slate-500 mb-0.5 block">보장금액</label>
                              <Input type="number" value={ed.coverageAmount ?? ''} onChange={e => updateEdit(acc.id, 'coverageAmount', Number(e.target.value))} />
                            </div>
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="flex-1 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-th-text">{acc.name}</p>
                          <p className="text-xs text-slate-500">{acc.institution}
                            {acc.monthlyPremium && ` · 월 ${(acc.monthlyPremium/10000).toFixed(1)}만원`}
                            {acc.coverageAmount && ` · 보장 ${(acc.coverageAmount/100_000_000).toFixed(0)}억`}
                          </p>
                        </div>
                        <p className="text-sm font-semibold text-th-text">{formatKRWFull(acc.amount)}</p>
                      </div>
                    )}
                    <DeleteButton onClick={() => deleteItem(acc.id)} />
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </SettingsShell>
  );
}
