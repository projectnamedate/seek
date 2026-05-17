'use client';

import { track } from '@vercel/analytics';
import type { AnchorHTMLAttributes, ReactNode } from 'react';

type TrackedLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  eventName: string;
  children: ReactNode;
};

export function TrackedLink({ eventName, children, onClick, ...props }: TrackedLinkProps) {
  return (
    <a
      {...props}
      onClick={(event) => {
        track(eventName);
        onClick?.(event);
      }}
    >
      {children}
    </a>
  );
}
