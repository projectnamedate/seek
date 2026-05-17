'use client';

import { track } from '@vercel/analytics';
import { useEffect } from 'react';

export function ScrollTracker() {
  useEffect(() => {
    let tracked = false;

    const onScroll = () => {
      if (tracked) return;
      if (window.scrollY > window.innerHeight * 0.65) {
        tracked = true;
        track('scroll_past_fold');
        window.removeEventListener('scroll', onScroll);
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return null;
}
