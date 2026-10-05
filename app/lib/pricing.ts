// lib/pricing.ts
// Price rules shared by the form (live estimate) and the server (the price that is saved).
// Pure functions only: no server imports, so it is safe to use in the browser.

export const CURRENCY_LABEL = 'Rs';

export type Pkg = {
  id: string;
  roomId: string;
  name: string;
  nights: number;
  price: number; // total for the whole package
  description: string | null;
};

export type Quote = {
  total: number;
  label: string; // e.g. "3 nights x Rs 2,000" or "7-night package"
  perNight: number;
  savings: number; // against the normal nightly rate, 0 when none
};

export const formatPrice = (amount: number) => `${CURRENCY_LABEL} ${Math.round(amount).toLocaleString('en-IN')}`;

/**
 * Normal stay: nights x the room's nightly rate.
 * Package: the package price, valid only for exactly its number of nights.
 * Returns null when there is nothing to quote (no rate set, or the package does not fit).
 */
export function quote(nights: number, nightlyRate: number, pkg?: Pkg | null): Quote | null {
  if (nights < 1) return null;

  if (pkg) {
    if (pkg.nights !== nights) return null;
    const normal = nightlyRate > 0 ? nightlyRate * nights : 0;
    return {
      total: pkg.price,
      label: pkg.name,
      perNight: Math.round(pkg.price / nights),
      savings: Math.max(0, normal - pkg.price),
    };
  }

  if (nightlyRate <= 0) return null;
  return {
    total: nights * nightlyRate,
    label: `${nights} ${nights === 1 ? 'night' : 'nights'} x ${formatPrice(nightlyRate)}`,
    perNight: nightlyRate,
    savings: 0,
  };
}