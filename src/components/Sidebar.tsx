'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, TrendingUp, Landmark, Car, Settings, Wallet, Sun, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from 'next-themes';

const NAV = [
  { href: '/', label: '대시보드', icon: LayoutDashboard },
  { href: '/investments', label: '재테크', icon: TrendingUp },
  { href: '/accounts', label: '계좌 관리', icon: Landmark },
  { href: '/assets', label: '기타 자산', icon: Car },
];

const today = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });

export default function Sidebar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <aside className="w-52 flex-shrink-0 flex flex-col bg-th-base border-r border-th-border">
      {/* Brand */}
      <div className="px-4 pt-6 pb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
            <Wallet size={14} className="text-blue-400" />
          </div>
          <div>
            <p className="text-[13px] font-bold text-th-text leading-tight">내 자산 현황</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Asset Dashboard</p>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="mx-4 h-px bg-th-border" />

      {/* Nav */}
      <nav className="flex-1 px-2.5 py-3 space-y-0.5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'group flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150',
                active
                  ? 'bg-blue-500/10 text-blue-400'
                  : 'text-slate-500 hover:text-th-text hover:bg-th-muted'
              )}
            >
              <Icon
                size={15}
                className={cn(
                  'flex-shrink-0 transition-colors',
                  active ? 'text-blue-400' : 'text-slate-400 group-hover:text-th-text'
                )}
              />
              {label}
              {active && <span className="ml-auto w-1 h-1 rounded-full bg-blue-400" />}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="mx-4 h-px bg-th-border" />
      <div className="px-4 py-4 flex items-end justify-between">
        <div>
          <p className="text-[10px] text-slate-500 mb-0.5">Last updated</p>
          <p className="text-[11px] text-slate-400 font-medium">{today}</p>
        </div>
        <div className="flex items-center gap-1.5">
          {/* 라이트/다크 토글 */}
          <button
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className={cn(
              'w-7 h-7 rounded-lg flex items-center justify-center transition-colors',
              'text-slate-400 hover:text-th-text hover:bg-th-muted'
            )}
            title={isDark ? '라이트 모드' : '다크 모드'}
          >
            {isDark ? <Sun size={14} /> : <Moon size={14} />}
          </button>
          <Link href="/settings"
            className={cn(
              'w-7 h-7 rounded-lg flex items-center justify-center transition-colors',
              pathname === '/settings'
                ? 'bg-blue-500/10 text-blue-400'
                : 'text-slate-400 hover:text-th-text hover:bg-th-muted'
            )}>
            <Settings size={14} />
          </Link>
        </div>
      </div>
    </aside>
  );
}
