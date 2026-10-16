'use client';

import { useEffect } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useHousehold } from '@/lib/household';

/** The family being set up. The demo family can't be set up again, so that starts at consent. */
export function useSetupHousehold() {
  const query = useHousehold();
  const router = useRouter();
  const isDemo = query.data?.isDemo;
  useEffect(() => {
    if (isDemo) router.replace('/setup/consent');
  }, [isDemo, router]);
  return query;
}
