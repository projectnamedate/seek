import type { Metadata } from 'next';
import { LegalPage } from '../components/legal-page';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Privacy policy for Seek, the Seeker-native Solana bounty app.',
  alternates: { canonical: '/privacy' },
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="May 1, 2026">
      <p>
        Seek is operated by Projectnamedate LLC. This policy explains the
        information we collect, how we use it, when we share it, and the choices
        you have when using the Seek mobile app, website, and related services.
      </p>

      <h2>Information We Collect</h2>
      <h3>Wallet and Blockchain Data</h3>
      <p>
        We use your Solana wallet address to identify your account, verify
        signed requests, prepare bounties, submit transactions, show app
        history, and process entries or rewards. Solana transactions are public
        blockchain records and are not controlled by Seek.
      </p>

      <h3>Photos and Capture Metadata</h3>
      <p>
        When you submit a bounty photo, the image is uploaded for validation.
        We may process the photo, file metadata, EXIF data, timestamps, camera
        integrity signals, device model signals, and approximate location data
        embedded in the image when available. We use this information to verify
        that a submission is a real, timely capture of the assigned target.
      </p>

      <h3>App, Device, and Security Data</h3>
      <p>
        We may collect app version, request timestamps, IP-derived security
        signals, rate-limit counters, crash reports, logs, and wallet-auth
        nonces so we can operate the service, prevent abuse, debug issues, and
        protect users.
      </p>

      <h2>How We Use Information</h2>
      <ul>
        <li>Run the bounty flow, including mission reveal, validation, dispute, and settlement.</li>
        <li>Detect fraud, replay attempts, screenshots, edited images, botting, and abuse.</li>
        <li>Operate wallets, rate limits, support, analytics, security monitoring, and crash reporting.</li>
        <li>Comply with law, enforce our terms, and protect the service and other users.</li>
      </ul>

      <h2>How We Share Information</h2>
      <p>We do not sell personal data.</p>
      <ul>
        <li>AI and infrastructure providers may process submitted photos and technical data for validation and hosting.</li>
        <li>Solana blockchain transactions publish wallet addresses, program interactions, and token movements on-chain.</li>
        <li>Security, analytics, crash-reporting, and logging providers may process operational data.</li>
        <li>We may disclose information when required by law, legal process, safety concerns, or enforcement of our terms.</li>
      </ul>

      <h2>Retention</h2>
      <p>
        We aim to keep off-chain data only as long as needed for the service,
        fraud prevention, security, accounting, legal compliance, and dispute
        handling. Bounty state, wallet-auth data, rate-limit counters, and
        security logs may be retained for operational periods. Photos are
        processed for validation and are not intentionally stored by Seek longer
        than needed for validation, dispute handling, security review, or legal
        obligations. Public blockchain data cannot be deleted by Seek.
      </p>

      <h2>Your Choices</h2>
      <ul>
        <li>You can stop using Seek at any time.</li>
        <li>You can disconnect your wallet and revoke app camera or location permissions in device settings.</li>
        <li>You can request access, correction, or deletion of off-chain data where legally and technically available.</li>
        <li>On-chain transactions, public wallet activity, and records maintained by third parties may not be erasable.</li>
      </ul>

      <h2>Children and Age Limits</h2>
      <p>
        Seek is intended for adults 18 and older. We do not knowingly collect
        personal information from anyone under 18. If you believe a minor has
        provided information to Seek, contact us so we can review and delete
        off-chain data where appropriate.
      </p>

      <h2>Security</h2>
      <p>
        We use technical, administrative, and operational safeguards designed to
        protect off-chain data. No service can guarantee perfect security. You
        are responsible for your wallet, seed phrase, device security, and
        transaction approvals.
      </p>

      <h2>Changes</h2>
      <p>
        We may update this policy as the service changes. If changes are
        material, we will provide notice through the app, website, or another
        reasonable channel before the change applies where required.
      </p>

      <h2>Contact</h2>
      <p>For privacy requests or questions, contact jeff@projectname.date.</p>
    </LegalPage>
  );
}
