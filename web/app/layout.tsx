import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import type { Metadata } from 'next';
import './globals.css';

const siteUrl = 'https://seek.mythx.art';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Seek - Real-world scavenger hunts on Seeker',
    template: '%s | Seek',
  },
  description:
    'Seek is a Seeker-native Solana app for real-world scavenger hunts, skill-based missions, and on-chain SKR rewards.',
  applicationName: 'Seek',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Seek - Real-world scavenger hunts on Seeker',
    description:
      'Hunt. Capture. Win. Real-world scavenger hunts on Seeker with SKR rewards.',
    url: siteUrl,
    siteName: 'Seek',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'Seek camera shutter iris mark over a Seeker-native bounty interface',
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Seek - Real-world scavenger hunts on Seeker',
    description: 'Hunt. Capture. Win. Real-world scavenger hunts on Seeker.',
    images: ['/opengraph-image'],
  },
  icons: {
    icon: '/brand/icon.png',
    apple: '/brand/icon.png',
  },
  other: {
    'copyright-owner': 'Projectnamedate LLC',
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
