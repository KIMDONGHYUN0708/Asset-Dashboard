export const dynamic = 'force-dynamic';
import NetWorthBanner from '@/components/NetWorthBanner';
import AssetBreakdownChart from '@/components/AssetBreakdownChart';
import MonthlyGrowthChart from '@/components/MonthlyGrowthChart';
import InvestmentTable from '@/components/InvestmentTable';
import AccountList from '@/components/AccountList';
import OtherAssets from '@/components/OtherAssets';
import LivePriceTicker from '@/components/LivePriceTicker';
import ErrorBoundary from '@/components/ErrorBoundary';

export default function HomePage() {
  return (
    <div className="px-6 py-5 space-y-4 max-w-[1400px] mx-auto">
      {/* 상단 실시간 시세 바 */}
      <div className="flex items-center justify-between">
        <h1 className="text-[13px] font-semibold text-slate-500">Overview</h1>
        <LivePriceTicker />
      </div>

      {/* 총 자산 배너 */}
      <ErrorBoundary label="자산 배너">
        <NetWorthBanner />
      </ErrorBoundary>

      {/* 월별 자산 추이 — 풀 너비 */}
      <ErrorBoundary label="월별 자산 추이">
        <MonthlyGrowthChart />
      </ErrorBoundary>

      {/* 자산 구성 + 기타 자산 */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-2">
          <ErrorBoundary label="자산 구성">
            <AssetBreakdownChart />
          </ErrorBoundary>
        </div>
        <div className="lg:col-span-3">
          <ErrorBoundary label="기타 자산">
            <OtherAssets />
          </ErrorBoundary>
        </div>
      </div>

      {/* 투자 수익률 */}
      <ErrorBoundary label="투자 현황">
        <InvestmentTable />
      </ErrorBoundary>

      {/* 계좌 목록 */}
      <ErrorBoundary label="계좌 목록">
        <AccountList />
      </ErrorBoundary>
    </div>
  );
}
