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

/** Who is staying: the price covers `included` guests, each guest beyond that adds `rate` per night. */
export type Party = { guests: number; included: number; rate: number };

export type Quote = {
  total: number;
  label: string; // e.g. "3 nights x Rs 2,000 + 1 extra guest x Rs 500 x 3 nights" or "7-night package"
  perNight: number;
  savings: number; // against the normal nightly rate, 0 when none
  extraGuests: number; // guests beyond the included number
  extraTotal: number; // what those extra guests add to the total
};

export const formatPrice = (amount: number) => `${CURRENCY_LABEL} ${Math.round(amount).toLocaleString('en-IN')}`;

/**
 * Normal stay: nights x the room's nightly rate.
 * Package: the package price, valid only for exactly its number of nights.
 * Returns null when there is nothing to quote (no rate set, or the package does not fit).
 */
export function quote(nights: number, nightlyRate: number, pkg?: Pkg | null, party?: Party | null): Quote | null {
  if (nights < 1) return null;

  const extraGuests = party ? Math.max(0, party.guests - party.included) : 0;
  const extraRate = party && extraGuests > 0 ? Math.max(0, party.rate) : 0;
  const extraTotal = extraGuests * extraRate * nights;
  const extraText =
    extraTotal > 0
      ? ` + ${extraGuests} extra ${extraGuests === 1 ? 'guest' : 'guests'} x ${formatPrice(extraRate)} x ${nights} ${nights === 1 ? 'night' : 'nights'}`
      : '';

  if (pkg) {
    if (pkg.nights !== nights) return null;
    const normal = nightlyRate > 0 ? nightlyRate * nights : 0;
    return {
      total: pkg.price + extraTotal,
      label: pkg.name + extraText,
      perNight: Math.round(pkg.price / nights),
      savings: Math.max(0, normal - pkg.price),
      extraGuests,
      extraTotal,
    };
  }

  if (nightlyRate <= 0) return null;
  return {
    total: nights * nightlyRate + extraTotal,
    label: `${nights} ${nights === 1 ? 'night' : 'nights'} x ${formatPrice(nightlyRate)}${extraText}`,
    perNight: nightlyRate,
    savings: 0,
    extraGuests,
    extraTotal,
  };
}
