import NavBar from "./components/navbar";
import Hero from "./components/hero";
import Stay from "./components/stay";
import Experiences from "./components/experience";
import Contact from "./components/contact";
import Views from "./components/views";
import Location from "./components/location";
import { sans } from "./Fonts";

export default function Home() {
  return (
    <>
      <NavBar intro />
      <main id="main" className={sans.className}>
        <Hero />
        <Stay />
        <Experiences />
        <Views />
        <Location />
        <Contact />
      </main>
    </>
  );
}
