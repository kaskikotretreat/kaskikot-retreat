'use client';

import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, MouseEvent as ReactMouseEvent } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { display, sans } from '../Fonts';

const WHATSAPP = ''; // digits only with country code, e.g. '9779812345678'. Empty hides the button.

// Each id should match a section on the home page: <section id="stay">.
const LINKS = [
  { id: 'stay', label: 'The stay' },
  { id: 'experiences', label: 'Experiences' },
  { id: 'views', label: 'Views' },
  { id: 'contact', label: 'Contact' },
];

const CSS = `
@keyframes kk-nav-in { from { opacity: 0; transform: translateY(-14px); } }
.kk-nav-in { animation: kk-nav-in .9s cubic-bezier(.22,1,.36,1) 2s backwards; }
.kk-menu { clip-path: circle(0px at calc(100% - 2.4rem) 2.25rem); visibility: hidden;
  transition: clip-path .5s cubic-bezier(.76,0,.24,1), visibility 0s linear .5s; }
.kk-menu[data-open="true"] { clip-path: circle(150% at calc(100% - 2.4rem) 2.25rem); visibility: visible;
  transition: clip-path .7s cubic-bezier(.76,0,.24,1), visibility 0s; }
.kk-menu-item { opacity: 0; transform: translateY(24px); transition: opacity .3s ease, transform .3s ease; }
.kk-menu[data-open="true"] .kk-menu-item { opacity: 1; transform: none;
  transition: opacity .6s ease calc(.3s + var(--i) * .07s), transform .7s cubic-bezier(.22,1,.36,1) calc(.3s + var(--i) * .07s); }
@media (prefers-reduced-motion: reduce) {
  .kk-nav-in { animation: none; }
  .kk-menu, .kk-menu[data-open="true"], .kk-menu-item, .kk-menu[data-open="true"] .kk-menu-item { transition: none; }
}
`;

const withVar = (name: string, value: number) => ({ [name]: value }) as CSSProperties;
const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const focusRing = 'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-current';

export default function NavBar({ intro = false }: { intro?: boolean }) {
  const pathname = usePathname();
  const isHome = pathname === '/';

  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState('');

  const progressRef = useRef<HTMLDivElement>(null);
  const lastY = useRef(0);
  const ticking = useRef(false);

  // Scroll: solid background, hide on scroll down / show on scroll up, progress line.
  useEffect(() => {
    const update = () => {
      ticking.current = false;
      const y = window.scrollY;
      setScrolled(y > 24);
      if (y < 200) setActive('');

      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (progressRef.current) {
        progressRef.current.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`;
      }
      if (!open) {
        if (y < 120) setHidden(false);
        else if (y > lastY.current + 6) setHidden(true);
        else if (y < lastY.current - 6) setHidden(false);
      }
      lastY.current = y;
    };
    const onScroll = () => {
      if (!ticking.current) {
        ticking.current = true;
        requestAnimationFrame(update);
      }
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [open]);

  // Highlight the link of the section in the middle of the screen (home page only).
  useEffect(() => {
    if (!isHome) return;
    const sections = LINKS.map((l) => document.getElementById(l.id)).filter((el): el is HTMLElement => !!el);
    if (sections.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActive(e.target.id)),
      { rootMargin: '-45% 0px -50% 0px' },
    );
    sections.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [isHome]);

  // Mobile menu: lock page scroll, close on Escape or when the screen grows.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    const wide = window.matchMedia('(min-width: 768px)');
    const onWide = () => wide.matches && setOpen(false);
    window.addEventListener('keydown', onKey);
    wide.addEventListener('change', onWide);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
      wide.removeEventListener('change', onWide);
    };
  }, [open]);

  // On the home page scroll smoothly; elsewhere let the link navigate to "/#section".
  const goTo = (e: ReactMouseEvent<HTMLAnchorElement>, id: string) => {
    const wasOpen = open;
    setOpen(false);
    if (!isHome) return;
    const target = document.getElementById(id);
    if (!target) return;
    e.preventDefault();
    setTimeout(() => {
      target.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
      history.replaceState(null, '', `#${id}`);
    }, wasOpen ? 80 : 0); // wait for the menu to release the page scroll lock
  };

  const goTop = (e: ReactMouseEvent<HTMLAnchorElement>) => {
    setOpen(false);
    if (!isHome) return;
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  };

  const current = isHome ? active : '';
  const solid = scrolled && !open; // light bar with dark text
  const underline = solid ? 'after:bg-[#b5653a]' : 'after:bg-[#f7f3ec]';

  return (
    <>
      <style>{CSS}</style>

      <a
        href="#main"
        className="sr-only z-[60] rounded-md bg-[#f7f3ec] px-4 py-2 text-sm font-medium text-[#1f2f26] focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>

      <header
        className={`${sans.className} fixed inset-x-0 top-0 z-50 transition-[transform,background-color,box-shadow] duration-500 ease-[cubic-bezier(.22,1,.36,1)] motion-reduce:transition-none ${
          hidden && !open ? '-translate-y-full' : 'translate-y-0'
        } ${
          solid
            ? 'bg-[#f7f3ec]/90 text-[#1f2f26] shadow-[0_1px_0_rgba(31,47,38,.14)] backdrop-blur-md'
            : 'bg-transparent text-[#f7f3ec]'
        } ${intro ? 'kk-nav-in' : ''}`}
      >
        {/* Dark scrim keeps white text readable over bright photos */}
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-x-0 top-0 -z-10 h-28 transition-opacity duration-500 ${solid ? 'opacity-0' : 'opacity-100'}`}
          style={{ background: 'linear-gradient(to bottom, rgba(18,28,22,.6), rgba(18,28,22,0))' }}
        />

        <div className={`mx-auto flex max-w-[1400px] items-center justify-between px-6 transition-[height] duration-500 md:px-12 lg:px-16 ${solid ? 'h-16' : 'h-[72px]'}`}>
          <Link href="/" onClick={goTop} className={`group flex items-center gap-2.5 rounded-md ${focusRing}`}>
            <svg width="28" height="28" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="transition-transform duration-300 group-hover:-translate-y-0.5 motion-reduce:transition-none">
              <path d="M2 25 L10 12 L15 19 L21 8 L30 25" />
              <circle cx="25" cy="7" r="2" />
            </svg>
            <span className={`${display.className} text-2xl tracking-wide`}>Kaskikot Retreat</span>
          </Link>

          <nav aria-label="Main" className="hidden items-center gap-8 md:flex">
            {LINKS.map((l) => (
              <Link
                key={l.id}
                href={`/#${l.id}`}
                onClick={(e) => goTo(e, l.id)}
                data-active={current === l.id}
                aria-current={current === l.id ? 'location' : undefined}
                className={`relative rounded-sm py-1 text-sm font-medium after:absolute after:inset-x-0 after:-bottom-0.5 after:h-0.5 after:origin-left after:scale-x-0 after:rounded-full after:transition-transform after:duration-300 hover:after:scale-x-100 data-[active=true]:after:scale-x-100 motion-reduce:after:transition-none ${underline} ${focusRing}`}
              >
                {l.label}
              </Link>
            ))}
            <Link
              href="/booking"
              className={`rounded-full px-5 py-2 text-sm font-semibold transition-colors duration-300 ${focusRing} ${
                solid ? 'bg-[#1f2f26] text-[#f7f3ec] hover:bg-[#2f4a3a]' : 'bg-[#f7f3ec] text-[#1f2f26] hover:bg-white'
              }`}
            >
              Book a stay
            </Link>
          </nav>

          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            aria-controls="mobile-menu"
            className={`relative -mr-2 flex h-11 w-11 items-center justify-center rounded-full md:hidden ${focusRing}`}
          >
            <span className="relative block h-3.5 w-6">
              <span className={`absolute left-0 h-0.5 w-6 rounded-full bg-current transition-all duration-300 motion-reduce:transition-none ${open ? 'top-[6px] rotate-45' : 'top-0'}`} />
              <span className={`absolute left-0 top-[6px] h-0.5 w-6 rounded-full bg-current transition-all duration-300 motion-reduce:transition-none ${open ? 'scale-x-0 opacity-0' : ''}`} />
              <span className={`absolute left-0 h-0.5 w-6 rounded-full bg-current transition-all duration-300 motion-reduce:transition-none ${open ? 'top-[6px] -rotate-45' : 'top-[12px]'}`} />
            </span>
          </button>
        </div>

        {/* Scroll progress */}
        <div aria-hidden="true" className={`absolute inset-x-0 bottom-0 h-0.5 transition-opacity duration-300 ${solid ? 'opacity-100' : 'opacity-0'}`}>
          <div ref={progressRef} className="h-full origin-left bg-[#b5653a]" style={{ transform: 'scaleX(0)' }} />
        </div>
      </header>

      {/* Mobile menu: circle opens from the menu button, links rise in one by one */}
      <div
        id="mobile-menu"
        data-open={open}
        aria-hidden={!open}
        className={`${sans.className} kk-menu fixed inset-0 z-40 flex flex-col justify-between bg-[#1f2f26] px-6 pb-8 pt-28 text-[#f7f3ec] md:hidden`}
      >
        <ul>
          {LINKS.map((l, i) => (
            <li key={l.id} className="kk-menu-item border-b border-white/15" style={withVar('--i', i)}>
              <Link
                href={`/#${l.id}`}
                onClick={(e) => goTo(e, l.id)}
                aria-current={current === l.id ? 'location' : undefined}
                className={`flex items-center justify-between py-4 ${display.className} text-5xl ${focusRing}`}
              >
                {l.label}
                {current === l.id && <span className="h-2.5 w-2.5 rounded-full bg-[#e0a37f]" aria-hidden="true" />}
              </Link>
            </li>
          ))}
        </ul>

        <div className="kk-menu-item space-y-3" style={withVar('--i', LINKS.length)}>
          <Link
            href="/booking"
            onClick={() => setOpen(false)}
            className={`block rounded-xl bg-[#f7f3ec] py-3.5 text-center font-semibold text-[#1f2f26] ${focusRing}`}
          >
            Book a stay
          </Link>
          {WHATSAPP && (
            <a href={`https://wa.me/${WHATSAPP}`} className={`block rounded-xl border border-white/40 py-3.5 text-center font-medium ${focusRing}`}>
              Ask on WhatsApp
            </a>
          )}
          <p className="pt-2 text-center text-sm opacity-80">Kaskikot, Pokhara, Nepal</p>
        </div>
      </div>
    </>
  );
}