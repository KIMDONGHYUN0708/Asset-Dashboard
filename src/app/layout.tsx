import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Sidebar from '@/components/Sidebar';
import LivePricesProvider from '@/components/LivePricesProvider';
import DataKeySetup from '@/components/DataKeySetup';
import DataSyncWatcher from '@/components/DataSyncWatcher';
import OnboardingGuard from '@/components/OnboardingGuard';
import ThemeProvider from '@/components/ThemeProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: '내 자산 대시보드',
  description: '개인 자산 현황 대시보드',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className={`${inter.className} bg-th-base text-th-text min-h-screen`}>
        <ThemeProvider>
          <LivePricesProvider />
          <DataSyncWatcher />
          <DataKeySetup />
          <OnboardingGuard />
          <div className="flex h-screen overflow-hidden">
            <Sidebar />
            <main className="flex-1 overflow-y-auto bg-th-base">
              {children}
            </main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
