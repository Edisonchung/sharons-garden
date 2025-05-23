import React, { useEffect, useState } from 'react';
import { Button } from './button';
import { auth, googleProvider } from '../../lib/firebase';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import Link from 'next/link';

export default function Navbar() {
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
      {/* Hamburger Button */}
      <div className="fixed top-4 left-4 z-50">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="bg-purple-500 text-white p-2 rounded-md shadow-md hover:bg-purple-600 transition"
        >
          ☰
        </button>
      </div>

      {/* Sidebar */}
      <div
        className={`fixed top-0 left-0 h-full w-64 bg-pink-100 shadow-xl p-6 z-40 transform transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-xl font-bold text-purple-700">🌸 Sharon's Garden</h1>
          <button onClick={() => setSidebarOpen(false)} className="text-xl font-bold text-purple-700">
            ✕
          </button>
        </div>

        <nav className="flex flex-col gap-4">
          <Link href="/" className="text-purple-700 hover:underline">🏠 Home</Link>
          <Link href="/garden" className="text-purple-700 hover:underline">🌱 My Garden</Link>
          <Link href="/garden/profile" className="text-purple-700 hover:underline">👤 Profile</Link>
          <Link href="/garden/achievements" className="text-purple-700 hover:underline">🏆 Achievements</Link>
          <Link href="/garden/settings" className="text-purple-700 hover:underline">⚙️ Settings</Link>

          {user ? (
            <div className="mt-4">
              {user.photoURL && (
                <img src={user.photoURL} alt="Profile" className="w-12 h-12 rounded-full mb-2" />
              )}
              <span className="text-sm">Hi, {user.displayName || user.email}</span>
              <Button onClick={handleLogout} variant="outline" className="mt-2">
                Logout
              </Button>
            </div>
          ) : (
            <Button onClick={handleLogin} className="mt-4">Login with Google</Button>
          )}
        </nav>
      </div>
    </>
  );
}
