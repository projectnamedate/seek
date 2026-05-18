import type { Metadata } from 'next';
import { OpenStoreLink } from './open-store-link';

const dappStoreDeepLink = 'solanadappstore://details?id=app.seek.mobile';
const storeUrl = 'https://seek.mythx.art/store';

export const metadata: Metadata = {
  title: 'Open Seek in the Solana dApp Store',
  description:
    'Open the Seek listing in the Solana Mobile dApp Store on a Seeker device.',
  alternates: {
    canonical: '/store',
  },
  openGraph: {
    title: 'Seek on the Solana dApp Store',
    description:
      'Open Seek on a Seeker device and play real-world scavenger hunts with on-chain SKR rewards.',
    url: storeUrl,
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'Seek camera shutter iris mark over a Seeker-native bounty interface',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Seek on the Solana dApp Store',
    description: 'Open Seek on a Seeker device from the Solana dApp Store.',
    images: ['/opengraph-image'],
  },
};

export default function StorePage() {
  return (
    <>
      <header className="site-header" aria-label="Primary navigation">
        <a className="brand" href="/" aria-label="Seek home">
          <img src="/brand/icon.png" alt="" width="42" height="42" />
          <span>Seek</span>
        </a>
        <nav>
          <a href="/">Home</a>
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
        </nav>
      </header>

      <main className="store-shell">
        <img className="store-art" src="/brand/feature-graphic.png" alt="" />
        <section className="store-panel" aria-labelledby="store-title">
          <p className="eyebrow">Solana Mobile dApp Store</p>
          <h1 id="store-title">Seek</h1>
          <p className="store-copy">
            Open the official Seek listing on a Seeker device to install or
            update the app.
          </p>
          <div className="store-actions">
            <OpenStoreLink deepLink={dappStoreDeepLink} />
            <a className="secondary-action store-action" href="/">
              View website
            </a>
          </div>
          <p className="store-note">
            This link uses Solana Mobile's official listing scheme for
            app.seek.mobile.
          </p>
        </section>
      </main>
    </>
  );
}
