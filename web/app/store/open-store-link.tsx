'use client';

import { track } from '@vercel/analytics';
import { useEffect } from 'react';

type OpenStoreLinkProps = {
  deepLink: string;
};

export function OpenStoreLink({ deepLink }: OpenStoreLinkProps) {
  useEffect(() => {
    if (!/Android/i.test(navigator.userAgent)) {
      return;
    }

    const timeout = window.setTimeout(() => {
      track('dapp_store_auto_open');
      window.location.href = deepLink;
    }, 400);

    return () => window.clearTimeout(timeout);
  }, [deepLink]);

  return (
    <a
      className="primary-action store-action"
      href={deepLink}
      onClick={() => track('dapp_store_manual_open')}
    >
      Open in Solana dApp Store
    </a>
  );
}
