  // components/ui/Navbar.js
import Link from 'next/link';
import { Button } from './button';

export default function Navbar() {
  return (
    <nav className="w-full bg-white shadow-md py-4 px-6 flex justify-between items-center">
      <Link href="/">
        <span className="text-xl font-bold text-purple-700">🌸 Sharon's Garden</span>
      </Link>
      <div className="flex gap-4">
        <Link href="/">
          <Button variant="outline">Home</Button>
        </Link>
        <Link href="/garden/my">
          <Button variant="outline">My Garden</Button>
        </Link>
        <Link href="/garden/dedications">
          <Button variant="outline">Dedications</Button>
        </Link>
        <Link href="/garden/stats">
          <Button variant="outline">Stats</Button>
        </Link>
      </div>
    </nav>
  );
}
