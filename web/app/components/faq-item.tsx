'use client';

import { track } from '@vercel/analytics';
import type { ReactNode } from 'react';

type FaqItemProps = {
  question: string;
  children: ReactNode;
};

export function FaqItem({ question, children }: FaqItemProps) {
  return (
    <details
      className="faq-item"
      onToggle={(event) => {
        if (event.currentTarget.open) {
          track('faq_expand', { question });
        }
      }}
    >
      <summary>{question}</summary>
      <p>{children}</p>
    </details>
  );
}
