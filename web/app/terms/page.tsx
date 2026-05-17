import type { Metadata } from 'next';
import { LegalPage } from '../components/legal-page';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Terms of Service for Seek.',
  alternates: { canonical: '/terms' },
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated="May 1, 2026">
      <h2>1. Operator and Acceptance</h2>
      <p>
        Seek is operated by Projectnamedate LLC. By using the Seek app, website,
        smart contracts, or related services, you agree to these terms. Do not
        use Seek if you do not agree or if using the service is unlawful where
        you are located.
      </p>

      <h2>2. Eligibility</h2>
      <p>
        You must be at least 18 years old and legally allowed to participate in
        skill-based competitions with token entries and rewards in your
        jurisdiction. Seek is void where prohibited or restricted. You are
        responsible for confirming that your use is lawful.
      </p>

      <h2>3. Skill-Based Competition</h2>
      <p>
        Seek is designed as a skill-based real-world scavenger hunt. Results
        depend on physical navigation, observation, timely capture, photo
        quality, and compliance with the assigned mission. Protocol-defined
        Singularity bonus mechanics may apply to successful completions.
      </p>

      <h2>4. Entries, Rewards, and Token Risk</h2>
      <p>
        Participation may require SKR token entries and Solana network fees.
        Successful bounties may pay rewards from the protocol reward vault.
        Failed bounties distribute the entry through protocol rules, currently
        70% to the reward pool, 20% to the Singularity pool, and 10% to the
        protocol treasury. Token prices can change quickly. Seek does not provide
        investment, tax, legal, or financial advice.
      </p>

      <h2>5. Blockchain Transactions</h2>
      <p>
        Seek uses Solana smart contracts for entries, bounty state, disputes,
        and settlement. Blockchain transactions are public and generally
        irreversible once confirmed. You are responsible for reviewing wallet
        prompts and securing your wallet, device, and private keys.
      </p>

      <h2>6. Validation, Disputes, and Operator Review</h2>
      <p>
        Photo submissions may be reviewed by AI systems, metadata checks,
        camera integrity signals, anti-fraud controls, smart contract rules,
        and dispute processes. Validation can be wrong. Seek may suspend,
        reject, reverse off-chain access to, or escalate activity that appears
        fraudulent, unsafe, unlawful, or abusive, to the fullest extent allowed
        by the protocol and applicable law.
      </p>

      <h2>7. No Refunds After Mission Reveal</h2>
      <p>
        Once a bounty is started and mission information is revealed, entries
        are generally non-refundable except where an explicit on-chain recovery
        or dispute path applies.
      </p>

      <h2>8. Safety and Real-World Conduct</h2>
      <p>
        You are responsible for your own safety and conduct. Do not trespass,
        harass people, photograph where prohibited, violate traffic rules,
        enter unsafe areas, or break any law while playing. Stop immediately if
        a mission cannot be completed safely and legally.
      </p>

      <h2>9. Prohibited Conduct</h2>
      <ul>
        <li>Using pre-captured, edited, generated, stock, screen, or misleading images.</li>
        <li>Using bots, automation, spoofing, sybil behavior, or exploit attempts.</li>
        <li>Interfering with smart contracts, validation, infrastructure, rate limits, or other users.</li>
        <li>Submitting illegal, harmful, invasive, infringing, or unsafe content.</li>
        <li>Using Seek from a restricted jurisdiction or in violation of applicable law.</li>
      </ul>

      <h2>10. Taxes and Compliance</h2>
      <p>
        You are solely responsible for taxes, reporting, and compliance duties
        that may arise from token entries, rewards, gains, losses, or other
        activity.
      </p>

      <h2>11. Intellectual Property</h2>
      <p>
        Seek branding, website content, app UI, and related product materials
        are owned by Projectnamedate LLC or its licensors. Third-party marks,
        including Solana, Solana Mobile, Seeker, and SKR marks, belong to their
        respective owners.
      </p>

      <h2>12. Disclaimers</h2>
      <p>
        Seek is provided as is and as available, without warranties of any kind
        to the fullest extent permitted by law. We do not guarantee uptime,
        reward availability, token value, error-free validation, uninterrupted
        network access, or that the service will meet your expectations.
      </p>

      <h2>13. Limitation of Liability</h2>
      <p>
        To the fullest extent permitted by law, Projectnamedate LLC and its
        owners, contributors, service providers, and affiliates will not be
        liable for indirect, incidental, special, consequential, exemplary, or
        punitive damages, or for lost profits, lost tokens, lost data, wallet
        compromise, network failures, or unsafe real-world conduct.
      </p>

      <h2>14. Indemnity</h2>
      <p>
        You agree to defend, indemnify, and hold harmless Projectnamedate LLC
        from claims, losses, liabilities, damages, costs, and expenses arising
        from your use of Seek, your submissions, your wallet activity, your
        breach of these terms, or your violation of law or third-party rights.
      </p>

      <h2>15. Changes and Contact</h2>
      <p>
        We may update these terms as the service changes. Continued use after
        the effective date of updated terms means you accept them. Questions:
        jeff@projectname.date.
      </p>
    </LegalPage>
  );
}
