// components/ui/Navbar.js
import Link from 'next/link';
import { useState } from 'react';
import { Button } from './button';

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed top-0 left-0 z-50 h-full">
      <div className={`fixed top-0 left-0 h-full bg-white shadow-lg w-64 transform transition-transform duration-300 ease-in-out ${open ? 'translate-x-0' : '-translate-x-full'}`}>
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
        className="fixed top-4 left-4 z-50 p-2 bg-purple-600 text-white rounded-md shadow-md"
      >
        {open ? '❌' : '☰'}
      </button>
    </div>
  );
}
