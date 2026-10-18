'use client';

import { useSyncExternalStore } from 'react';

/** True when the viewport matches `query`; false on the server and until hydration. */
export function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** The laptop breakpoint (Tailwind `lg`), where screens get a second column. */
export const useDesktop = () => useMediaQuery('(min-width: 1024px)');
