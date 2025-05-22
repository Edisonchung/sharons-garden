// components/ui/Navbar.js
import Link from 'next/link';
import { useState } from 'react';
import { Button } from './button';

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed top-0 left-0 h-full z-50">
      <div className="h-full flex">
        <div className={`bg-white shadow-md w-60 transition-transform transform ${open ? 'translate-x-0' : '-translate-x-full'} duration-300 flex flex-col p-4`}>
          <div className="mb-6 text-purple-700 font-bold text-xl">🌸 Sharon's Garden</div>
          <Link href="/">
            <Button variant="ghost" className="justify-start w-full">🏡 Home</Button>
          </Link>
          <Link href="/garden/my">
            <Button variant="ghost" className="justify-start w-full">🌿 My Garden</Button>
          </Link>
          <Link href="/garden/dedications">
            <Button variant="ghost" className="justify-start w-full">💬 Dedications</Button>
          </Link>
          <Link href="/garden/stats">
            <Button variant="ghost" className="justify-start w-full">📊 Stats</Button>
          </Link>
        </div>
        <button onClick={() => setOpen(!open)} className="p-2 bg-purple-600 text-white rounded-r focus:outline-none">
          {open ? '❌' : '☰'}
        </button>
      </div>
    </div>
  );
}
