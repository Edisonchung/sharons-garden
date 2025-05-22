// components/ui/Navbar.js
import Link from 'next/link';
import { useState } from 'react';
import { Button } from './button';

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed top-0 left-0 z-50">
      <div className="flex h-screen">
        <div
          className={`bg-white shadow-md h-full w-60 transform transition-transform duration-300 ease-in-out ${open ? 'translate-x-0' : '-translate-x-full'}`}
        >
          <div className="p-4">
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
        </div>
        <button
          onClick={() => setOpen(!open)}
          className="bg-purple-600 text-white p-2 rounded-r focus:outline-none"
          style={{ marginLeft: open ? '240px' : '0px', transition: 'margin-left 0.3s' }}
        >
          {open ? '❌' : '☰'}
        </button>
      </div>
    </div>
  );
}
