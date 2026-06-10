"use client";

import { motion, useScroll, useSpring } from "framer-motion";
import type { ReactNode } from "react";

/* Scroll-progress bar pinned to top */
export function Progress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 30,
    restDelta: 0.001,
  });
  return (
    <motion.div
      style={{ scaleX }}
      className="fixed left-0 right-0 top-0 z-50 h-[3px] origin-left"
    >
      <div className="h-full w-full bg-gradient-to-r from-aqua via-ice to-frost" />
    </motion.div>
  );
}

/* Fixed top bar */
export function TopBar() {
  return (
    <header className="fixed inset-x-0 top-0 z-40">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <span className="display grad-text glow-text text-xl tracking-[0.18em]">
            SEEK
          </span>
          <span className="hidden text-xs font-semibold text-faint sm:inline">
            scavenger hunts on Solana
          </span>
        </div>
        <span className="chip border-aqua/30 text-frost">
          Ecosystem grant deck
        </span>
      </div>
    </header>
  );
}

/* Full-height slide wrapper */
export function Slide({
  id,
  children,
  className = "",
}: {
  id: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      className={`slide relative flex min-h-screen w-full items-center justify-center px-6 py-24 ${className}`}
    >
      <div className="mx-auto w-full max-w-7xl">{children}</div>
    </section>
  );
}

/* Reveal-on-load — CSS-driven so content always renders (no JS/observer gate) */
export function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <div className={`reveal ${className}`} style={{ animationDelay: `${delay}s` }}>
      {children}
    </div>
  );
}

export function Kicker({ children }: { children: ReactNode }) {
  return (
    <div className="kicker mb-5 flex items-center gap-3">
      <span className="inline-block h-px w-8 bg-aqua" />
      {children}
    </div>
  );
}

export function Phone({ src, label }: { src: string; label?: string }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="phone w-[230px] sm:w-[260px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={label ?? "Seek app screen"} loading="lazy" />
      </div>
      {label && (
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-faint">
          {label}
        </span>
      )}
    </div>
  );
}
