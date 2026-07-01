'use client';
import { useState } from 'react';
import Image from 'next/image';
import { useAssetStore } from '@/lib/store';
import { Account, AssetCategory } from '@/lib/types';
import { formatKRWFull, CATEGORY_LABEL } from '@/lib/utils';
import SettingsShell, { FormRow, Input, Select, SaveButton, DeleteButton } from './SettingsShell';
import { Plus } from 'lucide-react';

const EDITABLE_CATS: AssetCategory[] = ['account', 'savings', 'loan'];
const CAT_INSTITUTIONS = ['케이뱅크', 'KB국민', '신한', '미래에셋', '키움증권', '하나', '우리', '농협', '카카오뱅크', '토스', '기타'];

const LOGO_MAP: Record<string, string> = {
  'KB국민': '/logos/KB.svg', '케이뱅크': '/logos/케이뱅크.svg',
  '신한': '/logos/신한.svg', '미래에셋': '/logos/미래에셋.svg',
  '키움증권': '/logos/키움.svg', '하나': '/logos/하나.svg',
  '우리': '/logos/우리.svg', '농협': '/logos/농협.svg',
  '카카오뱅크': '/logos/카카오뱅크.svg', '토스': '/logos/토스.svg',
};

const blankAccount = (): Omit<Account, 'id'> => ({
  institution: 'KB국민', name: '', category: 'account',
  amount: 0, logo: '/logos/KB.svg', interestRate: undefined, maturityDate: undefined, loanRate: undefined,
});

export default function AccountSettings() {
  const { accounts, setStore } = useAssetStore();
  const items = accounts.filter(a => EDITABLE_CATS.includes(a.category));
  const [editing, setEditing] = useState<Record<string, Account>>({});
  const [adding, setAdding] = useState(false);
  const [newItem, setNewItem] = useState<Omit<Account, 'id'>>(blankAccount());
  const [saved, setSaved] = useState(false);

  const startEdit = (acc: Account) => {
    setEditing(prev => ({ ...prev, [acc.id]: { ...acc } }));
  };

  const updateEdit = (id: string, field: keyof Account, value: unknown) => {
    setEditing(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };

  const saveAll = () => {
    const updated = accounts.map(a =>
      editing[a.id] ? { ...editing[a.id], logo: LOGO_MAP[editing[a.id].institution] ?? undefined } : a
    );
    setStore({ accounts: updated });
    setEditing({});
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const deleteItem = (id: string) => {
    setStore({ accounts: accounts.filter(a => a.id !== id) });
  };

  const addItem = () => {
    const id = `acc-${Date.now()}`;
    const logo = LOGO_MAP[newItem.institution] ?? undefined;
    setStore({ accounts: [...accounts, { ...newItem, id, logo }] });
    setAdding(false);
    setNewItem(blankAccount());
  };

  return (
    <SettingsShell
      title="계좌 · 적금 · 대출"
      description="입출금, 적금, 대출 계좌를 관리합니다"
      action={
        <div className="flex gap-2">
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-300 border border-slate-700 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <Plus size={14} /> 추가
          </button>
          <SaveButton onClick={saveAll} label={saved ? '✓ 저장됨' : '저장'} />
        </div>
      }
    >
      <div className="space-y-2">
        {/* 추가 폼 */}
        {adding && (
          <div className="p-4 rounded-xl border border-blue-500/30 bg-blue-500/5 space-y-3 mb-4">
            <p className="text-sm font-medium text-blue-400">새 계좌 추가</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">금융사</label>
                <Select value={newItem.institution} onChange={e => setNewItem(p => ({ ...p, institution: e.target.value }))}>
                  {CAT_INSTITUTIONS.map(i => <option key={i}>{i}</option>)}
                </Select>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">계좌명</label>
                <Input value={newItem.name} onChange={e => setNewItem(p => ({ ...p, name: e.target.value }))} placeholder="예: KB 입출금" />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">유형</label>
                <Select value={newItem.category} onChange={e => setNewItem(p => ({ ...p, category: e.target.value as AssetCategory }))}>
                  {EDITABLE_CATS.map(c => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
                </Select>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">잔액 (원)</label>
                <Input type="number" value={newItem.amount} onChange={e => setNewItem(p => ({ ...p, amount: Number(e.target.value) }))} />
              </div>
              {(newItem.category === 'savings') && (
                <>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">금리 (%)</label>
                    <Input type="number" step="0.1" value={newItem.interestRate ?? ''} onChange={e => setNewItem(p => ({ ...p, interestRate: Number(e.target.value) }))} placeholder="3.5" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">만기일</label>
                    <Input type="date" value={newItem.maturityDate ?? ''} onChange={e => setNewItem(p => ({ ...p, maturityDate: e.target.value }))} />
                  </div>
                </>
              )}
              {newItem.category === 'loan' && (
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">대출금리 (%)</label>
                  <Input type="number" step="0.1" value={newItem.loanRate ?? ''} onChange={e => setNewItem(p => ({ ...p, loanRate: Number(e.target.value) }))} placeholder="5.2" />
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button onClick={addItem} className="px-4 py-1.5 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-colors">추가</button>
              <button onClick={() => setAdding(false)} className="px-4 py-1.5 text-slate-400 text-sm rounded-lg hover:bg-slate-800 transition-colors">취소</button>
            </div>
          </div>
        )}

        {/* 카테고리별 그룹 */}
        {EDITABLE_CATS.map(cat => {
          const catItems = items.filter(a => a.category === cat);
          if (catItems.length === 0) return null;
          return (
            <div key={cat} className="mb-4">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">{CATEGORY_LABEL[cat]}</p>
              <div className="space-y-2">
                {catItems.map(acc => {
                  const ed = editing[acc.id];
                  const cur = ed ?? acc;
                  return (
                    <div
                      key={acc.id}
                      className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${ed ? 'bg-slate-800 border border-slate-700' : 'bg-slate-800/40 hover:bg-slate-800/70'}`}
                      onClick={() => !ed && startEdit(acc)}
                    >
                      {cur.logo && (
                        <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center flex-shrink-0 p-0.5">
                          <Image src={cur.logo} alt={cur.institution} width={26} height={26} className="object-contain" />
                        </div>
                      )}
                      {ed ? (
                        <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-2">
                          <Input value={ed.name} onChange={e => updateEdit(acc.id, 'name', e.target.value)} placeholder="계좌명" />
                          <Input
                            type="number"
                            value={ed.amount}
                            onChange={e => updateEdit(acc.id, 'amount', Number(e.target.value))}
                            placeholder="잔액"
                          />
                          {cat === 'savings' && (
                            <>
                              <Input type="number" step="0.1" value={ed.interestRate ?? ''} onChange={e => updateEdit(acc.id, 'interestRate', Number(e.target.value))} placeholder="금리 %" />
                              <Input type="date" value={ed.maturityDate ?? ''} onChange={e => updateEdit(acc.id, 'maturityDate', e.target.value)} />
                            </>
                          )}
                          {cat === 'loan' && (
                            <Input type="number" step="0.1" value={ed.loanRate ?? ''} onChange={e => updateEdit(acc.id, 'loanRate', Number(e.target.value))} placeholder="금리 %" />
                          )}
                        </div>
                      ) : (
                        <div className="flex-1 flex items-center justify-between cursor-pointer">
                          <div>
                            <p className="text-sm font-medium text-white">{acc.name}</p>
                            <p className="text-xs text-slate-500">{acc.institution}
                              {acc.interestRate && ` · ${acc.interestRate}%`}
                              {acc.loanRate && ` · ${acc.loanRate}%`}
                              {acc.maturityDate && ` · 만기 ${acc.maturityDate}`}
                            </p>
                          </div>
                          <p className={`text-sm font-semibold ${cat === 'loan' ? 'text-red-400' : 'text-white'}`}>
                            {cat === 'loan' ? '-' : ''}{formatKRWFull(acc.amount)}
                          </p>
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
      </div>
    </SettingsShell>
  );
}
