import Link from "next/link";

export default function NavBar(){
    return (
        <div className="font-body absolute">
            <Link href="/">Home</Link>
            <Link href="/">Rooms</Link>
            <Link href="/">Experiences</Link>
            <Link href="/">Gallery</Link>
            <Link className="text-primary" href="/">Book Now</Link>
        </div>
    )
}