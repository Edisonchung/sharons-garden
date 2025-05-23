// components/ui/Navbar.js
import React, { useEffect, useState } from 'react';
import { Button } from './button';
import { auth, googleProvider, db } from '../../lib/firebase';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, query, where } from 'firebase/firestore';
import Link from 'next/link';

export default function Navbar() {
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [unwateredCount, setUnwateredCount] = useState(0);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  useEffect(() => {
    const fetchUnwatered = async () => {
      if (user) {
        const q = query(collection(db, 'flowers'), where('userId', '==', user.uid));
        const snapshot = await getDocs(q);
        const today = new Date().toDateString();
        let count = 0;
        snapshot.forEach((doc) => {
          const flower = doc.data();
          const lastWateredKey = `lastWatered_${doc.id}`;
          const lastWatered = localStorage.getItem(lastWateredKey);
          if (!lastWatered || new Date(lastWatered).toDateString() !== today) {
            count++;
          }
        });
        setUnwateredCount(count);
      }
    };
    fetchUnwatered();
  }, [user]);

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

  const handleOverlayClick = () => {
    setSidebarOpen(false);
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

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-40 z-30"
          onClick={handleOverlayClick}
        ></div>
      )}

      {/* Sidebar */}
      <div
        className={`fixed top-0 left-0 h-full w-64 bg-pink-100 dark:bg-gray-900 shadow-xl p-6 z-40 transform transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-xl font-bold text-purple-700 dark:text-white">🌸 Sharon's Garden</h1>
          <button onClick={() => setSidebarOpen(false)} className="text-xl font-bold text-purple-700 dark:text-white">
            ✕
          </button>
        </div>

        <nav className="flex flex-col gap-4">
          <Link href="/" className="text-purple-700 dark:text-white hover:underline">🏠 Home</Link>
          <Link href="/garden/my" className="text-purple-700 dark:text-white hover:underline relative">
            🌱 My Garden
            {unwateredCount > 0 && (
              <span className="absolute -top-1 -right-2 text-xs bg-red-500 text-white rounded-full px-1.5 py-0.5">
                !
              </span>
            )}
          </Link>
          <Link href="/garden/profile" className="text-purple-700 dark:text-white hover:underline">👤 Profile</Link>
          <Link href="/garden/achievements" className="text-purple-700 dark:text-white hover:underline">🏆 Achievements</Link>
          <Link href="/garden/settings" className="text-purple-700 dark:text-white hover:underline">⚙️ Settings</Link>

          <Button onClick={() => setDarkMode(!darkMode)} variant="outline" className="mt-2">
            {darkMode ? '🌞 Light Mode' : '🌙 Dark Mode'}
          </Button>

          {user ? (
            <div className="mt-4">
              {user.photoURL ? (
                <img src={user.photoURL} alt="Profile" className="w-12 h-12 rounded-full mb-2" />
              ) : (
                <div className="w-12 h-12 rounded-full mb-2 bg-gray-500 text-white flex items-center justify-center text-xl">
                  {user.displayName ? user.displayName.charAt(0) : 'U'}
                </div>
              )}
              <span className="text-sm text-gray-800 dark:text-gray-200 block mb-2">Hi, {user.displayName || user.email}</span>
              <Button onClick={handleLogout} variant="outline">Logout</Button>
            </div>
          ) : (
            <Button onClick={handleLogin} className="mt-4">Login with Google</Button>
          )}
        </nav>
      </div>
    </>
  );
}
