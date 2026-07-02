'use client';
import { useState } from 'react';
import { useAssetStore } from '@/lib/store';
import { Account, AssetCategory } from '@/lib/types';
import { formatKRWFull, CATEGORY_LABEL } from '@/lib/utils';
import SettingsShell, { Input, Select, DeleteButton } from './SettingsShell';
import { Plus, Check } from 'lucide-react';

const EDITABLE_CATS: AssetCategory[] = ['account', 'savings', 'loan'];

const BANK_LIST = [
  'KB국민', '신한', '우리', '하나', '농협', 'IBK기업', '케이뱅크', '카카오뱅크', '토스뱅크',
  'SC제일', 'BNK부산', '대구은행', '광주은행', '전북은행', '수협',
];
const SECURITIES_LIST = [
  '키움증권', '미래에셋', 'KB증권', '신한투자', 'NH투자증권', '삼성증권',
  '한국투자증권', '하나증권', '교보증권', '대신증권', '메리츠증권', '한화투자증권',
];
const INSURANCE_LIST = ['삼성생명', '한화생명', '교보생명', '신한라이프', '흥국생명'];
const ALL_INSTITUTIONS = [...BANK_LIST, ...SECURITIES_LIST, ...INSURANCE_LIST, '기타'];

const LOGO_MAP: Record<string, string> = {
  'KB국민': '/logos/KB.svg', '케이뱅크': '/logos/케이뱅크.svg',
  '신한': '/logos/신한.svg', '미래에셋': '/logos/미래에셋.svg',
  '키움증권': '/logos/키움.svg', '하나': '/logos/하나.svg',
  '우리': '/logos/우리.svg', '농협': '/logos/농협.svg',
  '카카오뱅크': '/logos/카카오뱅크.svg',
  '토스': '/logos/토스.svg', '토스뱅크': '/logos/토스.svg',
  '삼성증권': '/logos/삼성.svg', '삼성생명': '/logos/삼성.svg',
  '한국투자증권': '/logos/한국투자.svg', '한국투자': '/logos/한국투자.svg',
  '한화투자증권': '/logos/한화.svg', '한화생명': '/logos/한화.svg',
  '교보증권': '/logos/교보.svg', '교보생명': '/logos/교보.svg',
};

const BRAND_FALLBACK: Record<string, { bg: string; text: string; short: string }> = {
  'IBK기업':    { bg: '#005EB8', text: '#fff', short: 'IBK' },
  'SC제일':     { bg: '#1E7FC7', text: '#fff', short: 'SC' },
  'NH투자증권': { bg: '#009C4C', text: '#fff', short: 'NH' },
  'KB증권':     { bg: '#FFBC00', text: '#1A1A1A', short: 'KB' },
  '신한투자':   { bg: '#0068B7', text: '#fff', short: '신한' },
  '하나증권':   { bg: '#009B77', text: '#fff', short: '하나' },
  '대신증권':   { bg: '#003087', text: '#fff', short: '대신' },
  '메리츠증권': { bg: '#E31E26', text: '#fff', short: '메리츠' },
  'BNK부산':    { bg: '#005BAC', text: '#fff', short: 'BNK' },
  '대구은행':   { bg: '#002B8F', text: '#fff', short: 'DGB' },
  '광주은행':   { bg: '#003C91', text: '#fff', short: '광주' },
  '전북은행':   { bg: '#003087', text: '#fff', short: '전북' },
  '수협':       { bg: '#0066CC', text: '#fff', short: '수협' },
  '신한라이프': { bg: '#0068B7', text: '#fff', short: '신한' },
  '흥국생명':   { bg: '#1B3A8C', text: '#fff', short: '흥국' },
};

function InstitutionLogo({ name }: { name: string }) {
  const logo = LOGO_MAP[name];
  if (logo) {
    return (
      <img
        src={logo}
        alt={name}
        width={32}
        height={32}
        className="w-8 h-8 flex-shrink-0"
      />
    );
  }
  const fb = BRAND_FALLBACK[name];
  const bg = fb?.bg ?? '#475569';
  const color = fb?.text ?? '#fff';
  const short = fb?.short ?? name.slice(0, 2);
  return (
    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: bg }}>
      <span className="text-[9px] font-bold leading-none" style={{ color }}>{short}</span>
    </div>
  );
}

const blankAccount = (): Omit<Account, 'id'> => ({
  institution: 'KB국민', name: '', category: 'account',
  amount: 0, logo: '/logos/KB.svg', interestRate: undefined, maturityDate: undefined, loanRate: undefined,
});

function InstitutionSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Select value={value} onChange={e => onChange(e.target.value)}>
      <optgroup label="은행">{BANK_LIST.map(i => <option key={i}>{i}</option>)}</optgroup>
      <optgroup label="증권사">{SECURITIES_LIST.map(i => <option key={i}>{i}</option>)}</optgroup>
      <optgroup label="보험사">{INSURANCE_LIST.map(i => <option key={i}>{i}</option>)}</optgroup>
      <option value="기타">기타</option>
    </Select>
  );
}

export default function AccountSettings() {
  const { accounts, setStore } = useAssetStore();
  const items = accounts.filter(a => EDITABLE_CATS.includes(a.category));
  const [editing, setEditing] = useState<Record<string, Account>>({});
  const [adding, setAdding] = useState(false);
  const [newItem, setNewItem] = useState<Omit<Account, 'id'>>(blankAccount());
  const [noMaturity, setNoMaturity] = useState(false);

  const startEdit = (acc: Account) => setEditing(prev => ({ ...prev, [acc.id]: { ...acc } }));
  const cancelEdit = (id: string) => setEditing(p => { const n = { ...p }; delete n[id]; return n; });

  const updateEdit = (id: string, field: keyof Account, value: unknown) =>
    setEditing(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));

  const saveItem = (id: string) => {
    const updated = accounts.map(a =>
      a.id === id ? { ...editing[id], logo: LOGO_MAP[editing[id].institution] ?? undefined } : a
    );
    setStore({ accounts: updated });
    cancelEdit(id);
  };

  const deleteItem = (id: string) => setStore({ accounts: accounts.filter(a => a.id !== id) });

  const addItem = () => {
    const id = `acc-${Date.now()}`;
    const logo = LOGO_MAP[newItem.institution] ?? undefined;
    const finalMaturity = (newItem.category === 'savings' && noMaturity) ? undefined : newItem.maturityDate;
    setStore({ accounts: [...accounts, { ...newItem, id, logo, maturityDate: finalMaturity }] });
    setAdding(false);
    setNewItem(blankAccount());
    setNoMaturity(false);
  };

  return (
    <SettingsShell
      title="계좌 · 적금 · 대출"
      description="입출금, 적금, 대출 계좌를 관리합니다"
      action={
        <button
          onClick={() => { setAdding(true); setNoMaturity(false); }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-th-text-sec border border-th-border rounded-lg hover:bg-th-muted transition-colors"
        >
          <Plus size={14} /> 계좌 등록
        </button>
      }
    >
      <div className="space-y-2">
        {/* 등록 폼 */}
        {adding && (
          <div className="p-4 rounded-xl border border-blue-500/30 bg-blue-500/5 space-y-3 mb-4">
            <p className="text-sm font-medium text-blue-400">새 계좌 등록</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">금융사</label>
                <InstitutionSelect value={newItem.institution} onChange={v => setNewItem(p => ({ ...p, institution: v }))} />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">계좌명</label>
                <Input value={newItem.name} onChange={e => setNewItem(p => ({ ...p, name: e.target.value }))} placeholder="예: KB 입출금, 주택청약종합저축" />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">유형</label>
                <Select value={newItem.category} onChange={e => setNewItem(p => ({ ...p, category: e.target.value as AssetCategory }))}>
                  {EDITABLE_CATS.map(c => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
                </Select>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">잔액 (원)</label>
                <Input type="number" value={newItem.amount || ''} onChange={e => setNewItem(p => ({ ...p, amount: Number(e.target.value) }))} placeholder="0" />
              </div>
              {newItem.category === 'savings' && (
                <>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">금리 (%) <span className="text-slate-600">선택</span></label>
                    <Input type="number" step="0.1" value={newItem.interestRate ?? ''} onChange={e => setNewItem(p => ({ ...p, interestRate: e.target.value ? Number(e.target.value) : undefined }))} placeholder="3.5" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">만기일 <span className="text-slate-600">선택</span></label>
                    {noMaturity ? (
                      <div className="flex items-center gap-2 h-9">
                        <span className="text-xs text-slate-400">만기일 없음 (자유적금·청약)</span>
                        <button onClick={() => setNoMaturity(false)} className="text-xs text-slate-600 hover:text-slate-400">취소</button>
                      </div>
                    ) : (
                      <div className="flex gap-1.5">
                        <Input type="date" value={newItem.maturityDate ?? ''} onChange={e => setNewItem(p => ({ ...p, maturityDate: e.target.value || undefined }))} />
                        <button
                          onClick={() => { setNoMaturity(true); setNewItem(p => ({ ...p, maturityDate: undefined })); }}
                          className="px-2 py-1.5 text-xs text-slate-500 border border-th-border rounded-lg hover:bg-th-muted whitespace-nowrap"
                        >없음</button>
                      </div>
                    )}
                  </div>
                </>
              )}
              {newItem.category === 'loan' && (
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">대출금리 (%)</label>
                  <Input type="number" step="0.1" value={newItem.loanRate ?? ''} onChange={e => setNewItem(p => ({ ...p, loanRate: e.target.value ? Number(e.target.value) : undefined }))} placeholder="5.2" />
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 pt-1">
              <InstitutionLogo name={newItem.institution} />
              <span className="text-xs text-slate-500">{newItem.institution} 로고 미리보기</span>
            </div>
            <div className="flex gap-2">
              <button onClick={addItem} disabled={!newItem.name} className="px-4 py-1.5 bg-blue-500 text-th-text text-sm rounded-lg hover:bg-blue-600 disabled:opacity-50">등록 완료</button>
              <button onClick={() => { setAdding(false); setNoMaturity(false); setNewItem(blankAccount()); }} className="px-4 py-1.5 text-slate-400 text-sm rounded-lg hover:bg-th-muted">취소</button>
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
                      className={`rounded-xl transition-colors ${ed ? 'bg-th-muted border border-th-border' : 'bg-th-muted/40 hover:bg-th-muted/70 cursor-pointer'}`}
                      onClick={() => !ed && startEdit(acc)}
                    >
                      <div className="flex items-start gap-3 p-3">
                        <div className="mt-0.5"><InstitutionLogo name={cur.institution} /></div>

                        {ed ? (
                          <div className="flex-1 space-y-3">
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                              <div>
                                <label className="text-xs text-slate-500 block mb-0.5">금융사</label>
                                <InstitutionSelect value={ed.institution} onChange={v => updateEdit(acc.id, 'institution', v)} />
                              </div>
                              <div>
                                <label className="text-xs text-slate-500 block mb-0.5">계좌명</label>
                                <Input value={ed.name} onChange={e => updateEdit(acc.id, 'name', e.target.value)} />
                              </div>
                              <div>
                                <label className="text-xs text-slate-500 block mb-0.5">잔액 (원)</label>
                                <Input type="number" value={ed.amount} onChange={e => updateEdit(acc.id, 'amount', Number(e.target.value))} />
                              </div>
                              {cat === 'savings' && (
                                <>
                                  <div>
                                    <label className="text-xs text-slate-500 block mb-0.5">금리 %</label>
                                    <Input type="number" step="0.1" value={ed.interestRate ?? ''} onChange={e => updateEdit(acc.id, 'interestRate', e.target.value ? Number(e.target.value) : undefined)} />
                                  </div>
                                  <div>
                                    <label className="text-xs text-slate-500 block mb-0.5">만기일 <span className="text-slate-600">(없으면 공란)</span></label>
                                    <Input type="date" value={ed.maturityDate ?? ''} onChange={e => updateEdit(acc.id, 'maturityDate', e.target.value || undefined)} />
                                  </div>
                                </>
                              )}
                              {cat === 'loan' && (
                                <div>
                                  <label className="text-xs text-slate-500 block mb-0.5">대출금리 %</label>
                                  <Input type="number" step="0.1" value={ed.loanRate ?? ''} onChange={e => updateEdit(acc.id, 'loanRate', e.target.value ? Number(e.target.value) : undefined)} />
                                </div>
                              )}
                            </div>
                            {/* 행 저장/취소 버튼 */}
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => saveItem(acc.id)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 text-th-text text-xs font-medium rounded-lg hover:bg-blue-600 transition-colors"
                              >
                                <Check size={12} /> 저장
                              </button>
                              <button
                                onClick={() => cancelEdit(acc.id)}
                                className="px-3 py-1.5 text-slate-400 text-xs rounded-lg hover:bg-th-input transition-colors"
                              >
                                취소
                              </button>
                              <div className="flex-1" />
                              <DeleteButton onClick={() => deleteItem(acc.id)} />
                            </div>
                          </div>
                        ) : (
                          <div className="flex-1 flex items-center justify-between min-w-0">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-th-text">{acc.name}</p>
                              <p className="text-xs text-slate-500">
                                {acc.institution}
                                {acc.interestRate != null && ` · ${acc.interestRate}%`}
                                {acc.loanRate != null && ` · ${acc.loanRate}%`}
                                {acc.maturityDate && ` · 만기 ${acc.maturityDate}`}
                                {cat === 'savings' && !acc.maturityDate && ' · 자유/청약'}
                              </p>
                            </div>
                            <p className={`text-sm font-semibold flex-shrink-0 ml-3 ${cat === 'loan' ? 'text-red-400' : 'text-th-text'}`}>
                              {cat === 'loan' ? '-' : ''}{formatKRWFull(acc.amount)}
                            </p>
                          </div>
                        )}
                      </div>
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
