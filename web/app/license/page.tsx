import type { Metadata } from 'next';
import { LegalPage } from '../components/legal-page';

export const metadata: Metadata = {
  title: 'License',
  description: 'License and copyright notice for Seek.',
  alternates: { canonical: '/license' },
};

export default function LicensePage() {
  return (
    <LegalPage title="License" updated="May 1, 2026">
      <p>
        Seek app, brand assets, website, smart contract code, backend code, and
        mobile application code are copyright Projectnamedate LLC unless a file
        states otherwise.
      </p>
      <p>
        Project source code may be distributed under the license stated in the
        repository or in the specific file. The MIT license, where present,
        applies only to the covered code and does not grant rights to Seek
        trademarks, logos, product names, domain names, store assets, marketing
        materials, or other brand assets.
      </p>
      <p>
        Third-party dependencies remain governed by their own licenses. Solana,
        Solana Mobile, Seeker, SKR, and related marks are owned by their
        respective owners. Seek branding is its own product identity and must
        not be represented as an official Solana Foundation or Solana Mobile
        mark unless explicit written approval says otherwise.
      </p>
    </LegalPage>
  );
}
