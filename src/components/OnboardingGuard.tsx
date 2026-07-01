'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAssetStore } from '@/lib/store';

/**
 * 초기 설정 미완료 사용자를 /settings?onboarding=1 로 리디렉션.
 * /settings 에서는 동작하지 않음 (무한 루프 방지).
 * hydration 완료 후 1틱 뒤에 체크 (SSR/hydration 플래시 방지).
 */
export default function OnboardingGuard() {
  const isOnboarded = useAssetStore((s) => s.isOnboarded);
  const router      = useRouter();
  const pathname    = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => { setReady(true); }, []);

  useEffect(() => {
    if (!ready) return;
    if (!isOnboarded && !pathname.startsWith('/settings')) {
      router.replace('/settings?onboarding=1');
    }
  }, [ready, isOnboarded, pathname, router]);

  return null;
}
