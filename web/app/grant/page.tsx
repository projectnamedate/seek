import type { Metadata } from "next";
import { Inter } from "next/font/google";
import GrantDeck from "./grant-deck";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Seek — Super Hunts Ecosystem Grant Deck",
  description:
    "Seek is a live Solana dApp Store scavenger hunt. Super Hunts is its next evolution into a Pokemon Go-level event co-marketing layer for partners.",
  alternates: { canonical: "/grant" },
  robots: { index: false, follow: false },
};

export default function GrantPage() {
  return (
    <div className={inter.variable}>
      <GrantDeck />
    </div>
  );
}
