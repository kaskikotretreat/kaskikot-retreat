import NavBar from "./components/navbar";
import Hero from "./components/hero";
import { display, sans } from "./Fonts";

// Placeholder sections so the nav links scroll and highlight. Replace each with the real section,
// keeping the same id and the scroll-mt-20 class (it stops the fixed navbar covering the heading).
const SECTIONS = [
  { id: "stay", title: "The stay", note: "Rooms, spaces and what is included." },
  { id: "experiences", title: "Experiences", note: "The sunrise hike and things to do nearby." },
  { id: "views", title: "Views", note: "The Annapurna range and the lake, in photos." },
  { id: "contact", title: "Contact", note: "How to reach us, and how to find the property." },
];

export default function Home() {
  return (
    <>
      <NavBar intro />
      <main id="main" className={sans.className}>
        <Hero />
        {SECTIONS.map((s, i) => (
          <section
            key={s.id}
            id={s.id}
            className={`flex min-h-[70vh] scroll-mt-20 flex-col items-center justify-center px-6 text-center text-[#1f2f26] ${
              i % 2 === 0 ? "bg-[#f7f3ec]" : "bg-white"
            }`}
          >
            <h2 className={`${display.className} text-5xl md:text-6xl`}>{s.title}</h2>
            <p className="mt-3 max-w-md text-[#4a5a50]">{s.note}</p>
          </section>
        ))}
      </main>
    </>
  );
}