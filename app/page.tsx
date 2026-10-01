import NavBar from "./components/navbar"
import Hero from "./components/hero"

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans ">
      <main className="flex flex-1 w-full max-w-360 px-5 md:px-5 lg:px-0 pb-5 flex-col items-center justify-between  sm:items-start">
        <NavBar />
        <Hero />
      </main>
    </div>
  );
}
