import React, { useEffect, useState } from 'react';
import { Button } from './button';
import { auth, googleProvider, db } from '../../lib/firebase';
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import Link from 'next/link';
import { useRouter } from 'next/router';

export default function Navbar() {
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [hasUnwatered, setHasUnwatered] = useState(false);
  const router = useRouter();

  const isActive = (path) => router.pathname === path;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const flowerQuery = query(
          collection(db, 'flowers'),
          where('userId', '==', currentUser.uid),
          where('bloomed', '==', false)
        );
        const snapshot = await getDocs(flowerQuery);
        const today = new Date().toDateString();
        const needsWater = snapshot.docs.some((doc) => {
          const lastKey = `lastWatered_${doc.id}`;
          const last = localStorage.getItem(lastKey);
          return !last || new Date(last).toDateString() !== today;
        });
        setHasUnwatered(needsWater);
      } else {
        setHasUnwatered(false);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
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

  const linkClass = (path) =>
    `${isActive(path) ? 'font-bold underline text-purple-900 dark:text-white' : 'text-purple-700 dark:text-white'} hover:underline`;

  return (
    <>
      <div className="fixed top-4 left-4 z-50">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="bg-purple-500 text-white p-2 rounded-md shadow-md hover:bg-purple-600 transition"
        >
          ☰
        </button>
      </div>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-40 z-30"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      <div
        className={`fixed top-0 left-0 h-full w-64 bg-pink-100 dark:bg-gray-900 shadow-xl p-6 z-40 transform transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-xl font-bold text-purple-700 dark:text-white">🌸 Sharon's Garden</h1>
          <button
            onClick={() => setSidebarOpen(false)}
            className="text-xl font-bold text-purple-700 dark:text-white"
          >
            ✕
          </button>
        </div>

        <nav className="flex flex-col gap-4 relative">
          <Link href="/" className={linkClass('/')}>🏠 Home</Link>

          <div className="relative">
            <Link href="/garden/my" className={linkClass('/garden/my')}>
              🌱 My Garden
            </Link>
            {hasUnwatered && (
              <span className="absolute -top-1 -right-3 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center animate-ping-short" title="Some seeds need watering">
                !
              </span>
            )}
          </div>

          <Link href="/garden/profile" className={linkClass('/garden/profile')}>👤 Profile</Link>
          <Link href="/garden/achievements" className={linkClass('/garden/achievements')}>🏆 Achievements</Link>
          <Link href="/garden/settings" className={linkClass('/garden/settings')}>⚙️ Settings</Link>
          <Link href="/garden/timeline" className={linkClass('/garden/timeline')}>🗓️ Timeline</Link>
          <Link href="/garden/leaderboard" className={linkClass('/garden/leaderboard')}>🏅 Leaderboard</Link>
          <Link href="/garden/logs" className={linkClass('/garden/logs')}>📊 Logs</Link>

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
