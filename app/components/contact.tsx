// app/components/contact.tsx
// The Contact section: WhatsApp (the quickest way), email and where to find us.
// Server component, no scripts needed. Details live in app/lib/contact.ts.
import type { ReactNode } from 'react';
import { Dancing_Script, Instrument_Serif, Montserrat } from 'next/font/google';
import { CONTACT, whatsappLink } from '../lib/contact';

const serif = Instrument_Serif({ subsets: ['latin'], weight: '400', display: 'swap' });
const script = Dancing_Script({ subsets: ['latin'], weight: ['600', '700'], display: 'swap' });
const sans = Montserrat({ subsets: ['latin'], display: 'swap' });

const QUICK = [
  { label: 'Check availability', text: 'Hello! I would like to check availability at Kaskikot Retreat.' },
  { label: 'Ask about rooms', text: 'Hello! Could you tell me more about your rooms and prices?' },
  { label: 'Plan a group stay', text: 'Hello! We are a group and would like to plan a stay. Can you help?' },
];

const ring = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e8c9a0]';

function Icon({ children, size = 22 }: { children: ReactNode; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

const Chat = () => <Icon><path d="M20 11.5a8 8 0 0 1-11.9 7L4 20l1.5-4A8 8 0 1 1 20 11.5z" /><path d="M9 9.5c.3 2.2 2.3 4.2 5 5l1.2-1.2-1.8-1-.8.7c-.8-.4-1.5-1.1-1.9-1.9l.7-.8-1-1.8z" /></Icon>;
const Mail = () => <Icon><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3.5 7 8.5 6 8.5-6" /></Icon>;
const Pin = () => <Icon><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.4" /></Icon>;
const Arrow = () => <Icon size={18}><path d="M5 12h14M13 6l6 6-6 6" /></Icon>;

function Card({ href, icon, label, value, note, external }: { href: string; icon: ReactNode; label: string; value: ReactNode; note: string; external?: boolean }) {
  return (
    <a
      href={href}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      className={`group flex items-center gap-4 rounded-2xl border border-white/15 bg-white/[0.07] p-4 transition hover:border-white/35 hover:bg-white/[0.12] sm:p-5 ${ring}`}
    >
      <span className="grid size-12 shrink-0 place-items-center rounded-full bg-[#f7f3ec] text-[#2f4a3a] sm:size-14">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-semibold uppercase tracking-[0.2em] text-[#e8c9a0]">{label}</span>
        <span className="mt-0.5 block break-words text-base font-semibold text-white sm:text-lg">{value}</span>
        <span className="block text-sm text-white/65">{note}</span>
      </span>
      <span className="shrink-0 text-white/50 transition group-hover:translate-x-1 group-hover:text-white"><Arrow /></span>
    </a>
  );
}

export default function Contact() {
  return (
    <section id="contact" className={`${sans.className} relative scroll-mt-20 overflow-hidden bg-[#2f4a3a] px-5 py-20 text-white md:px-12 md:py-28 lg:px-16`}>
      {/* soft mountain line, purely decorative */}
      <svg aria-hidden="true" viewBox="0 0 1200 200" preserveAspectRatio="none" className="pointer-events-none absolute inset-x-0 bottom-0 h-40 w-full text-white/[0.05]">
        <path fill="currentColor" d="M0 200V120l140-60 120 70 150-100 140 90 130-60 160 80 120-50 140 60v50z" />
      </svg>

      <div className="relative mx-auto max-w-6xl">
        <header className="mx-auto max-w-2xl text-center">
          <p className={`${script.className} text-3xl font-semibold text-[#e8c9a0] md:text-4xl`}>Say hello</p>
          <h2 className={`${serif.className} mt-1 text-4xl leading-tight md:text-6xl`}>We&rsquo;d love to host you</h2>
          <p className="mt-4 text-white/75 md:text-lg">Questions about rooms, meals or getting here? Message us any time. {CONTACT.replyTime}.</p>
        </header>

        <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-[1.15fr_1fr] lg:gap-8">
          {/* WhatsApp panel */}
          <div className="min-w-0 rounded-3xl bg-[#f7f3ec] p-6 text-[#1f2f26] shadow-[0_30px_60px_-30px_rgba(0,0,0,.6)] sm:p-9">
            <span className="grid size-14 place-items-center rounded-full bg-[#2f4a3a] text-white"><Chat /></span>
            <h3 className={`${serif.className} mt-5 text-3xl md:text-4xl`}>Chat with us on WhatsApp</h3>
            <p className="mt-2 text-[#4a5a50]">The quickest way to get an answer, share photos or confirm a booking.</p>

            <a
              href={whatsappLink('Hello! I found you on your website and have a question.')}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex w-full items-center justify-center gap-3 rounded-full bg-[#a8431f] px-7 py-4 text-base font-semibold text-white shadow-lg shadow-[#a8431f]/25 transition hover:bg-[#8f3718] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a8431f] sm:w-auto"
            >
              <Chat /> {CONTACT.whatsappShown}
            </a>

            <p className="mt-7 text-xs font-semibold uppercase tracking-[0.2em] text-[#8a857a]">Or start with a ready message</p>
            <ul className="mt-3 flex flex-wrap gap-2.5">
              {QUICK.map((q) => (
                <li key={q.label}>
                  <a
                    href={whatsappLink(q.text)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block rounded-full border border-[#cdd8cf] bg-white px-4 py-2 text-sm font-medium text-[#2f4a3a] transition hover:border-[#2f4a3a] hover:bg-[#2f4a3a] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2f4a3a]"
                  >
                    {q.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Email, address, booking */}
          <div className="flex min-w-0 flex-col gap-4">
            <Card href={`mailto:${CONTACT.email}`} icon={<Mail />} label="Email" value={CONTACT.email} note="For longer questions or group plans" />
            <Card
              href={CONTACT.mapUrl}
              external
              icon={<Pin />}
              label="Find us"
              value={CONTACT.addressLines.map((l, i) => <span key={l} className="block">{i === 0 ? l : <span className="text-base font-normal text-white/80">{l}</span>}</span>)}
              note="Tap to open in Google Maps"
            />
            <div className="mt-auto rounded-2xl border border-dashed border-white/30 p-5 text-center">
              <p className={`${script.className} text-2xl text-[#e8c9a0]`}>Ready to book?</p>
              <p className="mt-1 text-sm text-white/70">Pick your dates and see the price straight away.</p>
              <a href="/booking" className={`mt-4 inline-flex items-center gap-2 rounded-full bg-[#f7f3ec] px-6 py-3 text-sm font-semibold text-[#2f4a3a] transition hover:bg-white ${ring}`}>
                Book your stay <Arrow />
              </a>
            </div>
          </div>
        </div>

        <p className="mt-14 border-t border-white/15 pt-6 text-center text-sm text-white/55">
          &copy; {new Date().getFullYear()} Kaskikot Retreat &amp; Holiday Home &middot; Kaskikot, Pokhara, Nepal
        </p>
      </div>
    </section>
  );
}
