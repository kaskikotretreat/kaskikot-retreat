'use client';

// app/components/experiences.tsx
// Apple-style scroll storytelling with no extra packages:
//  1. an intro sentence whose words light up as you scroll
//  2. a pinned panel: scrolling swaps the photo (wipe) and the text, with progress bars
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { display, sans } from '../Fonts';

type Experience = {
  title: string;
  summary: string;
  highlights: string[];
  facts?: { label: string; value: string }[]; // shown only when filled in, e.g. { label: 'Walking time', value: '45 min' }
  image: string;
  position: string; // CSS object-position, picks which part of the photo shows
  zoom: number; // 1.1 or more, crops in closer
};

// TODO: replace each image with its own photo (put them in public/images/).
// The hero photo is used as a stand-in so the section works right away.
const EXPERIENCES: Experience[] = [
  {
    title: 'Sunrise hike to the hill',
    summary: 'Walk up before dawn and watch the first light reach the mountain range, with the lake and valley below you.',
    highlights: ['Sunrise over the mountain range', 'The lake and valley from the top'],
    image: '/images/hero.jpeg',
    position: '50% 30%',
    zoom: 1.1,
  },
  {
    title: 'Kaskikot Durbar',
    summary: 'Hike to the historic Kaskikot Durbar for wide, scenic views of both the lake and the mountains.',
    highlights: ['A historic durbar to explore', 'Views of the lake and the mountains'],
    image: '/images/kaskikot.jpeg',
    position: '12% 65%',
    zoom: 1.35,
  },
  {
    title: 'Life on the farm',
    summary: 'Join the daily work: milk the buffaloes and spend time working in the fields.',
    highlights: ['Milking the buffaloes', 'Working in the fields'],
    image: '/images/farming.webp',
    position: '75% 95%',
    zoom: 1.6,
  },
  {
    title: 'Village Exploration',
    summary: 'Immerse yourself in the daily life of Kaskikot, interacting with locals and observing traditional crafts.',
    highlights: ['Guided walk through the village', 'Meet the local community'],
    image: '/images/farming.jpeg',
    position: '50% 50%',
    zoom: 1.2,
  },
  {
    title: 'Local Culinary Tasting',
    summary: 'Discover the authentic flavors of Kaskikot with a curated tasting of traditional dishes prepared by local cooks.',
    highlights: ['Sample traditional Nepali cuisine', 'Learn about local ingredients'],
    image: '/images/food.jpg',
    position: '50% 50%',
    zoom: 1.1,
  },
];

const INTRO = 'Come for the views. Stay for the early mornings, the old durbar and a day on the farm.'.split(' ');

const CSS = `
.kx-word { opacity: calc(.2 + .8 * clamp(0, calc(var(--p, 1) * var(--n) - var(--i)), 1)); }
@media (prefers-reduced-motion: reduce) {
  .kx-word { opacity: 1; }
  .kx-anim { transition: none !important; }
}
`;

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const withVars = (vars: Record<string, string | number>) => vars as CSSProperties;
const N = EXPERIENCES.length;
const STEP_VH = 80; // screens of scrolling per experience (lower = faster)
const MAX_BARS = 6; // above this, one continuous progress bar replaces the segmented bars

export default function Experiences() {
  const [active, setActive] = useState(0);
  const introRef = useRef<HTMLHeadingElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);

  // One scroll handler drives both effects by writing CSS variables (no re-render per frame).
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const vh = window.innerHeight;

      const intro = introRef.current;
      if (intro) {
        const top = intro.getBoundingClientRect().top;
        intro.style.setProperty('--p', clamp((vh * 0.85 - top) / (vh * 0.5), 0, 1).toFixed(3));
      }

      const pin = pinRef.current;
      if (pin) {
        const rect = pin.getBoundingClientRect();
        const raw = clamp(-rect.top / (rect.height - vh), 0, 1) * N;
        const index = Math.min(N - 1, Math.floor(raw));
        pin.style.setProperty('--seg', (raw - index).toFixed(3));
        setActive(index);
      }
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  const jumpTo = (i: number) => {
    const pin = pinRef.current;
    if (!pin) return;
    const segment = (pin.offsetHeight - window.innerHeight) / N;
    const top = pin.getBoundingClientRect().top + window.scrollY + segment * (i + 0.5);
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top, behavior: reduce ? 'auto' : 'smooth' });
  };

  return (
    <section id="experiences" className={`${sans.className} scroll-mt-20 bg-[#1f2f26] text-[#f7f3ec]`}>
      <style>{CSS}</style>

      {/* 1. Words light up as you scroll */}
      <div className="mx-auto flex min-h-[85svh] max-w-[1400px] items-center px-6 md:px-12 lg:px-16">
        <h2
          ref={introRef}
          className={`${display.className} max-w-5xl text-[clamp(2.2rem,5.6vw,5rem)] leading-[1.08]`}
          style={withVars({ '--n': INTRO.length, '--p': 0 })}
        >
          {INTRO.map((word, i) => (
            <span key={i} className="kx-word" style={withVars({ '--i': i })}>
              {word}{' '}
            </span>
          ))}
        </h2>
      </div>

      {/* 2. Pinned story: each experience owns one screen of scrolling */}
      <div ref={pinRef} className="relative" style={{ height: `${N * STEP_VH + 100}svh` }}>
        <div className="sticky top-0 flex h-[100svh] flex-col overflow-hidden lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-center lg:gap-12 lg:px-16">
          {/* Photos */}
          <div className="relative order-1 h-[44svh] shrink-0 overflow-hidden lg:order-2 lg:h-[78svh] lg:rounded-3xl">
            {EXPERIENCES.map((exp, i) => (
              <div
                key={exp.title}
                className="kx-anim absolute inset-0"
                style={{
                  zIndex: i,
                  clipPath: i <= active ? 'inset(0% 0% 0% 0%)' : 'inset(100% 0% 0% 0%)',
                  transition: 'clip-path .9s cubic-bezier(.76,0,.24,1)',
                }}
              >
                <div
                  className="kx-anim absolute inset-0"
                  style={{
                    transform: i === active ? 'scale(1)' : 'scale(1.15)',
                    transition: 'transform 1.6s cubic-bezier(.22,1,.36,1)',
                  }}
                >
                  <div
                    className="absolute inset-0"
                    style={{ transform: `translateY(calc(var(--seg, 0) * ${i === active ? -3 : 0}%)) scale(${exp.zoom})` }}
                  >
                    <Image
                      src={exp.image}
                      alt={exp.title}
                      fill
                      sizes="(min-width: 1024px) 58vw, 100vw"
                      className="object-cover"
                      style={{ objectPosition: exp.position }}
                    />
                  </div>
                </div>
              </div>
            ))}
            <div className="pointer-events-none absolute inset-0 z-10 bg-[#2f4a3a] opacity-20 mix-blend-multiply" />
          </div>

          {/* Text */}
          <div className="order-2 flex flex-1 flex-col justify-center px-6 py-5 lg:order-1 lg:flex-none lg:p-0">
            <div className="mb-5 flex items-center gap-3 lg:mb-8">
              <span className="text-sm tabular-nums text-[#e0a37f]">
                {String(active + 1).padStart(2, '0')} / {String(N).padStart(2, '0')}
              </span>
              {N > MAX_BARS ? (
                <div className="relative h-0.5 flex-1 overflow-hidden rounded-full bg-white/20" aria-hidden="true">
                  <span
                    className="absolute inset-0 origin-left bg-[#e0a37f]"
                    style={{ transform: `scaleX(calc((${active} + var(--seg, 0)) / ${N}))` }}
                  />
                </div>
              ) : (
              <div className="flex flex-1 gap-2">
                {EXPERIENCES.map((exp, i) => (
                  <button
                    key={exp.title}
                    type="button"
                    onClick={() => jumpTo(i)}
                    aria-label={`Go to ${exp.title}`}
                    aria-current={i === active}
                    className="group h-6 flex-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e0a37f]"
                  >
                    <span className="relative block h-0.5 w-full overflow-hidden rounded-full bg-white/20 transition-[height] group-hover:h-1">
                      <span
                        className="absolute inset-0 origin-left bg-[#e0a37f]"
                        style={{ transform: `scaleX(${i < active ? 1 : i === active ? 'var(--seg, 0)' : 0})` }}
                      />
                    </span>
                  </button>
                ))}
              </div>
              )}
            </div>

            <div className="grid">
              {EXPERIENCES.map((exp, i) => {
                const on = i === active;
                return (
                  <div
                    key={exp.title}
                    inert={!on}
                    aria-hidden={!on}
                    className="kx-anim [grid-area:1/1]"
                    style={{
                      opacity: on ? 1 : 0,
                      transform: on ? 'none' : `translateY(${i < active ? '-28px' : '28px'})`,
                      transition: on
                        ? 'opacity .7s ease .3s, transform .9s cubic-bezier(.22,1,.36,1) .3s'
                        : 'opacity .3s ease, transform .5s ease',
                    }}
                  >
                    <h3 className={`${display.className} text-[clamp(2.1rem,4.6vw,4.2rem)] leading-[1.02]`}>{exp.title}</h3>
                    <p className="mt-3 max-w-md text-base leading-relaxed text-[#f7f3ec]/85 lg:mt-5 lg:text-lg">{exp.summary}</p>

                    <ul className="mt-4 space-y-1.5 text-sm [@media(max-height:700px)]:hidden lg:mt-6 lg:text-base">
                      {exp.highlights.map((h) => (
                        <li key={h} className="flex items-center gap-3">
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#e0a37f]" aria-hidden="true" />
                          {h}
                        </li>
                      ))}
                    </ul>

                    {exp.facts && exp.facts.length > 0 && (
                      <dl className="mt-5 flex flex-wrap gap-x-8 gap-y-2 border-t border-white/15 pt-4 text-sm">
                        {exp.facts.map((f) => (
                          <div key={f.label}>
                            <dt className="text-[#f7f3ec]/60">{f.label}</dt>
                            <dd className="font-medium">{f.value}</dd>
                          </div>
                        ))}
                      </dl>
                    )}

                    <Link
                      href="/booking"
                      className="mt-5 inline-block rounded-full bg-[#f7f3ec] px-6 py-2.5 text-sm font-semibold text-[#1f2f26] transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white lg:mt-7"
                    >
                      Include it in your stay
                    </Link>
                  </div>
                );
              })}
            </div>

            {active < N - 1 && (
              <button
                type="button"
                onClick={() => jumpTo(active + 1)}
                className="mt-4 self-start text-left text-sm text-[#f7f3ec]/70 transition hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#e0a37f] lg:mt-6"
              >
                Up next: <span className="font-medium text-[#f7f3ec]">{EXPERIENCES[active + 1].title}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}