// components/ui/Navbar.js
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { auth, googleProvider } from '../../lib/firebase';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { Menu } from 'lucide-react'; // Or use any icon library

export default function Navbar() {
  const [user, setUser] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error("Google Login Error:", err.message);
      alert("Login failed.");
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Logout Error:", err.message);
    }
  };

  return (
    <>
      <nav className="bg-pink-100 p-4 flex justify-between items-center shadow">
        <button onClick={() => setOpen(true)} className="md:hidden">
          <Menu className="h-6 w-6 text-purple-700" />
        </button>
        <h1 className="text-xl font-bold text-purple-700">🌸 Sharon's Garden</h1>
        <div className="hidden md:flex gap-4 items-center">
          <Link href="/" className="text-purple-700 font-medium hover:underline">Home</Link>
          <Link href="/garden/my" className="text-purple-700 font-medium hover:underline">My Garden</Link>
          <Link href="/garden/profile" className="text-purple-700 font-medium hover:underline">Profile</Link>
          {user ? (
            <>
              <span className="text-sm text-gray-700">Hi, {user.displayName || user.email}</span>
              <button onClick={handleLogout} className="px-3 py-1 border border-purple-500 text-purple-700 rounded hover:bg-purple-50">
                Logout
              </button>
            </>
          ) : (
            <button onClick={handleLogin} className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700">
              Login with Google
            </button>
          )}
        </div>
      </nav>

      {/* Mobile Sidebar */}
      <div className={`fixed inset-0 bg-black bg-opacity-30 z-40 ${open ? 'block' : 'hidden'}`} onClick={() => setOpen(false)} />
      <div className={`fixed top-0 left-0 h-full w-64 bg-white shadow-lg z-50 transform transition-transform duration-300 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-4 flex flex-col gap-4">
          <button onClick={() => setOpen(false)} className="self-end text-sm text-purple-600">Close ✖</button>
          <Link href="/" onClick={() => setOpen(false)} className="text-purple-700 font-medium">🏠 Home</Link>
          <Link href="/garden/my" onClick={() => setOpen(false)} className="text-purple-700 font-medium">🌿 My Garden</Link>
          <Link href="/garden/profile" onClick={() => setOpen(false)} className="text-purple-700 font-medium">👤 Profile</Link>
          {user ? (
            <>
              <span className="text-sm text-gray-700">Hi, {user.displayName || user.email}</span>
              <button onClick={handleLogout} className="px-3 py-1 border border-purple-500 text-purple-700 rounded hover:bg-purple-50">
                Logout
              </button>
            </>
          ) : (
            <button onClick={handleLogin} className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700">
              Login with Google
            </button>
          )}
        </div>
      </div>
    </>
  );
}
