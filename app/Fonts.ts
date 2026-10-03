// app/fonts.ts
// Self-hosted at build time by Next.js (no layout.tsx changes needed).
// To try another pairing, swap the imports, e.g. Fraunces or Newsreader for the display font.
import { Instrument_Serif, Manrope } from 'next/font/google';

export const display = Instrument_Serif({ subsets: ['latin'], weight: '400', display: 'swap' });
export const sans = Manrope({ subsets: ['latin'], display: 'swap' });