import type { ReactNode } from 'react';

type LegalPageProps = {
  title: string;
  updated: string;
  children: ReactNode;
};

export function LegalPage({ title, updated, children }: LegalPageProps) {
  return (
    <>
      <header className="legal-header">
        <a className="brand" href="/" aria-label="Seek home">
          <img src="/brand/icon.png" alt="" width="38" height="38" />
          <span>Seek</span>
        </a>
        <nav>
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
          <a href="/license">License</a>
        </nav>
      </header>
      <main className="legal-shell">
        <article className="legal-card">
          <p className="eyebrow">Last updated {updated}</p>
          <h1>{title}</h1>
          <div className="legal-body">{children}</div>
        </article>
      </main>
    </>
  );
}
