// app/components/hero.tsx
// Plain CSS animation, no extra packages. Photo: public/hero.jpeg (swap HERO below to change it).
import Image from 'next/image';
import type { CSSProperties, ReactNode } from 'react';
import { Dancing_Script, Instrument_Serif, Montserrat } from 'next/font/google';
import HeroSearch from './hero-search';

// Fonts live in this file so the hero has no dependency on app/fonts.ts (or its capital letters).
const mark = Instrument_Serif({ subsets: ['latin'], weight: '400', display: 'swap' }); // "Kaskikot" in the opening
const script = Dancing_Script({ subsets: ['latin'], weight: ['600', '700'], display: 'swap' }); // "Your home away"
const sans = Montserrat({ subsets: ['latin'], display: 'swap' }); // everything else

// The photo. Use a bright, clean photo with no text baked in. `position` chooses what stays visible when the screen crops it.
const HERO = {
  src: '/hero.jpeg',
  alt: 'Kaskikot Retreat on the hill above Pokhara, with green terraces, the lake and the mountains beyond',
  position: 'object-[40%_60%]',
};

// Each line rises into view one after another (same mechanics as before).
const HEADLINE = ['Your home away', 'from home'];

const AMENITIES: { title: string; note: string; icon: ReactNode }[] = [
  { title: 'Cozy Rooms', note: 'Comfortable Stay', icon: <path d="M3 11l9-7 9 7M5 10v10h14V10M10 20v-6h4v6" /> },
  { title: 'Beautiful Views', note: 'Nature All Around', icon: <path d="M2 20 9 7l4.5 8 2.5-4 6 9H2z" /> },
  {
    title: 'Free Wi-Fi',
    note: 'Stay Connected',
    icon: (
      <>
        <path d="M2 9a15 15 0 0 1 20 0M5.5 12.5a10 10 0 0 1 13 0M9 16a5 5 0 0 1 6 0" />
        <circle cx="12" cy="19.2" r=".9" fill="currentColor" />
      </>
    ),
  },
  {
    title: 'Home Cooked Meals',
    note: '(On Request)',
    icon: (
      <>
        <circle cx="12" cy="12" r="4.6" />
        <path d="M3.5 3v6a2 2 0 0 0 4 0V3M5.5 3v18M20.5 21V3c-2.2 1.4-3 4-3 7h3" />
      </>
    ),
  },
  { title: 'Peaceful Environment', note: 'Fresh Air & Calm', icon: <path d="M20 4C9 4 4 9 4 15c0 2 1 4 3 5 7 0 13-5 13-16zM4 20c3-5 7-8 12-10" /> },
  {
    title: 'Perfect for Families, Couples & Groups',
    note: 'Make Memories Together',
    icon: <path d="M12 20s-7.5-4.6-9-9.5C2 7 4.3 4.5 7.2 4.5c1.9 0 3.5 1 4.8 3 1.3-2 2.9-3 4.8-3C19.7 4.5 22 7 21 10.5 19.5 15.4 12 20 12 20z" />,
  },
];

// Base styles are the FINAL state. Animations only describe where things start.
// (The curtain, the name and the headline rise are unchanged.)
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

// Soft blue glow behind white text, so it stays readable on the sky without darkening the photo.
const GLOW = '[text-shadow:0_1px_2px_rgba(8,45,90,.45),0_4px_28px_rgba(8,45,90,.35)]';

// Decorative leaves for the corners of the services panel.
function Leaves({ className }: { className: string }) {
  const leaf = 'M0 0C6-9 18-9 26 0 18 9 6 9 0 0z'; // one pointed leaf, drawn from its base
  return (
    <svg viewBox="0 0 120 90" className={`pointer-events-none absolute ${className}`} aria-hidden="true">
      <g transform="translate(8 88) rotate(-58)"><path d={leaf} fill="#2e8b4a" transform="scale(2.6)" /></g>
      <g transform="translate(22 90) rotate(-28)"><path d={leaf} fill="#3aa05a" transform="scale(2.2)" /></g>
      <g transform="translate(4 70) rotate(-95)"><path d={leaf} fill="#247a40" transform="scale(1.7)" /></g>
      <g transform="translate(46 92) rotate(-12)"><path d={leaf} fill="#2e8b4a" transform="scale(1.6)" /></g>
    </svg>
  );
}

export default function Hero() {
  return (
    <section className={`${sans.className} relative min-h-[100svh] overflow-hidden bg-[#4b8fd8] text-white`}>
      <style>{CSS}</style>

      {/* Curtain: four panels lift in sequence while the name fades out */}
      <div className="kk-curtain pointer-events-none absolute inset-0 z-40 flex" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="kk-panel" style={withVar('--i', i)} />
        ))}
      </div>
      <div className={`kk-mark pointer-events-none absolute inset-0 z-50 flex items-center justify-center ${mark.className} text-5xl text-[#f7f3ec] md:text-7xl`} aria-hidden="true">
        Kaskikot
      </div>

      {/* The photo as it is: no dark layers, no tint */}
      <div className="kk-img absolute inset-0">
        <Image src={HERO.src} alt={HERO.alt} fill priority sizes="100vw" className={`object-cover ${HERO.position}`} />
      </div>

      <div className="relative z-10 mx-auto flex min-h-[100svh] w-full max-w-[1400px] flex-col justify-between gap-10 px-5 pb-5 pt-28 md:px-12 md:pb-9 lg:px-16">
        {/* What you are getting, in one glance */}
        <div>
          <p className={`kk-fade flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-bold uppercase tracking-[.22em] sm:text-xs md:text-[13px] ${GLOW}`} style={withVar('--d', '1.2s')}>
            <span>Relax</span>
            <i className="size-1.5 rounded-full bg-[#ffd23f]" aria-hidden="true" />
            <span>Reconnect</span>
            <i className="size-1.5 rounded-full bg-[#ffd23f]" aria-hidden="true" />
            <span>Experience nature</span>
          </p>

          <h1 className={`mt-3 ${GLOW}`}>
            <span className="kk-line !pb-[.18em] !pt-[.12em]">
              <span style={withVar('--i', 0)} className={`${script.className} text-[clamp(3rem,9.5vw,8.5rem)] font-bold leading-[1.02]`}>
                {HEADLINE[0]}
              </span>
            </span>
            <span className="kk-line -mt-[.2em] md:-mt-[.35em]">
              <span style={withVar('--i', 1)} className="text-[clamp(2.4rem,6.6vw,6rem)] font-bold leading-[1.05] tracking-[-0.025em]">
                {HEADLINE[1]}
              </span>
            </span>
          </h1>

          <p className={`kk-fade mt-4 max-w-xl text-base font-medium leading-relaxed md:mt-5 md:text-lg ${GLOW}`} style={withVar('--d', '1.9s')}>
            A hilltop retreat in Kaskikot, Pokhara. Wake up to the Annapurnas, with the lake below.
          </p>
        </div>

        {/* Search and amenities, on light panels so the photo can stay bright */}
        <div className="flex flex-col gap-3 md:gap-4">
          <div className="kk-fade relative z-20" style={withVar('--d', '2.05s')}>
            <HeroSearch />
          </div>

          {/* Services panel: solid cream, green icons, like the brochure (no glass) */}
          <div
            className="kk-fade relative overflow-hidden rounded-[1.75rem] border border-[#eadfc2] bg-gradient-to-b from-[#fffaf0] to-[#f5edd8] text-[#1f5a34] shadow-[0_20px_50px_-18px_rgba(40,60,30,.45)]"
            style={withVar('--d', '2.25s')}
          >
            <Leaves className="-bottom-3 -left-3 w-28 md:w-32" />
            <Leaves className="-bottom-3 -right-3 w-28 -scale-x-100 md:w-32" />

            <ul className="relative grid grid-cols-2 lg:grid-cols-6" aria-label="What you get">
              {AMENITIES.map((a, i) => (
                <li
                  key={a.title}
                  className={`group flex flex-col items-center border-[#dcd2b6] px-3 py-4 text-center max-lg:odd:border-r lg:border-l lg:px-4 lg:py-6 lg:first:border-l-0 ${i < AMENITIES.length - 2 ? 'max-lg:border-b' : ''}`}
                >
                  <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="#1f6b3e" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:scale-110 lg:h-10 lg:w-10" aria-hidden="true">
                    {a.icon}
                  </svg>
                  <span className="mt-2 text-[13px] font-bold leading-snug sm:text-sm lg:text-[15px]">{a.title}</span>
                  <span className="mt-0.5 text-xs leading-snug text-[#4d6a55] lg:text-[13px]">{a.note}</span>
                </li>
              ))}
            </ul>

            <p className={`${script.className} relative flex items-center gap-3 px-5 pb-4 pt-1 justify-center text-[1.2rem] font-semibold text-[#1f5a34] sm:text-2xl md:gap-5 lg:pb-5`}>
              <span className="hidden h-px flex-1 bg-[#1f5a34]/30 sm:block" aria-hidden="true" />
              <span className="text-balance text-center">Nature <span aria-hidden="true">•</span> Comfort <span aria-hidden="true">•</span> Great Memories</span>
              <span className="hidden h-px flex-1 bg-[#1f5a34]/30 sm:block" aria-hidden="true" />
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}