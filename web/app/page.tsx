import { FaqItem } from './components/faq-item';
import { ScrollTracker } from './components/scroll-tracker';
import { TrackedLink } from './components/tracked-link';

const missionExamples = [
  'Find a USPS mailbox with the red flag in the up position.',
  'Find a sidewalk slab with a crack running edge to edge.',
  'Find a ceiling fan with a visible pull-chain.',
  'Find a public chess table with pieces in play.',
];

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Seek',
  publisher: {
    '@type': 'Organization',
    name: 'Projectnamedate LLC',
    url: 'https://seek.mythx.art',
  },
  applicationCategory: 'GameApplication',
  operatingSystem: 'Android',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
  description:
    'A Seeker-native Solana app for real-world scavenger hunts and SKR rewards.',
  url: 'https://seek.mythx.art',
};

export default function Home() {
  return (
    <>
      <ScrollTracker />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <header className="site-header" aria-label="Primary navigation">
        <a className="brand" href="/" aria-label="Seek home">
          <img src="/brand/icon.png" alt="" width="42" height="42" />
          <span>Seek</span>
        </a>
        <nav>
          <a href="#flow">Flow</a>
          <a href="#missions">Missions</a>
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
        </nav>
      </header>

      <main>
        <section className="hero" aria-labelledby="hero-title">
          <img className="hero-art" src="/brand/feature-graphic.png" alt="" />
          <div className="hero-content">
            <p className="eyebrow">Seeker-native on-chain scavenger hunts</p>
            <h1 id="hero-title">Seek</h1>
            <p className="hero-copy">
              Hunt. Capture. Win. Play real-world scavenger hunts on your
              Seeker phone and settle SKR rewards on Solana.
            </p>
            <div className="hero-actions">
              <TrackedLink className="primary-action" href="#launch" eventName="get_on_seeker_click">
                Get on Seeker
              </TrackedLink>
              <TrackedLink className="secondary-action" href="#flow" eventName="how_it_works_click">
                How it works
              </TrackedLink>
            </div>
          </div>
        </section>

        <section id="flow" className="flow-section" aria-labelledby="flow-title">
          <div className="section-kicker">Field protocol</div>
          <h2 id="flow-title">A physical hunt with on-chain settlement.</h2>
          <div className="flow-grid">
            <article>
              <span>01</span>
              <h3>Stake SKR</h3>
              <p>Choose a tier, approve the bounty transaction, and receive a committed mission.</p>
            </article>
            <article>
              <span>02</span>
              <h3>Capture proof</h3>
              <p>Race the timer, find the target, and submit a real camera capture for validation.</p>
            </article>
            <article>
              <span>03</span>
              <h3>Settle</h3>
              <p>AI validates the target, the protocol proposes the result, and finalization pays out.</p>
            </article>
          </div>
        </section>

        <section id="missions" className="mission-section" aria-labelledby="missions-title">
          <div>
            <div className="section-kicker">Launch-calibrated missions</div>
            <h2 id="missions-title">Targets that reward observation, not screenshots.</h2>
            <p>
              The mission pool is tuned for a small launch vault and a strict
              validation model. Specificity matters: color, condition, context,
              and timing all make the hunt harder to spoof.
            </p>
          </div>
          <div className="mission-list" aria-label="Example missions">
            {missionExamples.map((mission) => (
              <p key={mission}>{mission}</p>
            ))}
          </div>
        </section>

        <section id="launch" className="launch-section" aria-labelledby="launch-title">
          <img src="/brand/banner.png" alt="Seek dApp Store banner with phone mission interface" />
          <div>
            <div className="section-kicker">dApp Store launch path</div>
            <h2 id="launch-title">Built for the Solana Mobile dApp Store.</h2>
            <p>
              Seek is prepared as a Seeker-exclusive Android release with Mobile
              Wallet Adapter, SGT verification, release signing, and mainnet
              Solana deployment gates.
            </p>
            <TrackedLink className="primary-action compact" href="/privacy" eventName="dapp_store_cta_click">
              Review policies
            </TrackedLink>
          </div>
        </section>

        <section className="faq-section" aria-labelledby="faq-title">
          <div className="section-kicker">Questions</div>
          <h2 id="faq-title">Launch basics.</h2>
          <FaqItem question="Is Seek live on mainnet?">
            The protocol and backend are live on Solana mainnet. Public gameplay
            opens through the Solana Mobile dApp Store release path.
          </FaqItem>
          <FaqItem question="Is this a demo mode app?">
            No. The store release uses real wallet transactions, real SKR, and
            on-chain settlement.
          </FaqItem>
          <FaqItem question="Where are the legal pages?">
            The dApp Store URLs resolve at /privacy, /terms, and /license on
            this site.
          </FaqItem>
        </section>
      </main>

      <footer>
        <span>Seek</span>
        <nav aria-label="Footer navigation">
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
          <a href="/license">License</a>
        </nav>
      </footer>
    </>
  );
}
