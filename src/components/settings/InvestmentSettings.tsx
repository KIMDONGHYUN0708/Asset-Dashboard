'use client';
import { useState, useRef, useEffect } from 'react';
import { useAssetStore } from '@/lib/store';
import { Investment, Transaction } from '@/lib/types';
import { formatKRW, formatPercent, calcInvestmentStats } from '@/lib/utils';
import SettingsShell, { Input, Select, DeleteButton } from './SettingsShell';
import { Plus, TrendingUp, TrendingDown, ChevronDown, ChevronUp, List, Search, Loader2, Check, RefreshCw, ArrowUp, ArrowDown } from 'lucide-react';
import CountryFlag from '@/components/CountryFlag';
import { searchStocks, StockItem } from '@/lib/stockList';

const INST_BY_TYPE: Record<Investment['type'], string[]> = {
  stock:  ['키움증권', '미래에셋', 'KB증권', '신한투자', 'NH투자증권', '삼성증권', '한국투자증권', '하나증권', '교보증권', '대신증권', '메리츠증권', '한화투자증권', '기타'],
  crypto: ['업비트', '빗썸', '코인원', '코빗', '바이낸스', 'OKX', '바이비트', '기타'],
  gold:   ['KRX 금시장', '하나은행 골드바', 'KB국민 금통장', '한국조폐공사', '신한은행', '은행/금은방', '기타'],
};
const INST_LABEL: Record<Investment['type'], string> = {
  stock: '증권사', crypto: '거래소', gold: '구매처',
};
const SECTORS = ['IT/반도체', 'IT/플랫폼', '금융', '바이오', '에너지', 'ETF', '소비재', '가상자산', '금', '기타'];
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
  dailyChangeRate: 0, purchaseDate: new Date().toISOString().slice(0, 10),
  institution: '키움증권', transactions: [],
});
const blankTx = (): Omit<Transaction, 'id'> => ({
  date: new Date().toISOString().slice(0, 10), quantity: 0, price: 0, note: '',
});

// ── 자동검색 드롭다운 ──────────────────────────────────────────────────────
function StockSearchInput({
  type, value, onChange, onSelect, placeholder,
}: {
  type: Investment['type'];
  value: string;
  onChange: (v: string) => void;
  onSelect: (s: StockItem) => void;
  placeholder?: string;
}) {
  const [results, setResults] = useState<StockItem[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleChange = (v: string) => {
    onChange(v);
    if (v.length >= 1) {
      const found = searchStocks(v, type).slice(0, 15);
      setResults(found);
      setOpen(found.length > 0);
    } else {
      setOpen(false);
    }
  };

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
        <input
          value={value}
          onChange={e => handleChange(e.target.value)}
          placeholder={placeholder ?? '종목명 또는 코드 검색'}
          className="w-full bg-slate-700/50 border border-slate-600/50 rounded-lg pl-7 pr-3 py-1.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50"
        />
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl max-h-52 overflow-y-auto">
          {results.map(s => (
            <button
              key={s.ticker}
              onMouseDown={() => { onSelect(s); setOpen(false); }}
              className="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-700 transition-colors text-left"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white font-medium truncate">{s.name}</p>
                <p className="text-xs text-slate-500">{s.ticker} · {s.market}</p>
              </div>
              <span className="text-xs text-blue-400 bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 rounded flex-shrink-0">
                {s.sector}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── 현재 시세 불러오기 ─────────────────────────────────────────────────────
async function fetchPrice(ticker: string, type: Investment['type'], country: string): Promise<{ price: number; supported: boolean }> {
  if (type === 'gold') {
    const res = await fetch('/api/prices/gold');
    if (!res.ok) throw new Error('금 시세 조회 실패');
    const d = await res.json();
    return { price: Math.round(d.pricePerDon), supported: true };
  }
  if (type === 'crypto') {
    if (!['BTC', 'ETH'].includes(ticker.toUpperCase())) return { price: 0, supported: false };
    const res = await fetch('/api/prices/crypto');
    if (!res.ok) throw new Error('코인 시세 조회 실패');
    const d = await res.json();
    const p = d[ticker.toUpperCase()]?.price;
    if (!p) return { price: 0, supported: false };
    return { price: Math.round(p), supported: true };
  }
  // stock — 한국 종목만 KIS API 지원
  if (country !== 'kr') return { price: 0, supported: false };
  const res = await fetch(`/api/prices/stocks?tickers=${ticker}`);
  if (!res.ok) throw new Error('주식 시세 조회 실패');
  const d = await res.json();
  const p = d.prices?.[ticker]?.price;
  if (!p) return { price: 0, supported: false };
  return { price: p, supported: true };
}

// ── 메인 컴포넌트 ──────────────────────────────────────────────────────────
export default function InvestmentSettings() {
  const { investments, setStore } = useAssetStore();
  const [editing, setEditing] = useState<Record<string, Investment>>({});
  const [adding, setAdding] = useState(false);
  const [newItem, setNewItem] = useState<Omit<Investment, 'id'>>(blank());
  const [newSearch, setNewSearch] = useState('');
  const [txOpen, setTxOpen] = useState<Record<string, boolean>>({});
  const [newTx, setNewTx] = useState<Record<string, Omit<Transaction, 'id'>>>({});
  const [priceFetching, setPriceFetching] = useState<Record<string, boolean>>({});
  const [priceMsg, setPriceMsg] = useState<Record<string, string>>({});
  const [editTx, setEditTx] = useState<Record<string, Record<string, Transaction>>>({}); // invId → txId → tx

  const startEdit = (inv: Investment) =>
    setEditing(p => ({ ...p, [inv.id]: { ...inv, transactions: [...(inv.transactions ?? [])] } }));

  const cancelEdit = (id: string) =>
    setEditing(p => { const n = { ...p }; delete n[id]; return n; });

  const saveItem = (id: string) => {
    setStore({ investments: investments.map(i => i.id === id ? editing[id] : i) });
    cancelEdit(id);
  };

  const updateEdit = (id: string, field: keyof Investment, value: unknown) =>
    setEditing(p => ({ ...p, [id]: { ...p[id], [field]: value } }));

  const deleteItem = (id: string) => setStore({ investments: investments.filter(i => i.id !== id) });

  const moveInvestment = (id: string, dir: 'up' | 'down') => {
    const inv = investments.find(i => i.id === id);
    if (!inv) return;
    const sameType = investments.filter(i => i.type === inv.type);
    const idx = sameType.findIndex(i => i.id === id);
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sameType.length) return;
    const result = [...investments];
    const ai = result.findIndex(i => i.id === id);
    const bi = result.findIndex(i => i.id === sameType[swapIdx].id);
    [result[ai], result[bi]] = [result[bi], result[ai]];
    setStore({ investments: result });
  };

  const addItem = () => {
    const txs: Transaction[] = (newItem.quantity > 0 && newItem.purchasePrice > 0)
      ? [{ id: `tx-${Date.now()}`, date: newItem.purchaseDate, quantity: newItem.quantity, price: newItem.purchasePrice, note: '' }]
      : [];
    setStore({
      investments: [...investments, {
        ...newItem,
        id: `inv-${Date.now()}`,
        transactions: txs,
        currentPrice: newItem.purchasePrice || 0,
      }],
    });
    setAdding(false);
    setNewItem(blank());
    setNewSearch('');
  };

  const handleNewTypeChange = (type: Investment['type']) =>
    setNewItem(p => ({ ...p, type, institution: INST_BY_TYPE[type][0], ticker: '', name: '', sector: type === 'gold' ? '금' : type === 'crypto' ? '가상자산' : 'IT/반도체', country: 'kr' }));

  const handleNewSelect = (s: StockItem) => {
    setNewSearch(s.name);
    setNewItem(p => ({ ...p, name: s.name, ticker: s.ticker, sector: s.sector, country: s.country }));
  };

  // 시세 불러오기 (add form)
  const fetchNewPrice = async () => {
    const key = '__new__';
    setPriceFetching(p => ({ ...p, [key]: true }));
    setPriceMsg(p => ({ ...p, [key]: '' }));
    try {
      const { price, supported } = await fetchPrice(newItem.ticker ?? '', newItem.type, newItem.country ?? 'kr');
      if (!supported) {
        setPriceMsg(p => ({ ...p, [key]: 'KIS API는 한국 주식·BTC·ETH만 지원합니다. 직접 입력해 주세요.' }));
      } else {
        setNewItem(prev => ({ ...prev, currentPrice: price }));
        setPriceMsg(p => ({ ...p, [key]: `✓ ${price.toLocaleString()}원 반영됨` }));
      }
    } catch (e: unknown) {
      setPriceMsg(p => ({ ...p, [key]: e instanceof Error ? e.message : '조회 실패' }));
    } finally {
      setPriceFetching(p => ({ ...p, [key]: false }));
    }
  };

  // 시세 불러오기 (edit row)
  const fetchEditPrice = async (inv: Investment) => {
    const ed = editing[inv.id];
    if (!ed) return;
    setPriceFetching(p => ({ ...p, [inv.id]: true }));
    setPriceMsg(p => ({ ...p, [inv.id]: '' }));
    try {
      const { price, supported } = await fetchPrice(ed.ticker ?? '', ed.type, ed.country ?? 'kr');
      if (!supported) {
        setPriceMsg(p => ({ ...p, [inv.id]: 'KIS API는 한국 주식·BTC·ETH만 지원합니다.' }));
      } else {
        updateEdit(inv.id, 'currentPrice', price);
        setPriceMsg(p => ({ ...p, [inv.id]: `✓ ${price.toLocaleString()}원 반영됨` }));
      }
    } catch (e: unknown) {
      setPriceMsg(p => ({ ...p, [inv.id]: e instanceof Error ? e.message : '조회 실패' }));
    } finally {
      setPriceFetching(p => ({ ...p, [inv.id]: false }));
    }
  };

  const addTx = (invId: string) => {
    const tx = newTx[invId];
    if (!tx || !tx.price || !tx.quantity) return;
    const newTxObj: Transaction = { ...tx, id: `tx-${Date.now()}` };
    setEditing(p => {
      const cur = p[invId];
      if (!cur) return p;
      const txs = [...(cur.transactions ?? []), newTxObj];
      const totalQty = txs.reduce((s, t) => s + t.quantity, 0);
      const totalInv = txs.reduce((s, t) => s + t.price * t.quantity, 0);
      return { ...p, [invId]: { ...cur, transactions: txs, quantity: totalQty, purchasePrice: Math.round(totalInv / totalQty) } };
    });
    setNewTx(p => ({ ...p, [invId]: blankTx() }));
  };

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

  const startEditTx = (invId: string, tx: Transaction) =>
    setEditTx(p => ({ ...p, [invId]: { ...(p[invId] ?? {}), [tx.id]: { ...tx } } }));

  const cancelEditTx = (invId: string, txId: string) =>
    setEditTx(p => {
      const inner = { ...(p[invId] ?? {}) };
      delete inner[txId];
      return { ...p, [invId]: inner };
    });

  const updateEditTx = (invId: string, txId: string, field: keyof Transaction, value: unknown) =>
    setEditTx(p => ({
      ...p,
      [invId]: { ...(p[invId] ?? {}), [txId]: { ...(p[invId]?.[txId] as Transaction), [field]: value } },
    }));

  const saveEditTx = (invId: string, txId: string) => {
    const tx = editTx[invId]?.[txId];
    if (!tx) return;
    setEditing(p => {
      const cur = p[invId];
      if (!cur) return p;
      const txs = (cur.transactions ?? []).map(t => t.id === txId ? tx : t);
      const totalQty = txs.reduce((s, t) => s + t.quantity, 0);
      const totalInv = txs.reduce((s, t) => s + t.price * t.quantity, 0);
      return { ...p, [invId]: { ...cur, transactions: txs, quantity: totalQty, purchasePrice: totalQty > 0 ? Math.round(totalInv / totalQty) : 0 } };
    });
    cancelEditTx(invId, txId);
  };

  const TYPE_GROUPS = [
    { key: 'stock' as const, label: '주식' },
    { key: 'crypto' as const, label: '가상자산' },
    { key: 'gold' as const, label: '금' },
  ];

  const canFetchPrice = (type: Investment['type'], ticker: string, country: string) => {
    if (type === 'gold') return true;
    if (!ticker) return false;
    if (type === 'crypto') return ['BTC', 'ETH'].includes(ticker.toUpperCase());
    return country === 'kr';
  };

  return (
    <SettingsShell
      title="투자 자산"
      description="주식 · 가상자산 · 금. 매수 이력(적립식)은 종목을 펼쳐서 회차별 입력하세요."
      action={
        <button
          onClick={() => { setAdding(true); setNewItem(blank()); setNewSearch(''); }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-300 border border-slate-700 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <Plus size={14} /> 종목 등록
        </button>
      }
    >
      {/* ── 등록 폼 ── */}
      {adding && (
        <div className="p-4 rounded-xl border border-blue-500/30 bg-blue-500/5 mb-5">
          <p className="text-sm font-medium text-blue-400 mb-3">새 투자 종목 등록</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {/* 구분 */}
            <div>
              <label className="text-xs text-slate-500 mb-1 block">구분</label>
              <Select value={newItem.type} onChange={e => handleNewTypeChange(e.target.value as Investment['type'])}>
                <option value="stock">주식</option>
                <option value="crypto">가상자산</option>
                <option value="gold">금</option>
              </Select>
            </div>

            {/* 종목 검색 */}
            {newItem.type !== 'gold' ? (
              <div className="col-span-2">
                <label className="text-xs text-slate-500 mb-1 block">
                  종목 검색
                  <span className="text-slate-600 ml-1">— 이름 또는 코드 입력 시 자동완성</span>
                </label>
                <StockSearchInput
                  type={newItem.type}
                  value={newSearch}
                  onChange={v => { setNewSearch(v); setNewItem(p => ({ ...p, name: v })); }}
                  onSelect={handleNewSelect}
                  placeholder={newItem.type === 'stock' ? '삼성전자, 005930...' : 'BTC, 비트코인...'}
                />
              </div>
            ) : (
              <div>
                <label className="text-xs text-slate-500 mb-1 block">품목명</label>
                <Input value={newItem.name} onChange={e => setNewItem(p => ({ ...p, name: e.target.value }))} placeholder="순금 3.75g" />
              </div>
            )}

            {/* 종목코드 — 주식·코인은 항상 노출 (자동완성 없으면 수동 입력) */}
            {newItem.type !== 'gold' && (
              <div>
                <label className="text-xs text-slate-500 mb-1 block">
                  종목코드 / 심볼
                  {!newItem.ticker && <span className="text-slate-600 ml-1">— 직접 입력 가능</span>}
                </label>
                <Input
                  value={newItem.ticker ?? ''}
                  onChange={e => setNewItem(p => ({ ...p, ticker: e.target.value.toUpperCase() }))}
                  placeholder={newItem.type === 'stock' ? '005930' : 'BTC'}
                />
              </div>
            )}
            <div>
              <label className="text-xs text-slate-500 mb-1 block">섹터</label>
              <Select value={newItem.sector ?? '기타'} onChange={e => setNewItem(p => ({ ...p, sector: e.target.value }))}>
                {SECTORS.map(s => <option key={s}>{s}</option>)}
              </Select>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">계좌 구분</label>
              <Select value={newItem.accountType ?? ''} onChange={e => setNewItem(p => ({ ...p, accountType: e.target.value === 'pension' ? 'pension' : undefined }))}>
                <option value="">일반 계좌</option>
                <option value="pension">연금저축 계좌</option>
              </Select>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">{INST_LABEL[newItem.type]}</label>
              <Select value={newItem.institution ?? ''} onChange={e => setNewItem(p => ({ ...p, institution: e.target.value }))}>
                {INST_BY_TYPE[newItem.type].map(i => <option key={i}>{i}</option>)}
              </Select>
            </div>
            {newItem.type === 'stock' && (
              <div>
                <label className="text-xs text-slate-500 mb-1 block">상장 국가</label>
                <Select value={newItem.country ?? 'kr'} onChange={e => setNewItem(p => ({ ...p, country: e.target.value }))}>
                  {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
                </Select>
              </div>
            )}

            {/* 수량 */}
            <div>
              <label className="text-xs text-slate-500 mb-1 block">
                수량
                <span className="text-slate-600 ml-1">
                  {newItem.type === 'gold' ? '(돈)' : newItem.type === 'stock' ? '(주)' : '(개)'}
                </span>
              </label>
              <Input
                type="number"
                step="any"
                value={newItem.quantity || ''}
                onChange={e => setNewItem(p => ({ ...p, quantity: Number(e.target.value) }))}
                placeholder="0"
              />
            </div>

            {/* 매수 단가 */}
            <div>
              <label className="text-xs text-slate-500 mb-1 block">
                매수 단가
                <span className="text-slate-600 ml-1">
                  ({newItem.type === 'gold' ? '원/돈' : '원'})
                </span>
              </label>
              <Input
                type="number"
                value={newItem.purchasePrice || ''}
                onChange={e => setNewItem(p => ({ ...p, purchasePrice: Number(e.target.value) }))}
                placeholder="0"
              />
            </div>

            {/* 매수일 */}
            <div>
              <label className="text-xs text-slate-500 mb-1 block">매수일</label>
              <Input
                type="date"
                value={newItem.purchaseDate}
                onChange={e => setNewItem(p => ({ ...p, purchaseDate: e.target.value }))}
              />
            </div>
          </div>

          {/* 투자 금액 미리보기 */}
          {newItem.quantity > 0 && newItem.purchasePrice > 0 && (
            <div className="mt-3 px-3 py-2 rounded-lg bg-slate-800/60 border border-slate-700/50 text-xs text-slate-400 flex items-center gap-2">
              <span>총 투자금액</span>
              <span className="text-white font-semibold tabular-nums">
                {(newItem.quantity * newItem.purchasePrice).toLocaleString()}원
              </span>
              <span className="text-slate-600">
                ({newItem.quantity.toLocaleString()}{newItem.type === 'gold' ? '돈' : newItem.type === 'stock' ? '주' : '개'} × {newItem.purchasePrice.toLocaleString()}원)
              </span>
            </div>
          )}

          <div className="flex gap-2 mt-3">
            <button
              onClick={addItem}
              disabled={!newItem.name}
              className="px-4 py-1.5 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 disabled:opacity-50"
            >
              등록 완료
            </button>
            <button
              onClick={() => { setAdding(false); setNewItem(blank()); setNewSearch(''); }}
              className="px-4 py-1.5 text-slate-400 text-sm rounded-lg hover:bg-slate-800"
            >
              취소
            </button>
          </div>
        </div>
      )}

      {/* ── 종목 목록 ── */}
      {TYPE_GROUPS.map(({ key, label }) => {
        const items = investments.filter(i => i.type === key);
        if (items.length === 0) return null;
        return (
          <div key={key} className="mb-5">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">{label}</p>
            <div className="space-y-2">
              {items.map((inv, itemIdx) => {
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
                    <div className={`p-3 ${isEditing ? '' : 'cursor-pointer'}`} onClick={() => !isEditing && startEdit(inv)}>
                      {isEditing ? (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            <div>
                              <label className="text-xs text-slate-500 mb-0.5 block">종목명</label>
                              <Input value={ed.name} onChange={e => updateEdit(inv.id, 'name', e.target.value)} />
                            </div>
                            {inv.type !== 'gold' && (
                              <div>
                                <label className="text-xs text-slate-500 mb-0.5 block">티커/심볼</label>
                                <Input value={ed.ticker ?? ''} onChange={e => updateEdit(inv.id, 'ticker', e.target.value.toUpperCase())} />
                              </div>
                            )}
                            <div>
                              <label className="text-xs text-slate-500 mb-0.5 block">섹터</label>
                              <Select value={ed.sector ?? ''} onChange={e => updateEdit(inv.id, 'sector', e.target.value)}>
                                {SECTORS.map(s => <option key={s}>{s}</option>)}
                              </Select>
                            </div>
                            <div>
                              <label className="text-xs text-slate-500 mb-0.5 block">{INST_LABEL[inv.type]}</label>
                              <Select value={ed.institution ?? ''} onChange={e => updateEdit(inv.id, 'institution', e.target.value)}>
                                {INST_BY_TYPE[inv.type].map(i => <option key={i}>{i}</option>)}
                              </Select>
                            </div>
                            <div>
                              <label className="text-xs text-slate-500 mb-0.5 block">계좌 구분</label>
                              <Select value={ed.accountType ?? ''} onChange={e => updateEdit(inv.id, 'accountType', e.target.value === 'pension' ? 'pension' : undefined)}>
                                <option value="">일반 계좌</option>
                                <option value="pension">연금저축 계좌</option>
                              </Select>
                            </div>
                            {inv.type === 'stock' && (
                              <div>
                                <label className="text-xs text-slate-500 mb-0.5 block">상장 국가</label>
                                <Select value={ed.country ?? 'kr'} onChange={e => updateEdit(inv.id, 'country', e.target.value)}>
                                  {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
                                </Select>
                              </div>
                            )}
                            <div>
                              <label className="text-xs text-slate-500 mb-0.5 block">
                                현재가 ({inv.type === 'gold' ? '원/돈' : '원'})
                                <span className="text-slate-600 ml-1">— 30초 자동갱신</span>
                              </label>
                              <div className="flex gap-1">
                                <Input type="number" value={ed.currentPrice} onChange={e => updateEdit(inv.id, 'currentPrice', Number(e.target.value))} />
                                <button
                                  onClick={() => fetchEditPrice(inv)}
                                  disabled={priceFetching[inv.id] || !canFetchPrice(inv.type, ed.ticker ?? '', ed.country ?? 'kr')}
                                  className="flex-shrink-0 px-2 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-lg hover:bg-emerald-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                  title="시세 조회"
                                >
                                  {priceFetching[inv.id] ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
                                </button>
                              </div>
                              {priceMsg[inv.id] && (
                                <p className={`text-xs mt-0.5 ${priceMsg[inv.id].startsWith('✓') ? 'text-emerald-400' : 'text-amber-400'}`}>
                                  {priceMsg[inv.id]}
                                </p>
                              )}
                            </div>
                            <div className="col-span-2 flex items-end">
                              <div className="w-full bg-slate-700/50 rounded-lg p-2 text-xs text-slate-400">
                                수량 <span className="text-white font-medium">{totalQty.toLocaleString()}{inv.type === 'gold' ? '돈' : inv.type === 'stock' ? '주' : '개'}</span>
                                {' · '}평균단가 <span className="text-white font-medium">{formatKRW(Math.round(avgPrice))}</span>
                                <span className="text-slate-600 ml-1">(매수이력 자동계산)</span>
                              </div>
                            </div>
                          </div>

                          {/* 매수이력 아코디언 */}
                          <div className="border-t border-slate-700 pt-2">
                            <button
                              onClick={() => setTxOpen(p => ({ ...p, [inv.id]: !isTxOpen }))}
                              className="flex items-center gap-1.5 w-full text-xs text-slate-400 hover:text-white py-1 transition-colors"
                            >
                              {isTxOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                              매수 이력 ({txs.length}회)
                            </button>
                            {isTxOpen && (
                              <div className="mt-2 space-y-2">
                                {txs.map((tx, i) => {
                                  const txEd = editTx[inv.id]?.[tx.id];
                                  if (txEd) {
                                    return (
                                      <div key={tx.id} className="p-2 rounded-lg bg-slate-700/60 border border-blue-500/20 space-y-2">
                                        <p className="text-xs text-blue-400 font-medium">{i + 1}회차 수정</p>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                          <div>
                                            <label className="text-xs text-slate-500 block mb-0.5">매수일</label>
                                            <Input type="date" value={txEd.date}
                                              onChange={e => updateEditTx(inv.id, tx.id, 'date', e.target.value)} />
                                          </div>
                                          <div>
                                            <label className="text-xs text-slate-500 block mb-0.5">수량</label>
                                            <Input type="number" step="any" value={txEd.quantity || ''}
                                              onChange={e => updateEditTx(inv.id, tx.id, 'quantity', Number(e.target.value))} />
                                          </div>
                                          <div>
                                            <label className="text-xs text-slate-500 block mb-0.5">매수가 (원)</label>
                                            <Input type="number" value={txEd.price || ''}
                                              onChange={e => updateEditTx(inv.id, tx.id, 'price', Number(e.target.value))} />
                                          </div>
                                          <div>
                                            <label className="text-xs text-slate-500 block mb-0.5">메모</label>
                                            <Input value={txEd.note ?? ''}
                                              onChange={e => updateEditTx(inv.id, tx.id, 'note', e.target.value)} />
                                          </div>
                                        </div>
                                        <div className="flex gap-2">
                                          <button onClick={() => saveEditTx(inv.id, tx.id)}
                                            className="px-3 py-1 bg-blue-500 text-white text-xs rounded-lg hover:bg-blue-600">
                                            저장
                                          </button>
                                          <button onClick={() => cancelEditTx(inv.id, tx.id)}
                                            className="px-3 py-1 text-slate-400 text-xs rounded-lg hover:bg-slate-700">
                                            취소
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  }
                                  return (
                                    <div key={tx.id}
                                      className="flex items-center gap-2 p-2 rounded-lg bg-slate-700/40 hover:bg-slate-700/60 cursor-pointer group"
                                      onClick={() => startEditTx(inv.id, tx)}
                                    >
                                      <span className="w-5 h-5 rounded bg-blue-500/10 text-blue-400 text-xs flex items-center justify-center font-bold flex-shrink-0">{i + 1}</span>
                                      <span className="text-xs text-slate-400 w-20 flex-shrink-0">{tx.date}</span>
                                      <span className="text-xs text-white">{tx.quantity.toLocaleString()}{inv.type === 'gold' ? '돈' : inv.type === 'stock' ? '주' : '개'}</span>
                                      <span className="text-xs text-white">@ {formatKRW(tx.price)}</span>
                                      {tx.note && <span className="text-xs text-slate-500 flex-1 truncate">{tx.note}</span>}
                                      <span className="ml-auto text-xs text-slate-600 group-hover:text-slate-400 flex-shrink-0">수정</span>
                                      <button
                                        onClick={e => { e.stopPropagation(); deleteTx(inv.id, tx.id); }}
                                        className="text-slate-600 hover:text-red-400 text-xs flex-shrink-0"
                                      >✕</button>
                                    </div>
                                  );
                                })}
                                <div className="p-2 rounded-lg bg-blue-500/5 border border-blue-500/20 space-y-2">
                                  <p className="text-xs text-blue-400 font-medium">+ 매수 이력 추가</p>
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                    <div>
                                      <label className="text-xs text-slate-500 block mb-0.5">매수일</label>
                                      <Input type="date" value={newTx[inv.id]?.date ?? blankTx().date}
                                        onChange={e => setNewTx(p => ({ ...p, [inv.id]: { ...(p[inv.id] ?? blankTx()), date: e.target.value } }))} />
                                    </div>
                                    <div>
                                      <label className="text-xs text-slate-500 block mb-0.5">수량</label>
                                      <Input type="number" step="any" value={newTx[inv.id]?.quantity || ''} placeholder="0"
                                        onChange={e => setNewTx(p => ({ ...p, [inv.id]: { ...(p[inv.id] ?? blankTx()), quantity: Number(e.target.value) } }))} />
                                    </div>
                                    <div>
                                      <label className="text-xs text-slate-500 block mb-0.5">매수가 (원)</label>
                                      <Input type="number" value={newTx[inv.id]?.price || ''} placeholder="0"
                                        onChange={e => setNewTx(p => ({ ...p, [inv.id]: { ...(p[inv.id] ?? blankTx()), price: Number(e.target.value) } }))} />
                                    </div>
                                    <div>
                                      <label className="text-xs text-slate-500 block mb-0.5">메모</label>
                                      <Input value={newTx[inv.id]?.note ?? ''} placeholder="1차 매수"
                                        onChange={e => setNewTx(p => ({ ...p, [inv.id]: { ...(p[inv.id] ?? blankTx()), note: e.target.value } }))} />
                                    </div>
                                  </div>
                                  <button onClick={() => addTx(inv.id)} className="px-3 py-1 bg-blue-500 text-white text-xs rounded-lg hover:bg-blue-600">이력 추가</button>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* 행 저장/취소 버튼 */}
                          <div className="flex items-center gap-2 pt-2 border-t border-slate-700">
                            <button
                              onClick={() => saveItem(inv.id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 text-white text-xs font-medium rounded-lg hover:bg-blue-600 transition-colors"
                            >
                              <Check size={12} /> 저장
                            </button>
                            <button
                              onClick={() => cancelEdit(inv.id)}
                              className="px-3 py-1.5 text-slate-400 text-xs rounded-lg hover:bg-slate-700 transition-colors"
                            >
                              취소
                            </button>
                            <div className="flex-1" />
                            <DeleteButton onClick={() => deleteItem(inv.id)} />
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                {inv.country && <CountryFlag country={inv.country} size={15} />}
                                <span className="text-sm font-medium text-white">{inv.name}</span>
                                {inv.accountType === 'pension' && (
                                  <span className="text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded font-medium">연금저축</span>
                                )}
                                {inv.ticker && <span className="text-xs text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">{inv.ticker}</span>}
                                {inv.sector && <span className="text-xs text-blue-400 bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 rounded">{inv.sector}</span>}
                                {txs.length > 0 && (
                                  <span className="text-xs text-slate-500 bg-slate-700/60 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                    <List size={9} />{txs.length}회 매수
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-500 mt-0.5">
                                {totalQty.toLocaleString()}{inv.type === 'gold' ? '돈' : inv.type === 'stock' ? '주' : '개'}
                                {inv.type === 'stock' && ` · 평균 ${formatKRW(Math.round(avgPrice))} · 현재 ${formatKRW(inv.currentPrice)}`}
                                {' · '}{inv.institution}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <div className="text-right">
                                <p className="text-sm font-semibold text-white">{formatKRW(currentValue)}</p>
                                <p className={`text-xs font-medium ${profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                  {profit >= 0 ? <TrendingUp size={11} className="inline mr-0.5" /> : <TrendingDown size={11} className="inline mr-0.5" />}
                                  {profit >= 0 ? '+' : ''}{formatKRW(profit)} ({formatPercent(roi)})
                                </p>
                              </div>
                              <div className="flex flex-col gap-0.5" onClick={e => e.stopPropagation()}>
                                <button
                                  onClick={() => moveInvestment(inv.id, 'up')}
                                  disabled={itemIdx === 0}
                                  className="p-1 text-slate-600 hover:text-white hover:bg-slate-700 rounded disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                                >
                                  <ArrowUp size={11} />
                                </button>
                                <button
                                  onClick={() => moveInvestment(inv.id, 'down')}
                                  disabled={itemIdx === items.length - 1}
                                  className="p-1 text-slate-600 hover:text-white hover:bg-slate-700 rounded disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                                >
                                  <ArrowDown size={11} />
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* 가상자산·금 전용 — 단위 가격 비교 */}
                          {(inv.type === 'crypto' || inv.type === 'gold') && avgPrice > 0 && inv.currentPrice > 0 && (
                            <div className="mt-2 flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-700/30 border border-slate-700/40 text-xs">
                              <div className="flex items-center gap-1.5">
                                <span className="text-slate-500">매수가</span>
                                <span className="text-slate-300 font-medium tabular-nums">{formatKRW(Math.round(avgPrice))}</span>
                                {inv.type === 'gold' && <span className="text-slate-600">/돈</span>}
                              </div>
                              <span className="text-slate-600">→</span>
                              <div className="flex items-center gap-1.5">
                                <span className="text-slate-500">현재 시세</span>
                                <span className="text-white font-semibold tabular-nums">{formatKRW(inv.currentPrice)}</span>
                                {inv.type === 'gold' && <span className="text-slate-500">/돈</span>}
                              </div>
                              <div className={`ml-auto flex items-center gap-1 font-semibold tabular-nums ${roi >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {roi >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                                {roi >= 0 ? '+' : ''}{roi.toFixed(1)}%
                                <span className="font-normal text-slate-500 ml-0.5">
                                  ({roi >= 0 ? '+' : ''}{formatKRW(inv.currentPrice - Math.round(avgPrice))}/단위)
                                </span>
                              </div>
                            </div>
                          )}
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
    </SettingsShell>
  );
}
