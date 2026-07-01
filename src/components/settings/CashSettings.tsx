'use client';
import { useState } from 'react';
import { useAssetStore } from '@/lib/store';
import { formatKRWFull } from '@/lib/utils';
import SettingsShell, { FormRow, Input, SaveButton } from './SettingsShell';

export default function CashSettings() {
  const { cash, depositAmount, setCash, setDeposit } = useAssetStore();
  const [cashVal, setCashVal] = useState(String(cash));
  const [depositVal, setDepositVal] = useState(String(depositAmount));
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setCash(Number(cashVal.replace(/,/g, '')));
    setDeposit(Number(depositVal.replace(/,/g, '')));
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const fmt = (v: string) => {
    const n = Number(v.replace(/,/g, ''));
    return isNaN(n) ? v : n.toLocaleString('ko-KR');
  };

  return (
    <div className="space-y-4">
      <SettingsShell
        title="현금 · 보증금"
        description="계좌 외에 직접 보유 중인 현금 및 전세·월세 보증금"
        action={
          <SaveButton
            onClick={handleSave}
            label={saved ? '✓ 저장됨' : '저장'}
          />
        }
      >
        <div className="space-y-4">
          <FormRow label="현금 보유액" required>
            <Input
              value={cashVal}
              onChange={e => setCashVal(e.target.value.replace(/[^0-9]/g, ''))}
              onBlur={e => setCashVal(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="3500000"
            />
            <p className="text-xs text-slate-500 mt-1">
              현재: {formatKRWFull(cash)}
            </p>
          </FormRow>

          <FormRow label="전세·보증금" required>
            <Input
              value={depositVal}
              onChange={e => setDepositVal(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="150000000"
            />
            <p className="text-xs text-slate-500 mt-1">
              현재: {formatKRWFull(depositAmount)}
              <span className="ml-2 text-slate-600">· 계좌에 없는 실물 자산으로 계산됩니다</span>
            </p>
          </FormRow>
        </div>
      </SettingsShell>
    </div>
  );
}
