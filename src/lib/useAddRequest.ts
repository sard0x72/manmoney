import { useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import type { Page } from '../types';

/** Opens this page's add form when the command palette asked for it (store `addOn`). */
export function useAddRequest(page: Page, open: () => void) {
  const requestAdd = useAppStore(s => s.requestAdd);
  const clearRequestAdd = useAppStore(s => s.clearRequestAdd);
  useEffect(() => {
    if (requestAdd !== page) return;
    clearRequestAdd();
    open();
  }, [requestAdd]);
}
