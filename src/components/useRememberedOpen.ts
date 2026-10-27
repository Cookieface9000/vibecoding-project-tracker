'use client';

import { useCallback, useEffect, useState } from 'react';

// Open/closed state for a foldable section, remembered per browser under `key`.
// Starts open on the server and first render, then applies the saved choice.
export function useRememberedOpen(key: string, defaultOpen = true): [boolean, () => void] {
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(key);
      if (saved !== null) setOpen(saved === '1');
    } catch {
      /* storage blocked — use the default */
    }
  }, [key]);

  const toggle = useCallback(() => {
    setOpen((o) => {
      try {
        localStorage.setItem(key, o ? '0' : '1');
      } catch {
        /* storage blocked — still toggles for this visit */
      }
      return !o;
    });
  }, [key]);

  return [open, toggle];
}
