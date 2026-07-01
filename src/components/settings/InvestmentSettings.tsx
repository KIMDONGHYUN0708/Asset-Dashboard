'use client';
import { useState } from 'react';
import { useAssetStore } from '@/lib/store';
import { Investment, Transaction } from '@/lib/types';
import { formatKRW, calcROI, formatPercent, calcInvestmentStats } from '@/lib/utils';
import SettingsShell, { FormRow, Input, Select, SaveButton, DeleteButton } from './SettingsShell';
import { Plus, TrendingUp, TrendingDown, ChevronDown, ChevronUp, List } from 'lucide-react';
import CountryFlag from '@/components/CountryFlag';

const INSTITUTIONS = ['키움증권', '미래에셋', '업비트', '빗썸', '한국투자증권', 'KB증권', '기타'];
const SECTORS = ['IT/반도체', 'IT/플랫폼', '금융', '바이오', '에너지', '소비재', '가상자산', '금', '기타'];
const COUNTRIES = [
  { code: 'kr', label: '🇰🇷 한국' },
  { code: 'us', label: '🇺🇸 미국' },
  { code: 'jp', label: '🇯🇵 일본' },
  { code: 'cn', label: '🇨🇳 중국' },
  { code: 'gb', label: '🇬🇧 영국' },
  { code: 'de', label: '🇩🇪 독일' },
];

const blank = (): Omit<Investment, 'id'> => ({
  type: 'stock', name: '', ticker: '', sector: 'IT/반도체',
  quantity: 0, purchasePrice: 0, currentPrice: 0,
  dailyChangeRate: 0, purchaseDate: '2025-01-01', institution: '키움증권',
  transactions: [],
});

const blankTx = (): Omit<Transaction, 'id'> => ({
  date: new Date().toISOString().slice(0, 10),
  quantity: 0, price: 0, note: '',
});

export default function InvestmentSettings() {
  const { investments, setStore } = useAssetStore();
  const [editing, setEditing] = useState<Record<string, Investment>>({});
  const [adding, setAdding] = useState(false);
  const [newItem, setNewItem] = useState<Omit<Investment, 'id'>>(blank());
  const [saved, setSaved] = useState(false);
  const [txOpen, setTxOpen] = useState<Record<string, boolean>>({});
  const [newTx, setNewTx] = useState<Record<string, Omit<Transaction, 'id'>>>({});

  const startEdit = (inv: Investment) => setEditing(p => ({ ...p, [inv.id]: { ...inv, transactions: [...(inv.transactions ?? [])] } }));
  const updateEdit = (id: string, field: keyof Investment, value: unknown) =>
    setEditing(p => ({ ...p, [id]: { ...p[id], [field]: value } }));

  const saveAll = () => {
    setStore({ investments: investments.map(i => editing[i.id] ?? i) });
    setEditing({});
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const deleteItem = (id: string) => setStore({ investments: investments.filter(i => i.id !== id) });

  const addItem = () => {
    const inv: Investment = { ...newItem, id: `inv-${Date.now()}` };
    setStore({ investments: [...investments, inv] });
    setAdding(false);
    setNewItem(blank());
  };

  // 트랜잭션 추가
  const addTx = (invId: string) => {
    const tx = newTx[invId];
    if (!tx || !tx.price || !tx.quantity) return;
    const newTxObj: Transaction = { ...tx, id: `tx-${Date.now()}` };
    setEditing(p => {
      const cur = p[invId];
      if (!cur) return p;
      const txs = [...(cur.transactions ?? []), newTxObj];
      const stats = { ...cur };
      // auto-recalc quantity/purchasePrice from txs
      const totalQty = txs.reduce((s, t) => s + t.quantity, 0);
      const totalInv = txs.reduce((s, t) => s + t.price * t.quantity, 0);
      return { ...p, [invId]: { ...cur, transactions: txs, quantity: totalQty, purchasePrice: Math.round(totalInv / totalQty) } };
    });
    setNewTx(p => ({ ...p, [invId]: blankTx() }));
  };

  // 트랜잭션 삭제
  const deleteTx = (invId: string, txId: string) => {
    setEditing(p => {
      const cur = p[invId];
      if (!cur) return p;
      const txs = (cur.transactions ?? []).filter(t => t.id !== txId);
      const totalQty = txs.reduce((s, t) => s + t.quantity, 0);
      const totalInv = txs.reduce((s, t) => s + t.price * t.quantity, 0);
      return { ...p, [invId]: { ...cur, transactions: txs, quantity: totalQty, purchasePrice: txs.length > 0 ? Math.round(totalInv / totalQty) : 0 } };
    });
  };

  const TYPE_GROUPS = [
    { key: 'stock', label: '주식' },
    { key: 'crypto', label: '가상자산' },
    { key: 'gold', label: '금' },
  ] as const;

  return (
    <SettingsShell
      title="투자 자산"
      description="주식 · 가상자산 · 금. 매수 이력(적립식)은 종목을 펼쳐서 회차별 입력하세요."
      action={
        <div className="flex gap-2">
          <button onClick={() => setAdding(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-300 border border-slate-700 rounded-lg hover:bg-slate-800 transition-colors">
            <Plus size={14} /> 추가
          </button>
          <SaveButton onClick={saveAll} label={saved ? '✓ 저장됨' : '저장'} />
        </div>
      }
    >
      {/* 추가 폼 */}
      {adding && (
        <div className="p-4 rounded-xl border border-blue-500/30 bg-blue-500/5 mb-5">
          <p className="text-sm font-medium text-blue-400 mb-3">새 투자 종목 추가</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div><label className="text-xs text-slate-500 mb-1 block">구분</label>
              <Select value={newItem.type} onChange={e => setNewItem(p => ({ ...p, type: e.target.value as Investment['type'] }))}>
                <option value="stock">주식</option>
                <option value="crypto">가상자산</option>
                <option value="gold">금</option>
              </Select>
            </div>
            <div><label className="text-xs text-slate-500 mb-1 block">종목명 *</label>
              <Input value={newItem.name} onChange={e => setNewItem(p => ({ ...p, name: e.target.value }))} placeholder="삼성전자" />
            </div>
            <div><label className="text-xs text-slate-500 mb-1 block">티커/코드</label>
              <Input value={newItem.ticker ?? ''} onChange={e => setNewItem(p => ({ ...p, ticker: e.target.value }))} placeholder="005930" />
            </div>
            <div><label className="text-xs text-slate-500 mb-1 block">섹터</label>
              <Select value={newItem.sector ?? ''} onChange={e => setNewItem(p => ({ ...p, sector: e.target.value }))}>
                {SECTORS.map(s => <option key={s}>{s}</option>)}
              </Select>
            </div>
            <div><label className="text-xs text-slate-500 mb-1 block">증권사/거래소</label>
              <Select value={newItem.institution ?? ''} onChange={e => setNewItem(p => ({ ...p, institution: e.target.value }))}>
                {INSTITUTIONS.map(i => <option key={i}>{i}</option>)}
              </Select>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">
                초기 현재가 ({newItem.type === 'gold' ? '원/돈' : '원'})
                <span className="text-slate-600"> — {newItem.type === 'gold' ? '1돈(3.75g) 기준, API 자동 갱신' : 'API 없을 때 기준값'}</span>
              </label>
              <Input type="number" value={newItem.currentPrice || ''} onChange={e => setNewItem(p => ({ ...p, currentPrice: Number(e.target.value) }))} placeholder={newItem.type === 'gold' ? '예: 382500' : ''} />
            </div>
            <div><label className="text-xs text-slate-500 mb-1 block">상장 국가</label>
              <Select value={newItem.country ?? 'kr'} onChange={e => setNewItem(p => ({ ...p, country: e.target.value }))}>
                {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
              </Select>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-3 mb-1">* 매수 이력은 저장 후 종목 패널에서 추가할 수 있습니다.</p>
          <div className="flex gap-2 mt-2">
            <button onClick={addItem} className="px-4 py-1.5 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600">추가</button>
            <button onClick={() => setAdding(false)} className="px-4 py-1.5 text-slate-400 text-sm rounded-lg hover:bg-slate-800">취소</button>
          </div>
        </div>
      )}

      {TYPE_GROUPS.map(({ key, label }) => {
        const items = investments.filter(i => i.type === key);
        if (items.length === 0) return null;
        return (
          <div key={key} className="mb-5">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">{label}</p>
            <div className="space-y-2">
              {items.map(inv => {
                const ed = editing[inv.id];
                const cur = ed ?? inv;
                const { avgPrice, totalQty, totalInvested } = calcInvestmentStats(cur);
                const currentValue = cur.currentPrice * totalQty;
                const profit = currentValue - totalInvested;
                const roi = totalInvested > 0 ? (profit / totalInvested) * 100 : 0;
                const isEditing = !!ed;
                const txs = (ed?.transactions ?? inv.transactions ?? []).sort((a, b) => a.date.localeCompare(b.date));
                const isTxOpen = txOpen[inv.id] ?? false;

                return (
                  <div key={inv.id} className={`rounded-xl transition-colors ${isEditing ? 'bg-slate-800 border border-slate-700' : 'bg-slate-800/40 hover:bg-slate-800/60'}`}>
                    {/* 헤더 행 */}
                    <div
                      className={`p-3 ${isEditing ? '' : 'cursor-pointer'}`}
                      onClick={() => !isEditing && startEdit(inv)}
                    >
                      {isEditing ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          <div><label className="text-xs text-slate-500 mb-0.5 block">종목명</label>
                            <Input value={ed.name} onChange={e => updateEdit(inv.id, 'name', e.target.value)} />
                          </div>
                          <div><label className="text-xs text-slate-500 mb-0.5 block">현재가 (원) <span className="text-slate-600">— 실시간 API 자동 갱신</span></label>
                            <Input type="number" value={ed.currentPrice} onChange={e => updateEdit(inv.id, 'currentPrice', Number(e.target.value))} />
                          </div>
                          <div><label className="text-xs text-slate-500 mb-0.5 block">섹터</label>
                            <Select value={ed.sector ?? ''} onChange={e => updateEdit(inv.id, 'sector', e.target.value)}>
                              {SECTORS.map(s => <option key={s}>{s}</option>)}
                            </Select>
                          </div>
                          <div><label className="text-xs text-slate-500 mb-0.5 block">증권사</label>
                            <Select value={ed.institution ?? ''} onChange={e => updateEdit(inv.id, 'institution', e.target.value)}>
                              {INSTITUTIONS.map(i => <option key={i}>{i}</option>)}
                            </Select>
                          </div>
                          <div><label className="text-xs text-slate-500 mb-0.5 block">일간등락률 %</label>
                            <Input type="number" step="0.01" value={ed.dailyChangeRate ?? 0} onChange={e => updateEdit(inv.id, 'dailyChangeRate', Number(e.target.value))} />
                          </div>
                          <div><label className="text-xs text-slate-500 mb-0.5 block">상장 국가</label>
                            <Select value={ed.country ?? 'kr'} onChange={e => updateEdit(inv.id, 'country', e.target.value)}>
                              {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
                            </Select>
                          </div>
                          <div className="col-span-2 flex items-end gap-1">
                            <div className="flex-1 bg-slate-700/50 rounded-lg p-2 text-xs text-slate-400">
                              수량 <span className="text-white font-medium">{totalQty.toLocaleString()}{inv.type === 'gold' ? '돈' : inv.type === 'stock' ? '주' : '개'}</span> ·
                              평균단가 <span className="text-white font-medium">{formatKRW(Math.round(avgPrice))}{inv.type === 'gold' ? '/돈' : ''}</span>
                              <span className="text-slate-600 ml-1">(매수이력 자동계산)</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              {inv.country && <CountryFlag country={inv.country} size={15} />}
                              <span className="text-sm font-medium text-white">{inv.name}</span>
                              {inv.ticker && <span className="text-xs text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">{inv.ticker}</span>}
                              {inv.sector && <span className="text-xs text-blue-400 bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 rounded">{inv.sector}</span>}
                              {txs.length > 0 && (
                                <span className="text-xs text-slate-500 bg-slate-700/60 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                  <List size={9} />{txs.length}회 매수
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {totalQty.toLocaleString()}{inv.type === 'gold' ? '돈' : inv.type === 'stock' ? '주' : '개'} · 평균 {formatKRW(Math.round(avgPrice))}{inv.type === 'gold' ? '/돈' : ''} · 현재 {formatKRW(inv.currentPrice)}{inv.type === 'gold' ? '/돈' : ''} · {inv.institution}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-white">{formatKRW(currentValue)}</p>
                            <p className={`text-xs font-medium ${profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                              {profit >= 0 ? <TrendingUp size={11} className="inline mr-0.5"/> : <TrendingDown size={11} className="inline mr-0.5"/>}
                              {profit >= 0 ? '+' : ''}{formatKRW(profit)} ({formatPercent(roi)})
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 매수 이력 아코디언 (편집 중일 때만) */}
                    {isEditing && (
                      <div className="border-t border-slate-700 mx-3 mb-2">
                        <button
                          onClick={() => setTxOpen(p => ({ ...p, [inv.id]: !isTxOpen }))}
                          className="flex items-center gap-1.5 w-full text-xs text-slate-400 hover:text-white py-2 transition-colors"
                        >
                          {isTxOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                          매수 이력 관리 ({txs.length}회)
                        </button>

                        {isTxOpen && (
                          <div className="pb-3 space-y-2">
                            {/* 기존 이력 */}
                            {txs.map((tx, i) => (
                              <div key={tx.id} className="flex items-center gap-2 p-2 rounded-lg bg-slate-700/40">
                                <span className="w-6 h-6 rounded-md bg-blue-500/10 text-blue-400 text-xs flex items-center justify-center font-bold flex-shrink-0">{i + 1}</span>
                                <span className="text-xs text-slate-400 w-20 flex-shrink-0">{tx.date}</span>
                                <span className="text-xs text-white">
                                  {tx.quantity.toLocaleString()}{inv.type === 'gold' ? '돈' : inv.type === 'stock' ? '주' : '개'}
                                </span>
                                <span className="text-xs text-white">@ {formatKRW(tx.price)}{inv.type === 'gold' ? '/돈' : ''}</span>
                                {tx.note && <span className="text-xs text-slate-500 flex-1 truncate">{tx.note}</span>}
                                <button onClick={() => deleteTx(inv.id, tx.id)}
                                  className="ml-auto text-slate-600 hover:text-red-400 transition-colors text-xs">✕</button>
                              </div>
                            ))}

                            {/* 새 이력 추가 */}
                            <div className="p-2 rounded-lg bg-blue-500/5 border border-blue-500/20 space-y-2">
                              <p className="text-xs text-blue-400 font-medium">+ 매수 이력 추가</p>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                <div>
                                  <label className="text-xs text-slate-500 block mb-0.5">매수일</label>
                                  <Input type="date"
                                    value={newTx[inv.id]?.date ?? blankTx().date}
                                    onChange={e => setNewTx(p => ({ ...p, [inv.id]: { ...(p[inv.id] ?? blankTx()), date: e.target.value } }))} />
                                </div>
                                <div>
                                  <label className="text-xs text-slate-500 block mb-0.5">
                                    수량{inv.type === 'gold' ? ' (돈)' : inv.type === 'stock' ? ' (주)' : ' (개)'}
                                  </label>
                                  <Input type="number" step="any"
                                    value={newTx[inv.id]?.quantity || ''}
                                    placeholder="0"
                                    onChange={e => setNewTx(p => ({ ...p, [inv.id]: { ...(p[inv.id] ?? blankTx()), quantity: Number(e.target.value) } }))} />
                                </div>
                                <div>
                                  <label className="text-xs text-slate-500 block mb-0.5">
                                    매수가 ({inv.type === 'gold' ? '원/돈' : '원'})
                                  </label>
                                  <Input type="number"
                                    value={newTx[inv.id]?.price || ''}
                                    placeholder="0"
                                    onChange={e => setNewTx(p => ({ ...p, [inv.id]: { ...(p[inv.id] ?? blankTx()), price: Number(e.target.value) } }))} />
                                </div>
                                <div>
                                  <label className="text-xs text-slate-500 block mb-0.5">메모 (선택)</label>
                                  <Input
                                    value={newTx[inv.id]?.note ?? ''}
                                    placeholder="1차 매수"
                                    onChange={e => setNewTx(p => ({ ...p, [inv.id]: { ...(p[inv.id] ?? blankTx()), note: e.target.value } }))} />
                                </div>
                              </div>
                              <button onClick={() => addTx(inv.id)}
                                className="px-3 py-1 bg-blue-500 text-white text-xs rounded-lg hover:bg-blue-600 transition-colors">
                                이력 추가
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex justify-end px-3 pb-2">
                      <DeleteButton onClick={() => deleteItem(inv.id)} />
                    </div>
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
