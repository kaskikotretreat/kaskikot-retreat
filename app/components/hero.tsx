// app/components/hero.tsx
// Plain CSS animation, no extra packages. Photo: public/images/hero.jpeg
import Image from 'next/image';
import Link from 'next/link';
import type { CSSProperties } from 'react';
import { display, sans } from '../Fonts';

const WHATSAPP = ''; // digits only with country code, e.g. '9779812345678'. Empty hides the button.

const CHIPS = [
  { href: '#experiences', label: 'Sunrise hike' },
  { href: '#views', label: 'Lake view' },
  { href: '#stay', label: 'Rooms' },
];

const HEADLINE = ['Above Pokhara,', 'with the Annapurnas', 'in view.'];

const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.5'/%3E%3C/svg%3E\")";

// Base styles are the FINAL state. Animations only describe where things start.
const CSS = `
.kk-panel { flex: 1; background: #1f2f26; animation: kk-lift 1.1s cubic-bezier(.76,0,.24,1) calc(.9s + var(--i) * .09s) forwards; }
.kk-mark { animation: kk-mark 1.4s ease both; }
.kk-img { animation: kk-zoom 3.4s cubic-bezier(.22,1,.36,1) .9s backwards; }
.kk-line { display: block; overflow: hidden; padding-bottom: .08em; }
.kk-line > span { display: block; animation: kk-rise 1s cubic-bezier(.22,1,.36,1) calc(1.35s + var(--i) * .12s) backwards; }
.kk-fade { animation: kk-fade .9s ease var(--d) backwards; }
@keyframes kk-lift { to { transform: translateY(-100%); } }
@keyframes kk-mark { 0% { opacity: 0; transform: translateY(10px); } 30%, 70% { opacity: 1; transform: none; } 100% { opacity: 0; } }
@keyframes kk-zoom { from { transform: scale(1.14); } }
@keyframes kk-rise { from { transform: translateY(110%); } }
@keyframes kk-fade { from { opacity: 0; transform: translateY(14px); } }
@media (prefers-reduced-motion: reduce) {
  .kk-curtain, .kk-mark { display: none; }
  .kk-img, .kk-line > span, .kk-fade { animation: none; }
}
`;

const withVar = (name: string, value: string | number) => ({ [name]: value }) as CSSProperties;

export default function Hero() {
  return (
    <section className={`${sans.className} relative h-[100svh] min-h-[680px] overflow-hidden bg-[#1f2f26] text-[#f7f3ec]`}>
      <style>{CSS}</style>

      {/* Curtain: four panels lift in sequence while the name fades out */}
      <div className="kk-curtain pointer-events-none absolute inset-0 z-40 flex" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="kk-panel" style={withVar('--i', i)} />
        ))}
      </div>
      <div className={`kk-mark pointer-events-none absolute inset-0 z-50 flex items-center justify-center ${display.className} text-5xl md:text-7xl`} aria-hidden="true">
        Kaskikot
      </div>

      {/* Photo, graded to the brand: green multiply, deep teal over the sky for the headline, dark green at the base */}
      <div className="kk-img absolute inset-0">
        <Image
          src="/images/hero.jpg"
          alt="View from Kaskikot over green terraces to the lake and hills of Pokhara"
          fill
          priority
          sizes="100vw"
          className="object-cover object-[35%_80%]"
        />
      </div>
      <div className="absolute inset-0 bg-[#2f4a3a] opacity-30 mix-blend-multiply" />
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(to bottom, rgba(10,40,50,.72) 0%, rgba(10,40,50,0) 62%), linear-gradient(to top, rgba(18,28,22,.82) 0%, rgba(18,28,22,.42) 25%, rgba(18,28,22,0) 55%)',
        }}
      />
      <div className="absolute inset-0 opacity-[.06] mix-blend-overlay" style={{ backgroundImage: GRAIN }} />

      {/* Content: same max width as the navbar so everything lines up on large screens */}
      <div className="relative z-10 mx-auto flex h-full w-full max-w-[1400px] flex-col justify-between px-6 pb-6 pt-28 md:px-12 md:pb-10 lg:px-16">
        <h1 className={`${display.className} text-[clamp(2.5rem,8.2vw,8.5rem)] leading-[.98] tracking-[-0.01em]`}>
          {HEADLINE.map((line, i) => (
            <span key={line} className="kk-line">
              <span style={withVar('--i', i)}>{line}</span>
            </span>
          ))}
        </h1>

        <div className="grid items-end gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-16">
          <div>
            <p className="kk-fade max-w-xl text-lg leading-relaxed md:text-xl" style={withVar('--d', '1.9s')}>
              A small hilltop retreat in Kaskikot. Hike up at sunrise for the Annapurna range, with the lake below.
            </p>
            <div className="kk-fade mt-5 flex flex-wrap gap-2" style={withVar('--d', '2.05s')}>
              {CHIPS.map((c) => (
                <a
                  key={c.label}
                  href={c.href}
                  className="rounded-full border border-white/35 bg-[#12201a]/40 px-4 py-2 text-sm font-medium backdrop-blur transition hover:bg-white hover:text-[#1f2f26] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  {c.label}
                </a>
              ))}
            </div>
          </div>

          <div className="kk-fade w-full rounded-2xl border border-white/25 bg-[#12201a]/55 p-5 backdrop-blur-md lg:w-[380px]" style={withVar('--d', '2.2s')}>
            <p className={`${display.className} text-3xl`}>Plan your stay</p>
            <p className="mt-1 text-sm opacity-85">Kaskikot, Pokhara, Nepal</p>
            <div className="mt-4 flex flex-col gap-2">
              <Link
                href="/booking"
                className="rounded-xl bg-[#f7f3ec] px-6 py-3 text-center text-sm font-semibold text-[#1f2f26] transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Check availability
              </Link>
              {WHATSAPP && (
                <a
                  href={`https://wa.me/${WHATSAPP}`}
                  className="rounded-xl border border-white/40 px-6 py-3 text-center text-sm font-medium transition hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  Ask on WhatsApp
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}