import AccountList from '@/components/AccountList';

export default function AccountsPage() {
  return (
    <div className="p-6 space-y-5 max-w-[1400px] mx-auto">
      <div>
        <h1 className="text-xl font-bold text-white">계좌 관리</h1>
        <p className="text-sm text-slate-500 mt-0.5">케이뱅크 · KB국민 · 신한 · 미래에셋 · 키움증권</p>
      </div>
      <AccountList />
    </div>
  );
}
