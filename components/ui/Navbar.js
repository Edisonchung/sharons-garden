// components/ui/Navbar.js
import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import { Button } from './button';

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const sidebarRef = useRef(null);
  const toggleButtonRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target) &&
        toggleButtonRef.current &&
        !toggleButtonRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-black bg-opacity-40 z-40 transition-opacity duration-300" />
      )}

      <div className="fixed top-0 left-0 z-50 h-full">
        <div
          ref={sidebarRef}
          className={`fixed top-0 left-0 h-full bg-white shadow-xl w-64 transform transition-transform duration-300 ease-in-out z-50 ${open ? 'translate-x-0' : '-translate-x-full'}`}
        >
          <div className="p-4 h-full flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-6">
                <span className="text-xl font-bold text-purple-700">🌸 Sharon's Garden</span>
                <button
                  onClick={() => setOpen(false)}
                  className="bg-red-100 text-red-600 hover:bg-red-200 rounded-full px-3 py-1 text-sm"
                >
                  ❌
                </button>
              </div>
              <div className="mb-6 flex items-center gap-3">
                <img
                  src="https://api.dicebear.com/6.x/thumbs/svg?seed=guest"
                  alt="avatar"
                  className="w-10 h-10 rounded-full border border-purple-300"
                />
                <div>
                  <p className="text-xs text-gray-500">Logged in as</p>
                  <p className="text-sm font-medium text-purple-700">guest@user.com</p>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Link href="/">
                  <Button variant="ghost" className="justify-start w-full text-left">🏡 Home</Button>
                </Link>
                <Link href="/garden/my">
                  <Button variant="ghost" className="justify-start w-full text-left">🌿 My Garden</Button>
                </Link>
                <Link href="/garden/dedications">
                  <Button variant="ghost" className="justify-start w-full text-left">💬 Dedications</Button>
                </Link>
                <Link href="/garden/stats">
                  <Button variant="ghost" className="justify-start w-full text-left">📊 Stats</Button>
                </Link>
              </div>
            </div>
            <div className="text-xs text-gray-400 text-center mt-8">© 2025 Sharon's Garden</div>
          </div>
        </div>

        <button
          ref={toggleButtonRef}
          onClick={() => setOpen((prev) => !prev)}
          className="fixed top-4 left-4 z-50 p-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md shadow-md"
        >
          ☰
        </button>
      </div>
    </>
  );
}
