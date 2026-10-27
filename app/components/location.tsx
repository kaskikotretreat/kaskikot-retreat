// app/components/location.tsx
// "Location": a live Google map of the property, the address, and one-tap directions.
// Server component. The position and links come from app/lib/contact.ts.
import type { ReactNode } from 'react';
import { Dancing_Script, Instrument_Serif, Montserrat } from 'next/font/google';
import { CONTACT, directionsLink, mapEmbedUrl, whatsappLink } from '../lib/contact';

const serif = Instrument_Serif({ subsets: ['latin'], weight: '400', display: 'swap' });
const script = Dancing_Script({ subsets: ['latin'], weight: ['600', '700'], display: 'swap' });
const sans = Montserrat({ subsets: ['latin'], display: 'swap' });

const ring = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a8431f]';

function Icon({ children, size = 20 }: { children: ReactNode; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

export default function Location() {
  return (
    <section id="location" className={`${sans.className} scroll-mt-20 bg-[#f7f3ec] px-5 py-20 text-[#1f2f26] md:px-12 md:py-28 lg:px-16`}>
      <div className="mx-auto max-w-7xl">
        <header className="mx-auto max-w-2xl text-center">
          <p className={`${script.className} text-3xl font-semibold text-[#a8431f] md:text-4xl`}>Come and find us</p>
          <h2 className={`${serif.className} mt-1 text-5xl leading-none md:text-7xl`}>Getting here</h2>
          <p className="mt-4 text-[#4a5a50] md:text-lg">A quiet hilltop in Kaskikot, above Pokhara. Open the map for the exact spot, or get directions from wherever you are.</p>
        </header>

        <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.45fr] lg:gap-8">
          <div className="flex min-w-0 flex-col rounded-3xl bg-white p-6 shadow-[0_24px_50px_-30px_rgba(31,47,38,.45)] sm:p-9">
            <span className="grid size-14 place-items-center rounded-full bg-[#2f4a3a] text-white">
              <Icon size={26}><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.4" /></Icon>
            </span>
            <h3 className={`${serif.className} mt-5 text-3xl md:text-4xl`}>Kaskikot Retreat &amp; Holiday Home</h3>
            <p className="mt-3 text-lg leading-relaxed text-[#3c4d43]">
              {CONTACT.addressLines.map((l) => (
                <span key={l} className="block">{l}</span>
              ))}
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
              <a
                href={directionsLink()}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center justify-center gap-2 rounded-full bg-[#a8431f] px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#a8431f]/25 transition hover:bg-[#8f3718] ${ring}`}
              >
                <Icon size={18}><path d="M3 11l18-8-8 18-2-8-8-2z" /></Icon> Get directions
              </a>
              <a
                href={CONTACT.mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center justify-center gap-2 rounded-full border border-[#cdd8cf] bg-white px-6 py-3.5 text-sm font-semibold text-[#2f4a3a] transition hover:border-[#2f4a3a] hover:bg-[#2f4a3a] hover:text-white ${ring}`}
              >
                Open in Google Maps
              </a>
            </div>

            <div className="mt-8 rounded-2xl bg-[#f7f3ec] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8a857a]">Arriving soon?</p>
              <p className="mt-1.5 text-sm leading-relaxed text-[#4a5a50]">Message us your arrival time and we will help you with the last stretch of the way.</p>
              <a
                href={whatsappLink('Hello! I am on my way to Kaskikot Retreat. Could you help me with directions?')}
                target="_blank"
                rel="noopener noreferrer"
                className={`mt-3 inline-block text-sm font-semibold text-[#a8431f] underline underline-offset-4 hover:text-[#8f3718] ${ring}`}
              >
                Message us on WhatsApp
              </a>
            </div>
          </div>

          <div className="relative min-h-[340px] overflow-hidden rounded-3xl bg-[#dfe9e1] shadow-[0_24px_50px_-30px_rgba(31,47,38,.45)] sm:min-h-[420px] lg:min-h-[520px]">
            <iframe
              title="Map showing Kaskikot Retreat and Holiday Home"
              src={mapEmbedUrl()}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
              className="absolute inset-0 size-full border-0"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
