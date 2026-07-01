import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Sidebar from '@/components/Sidebar';
import LivePricesProvider from '@/components/LivePricesProvider';
import DataKeySetup from '@/components/DataKeySetup';
import DataSyncWatcher from '@/components/DataSyncWatcher';
import OnboardingGuard from '@/components/OnboardingGuard';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: '내 자산 대시보드',
  description: '개인 자산 현황 대시보드',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className="dark">
      <body className={`${inter.className} bg-slate-950 text-white min-h-screen`}>
        <LivePricesProvider />
        <DataSyncWatcher />
        <DataKeySetup />
        <OnboardingGuard />
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-y-auto bg-slate-950">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
