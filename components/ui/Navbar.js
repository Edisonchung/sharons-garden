import React, { useEffect, useState } from 'react';
import { auth, googleProvider } from '../../lib/firebase';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import Link from 'next/link';
import { useRouter } from 'next/router';

export default function Navbar() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

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
      router.push('/auth');
    } catch (err) {
      console.error("Logout Error:", err.message);
    }
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle('dark');
  };

  const isActive = (path) => router.pathname === path;

  return (
    <>
      {/* Hamburger Button */}
      <div className="fixed top-4 left-4 z-50">
        <button
          onClick={() => setSidebarOpen(true)}
          className="bg-purple-500 text-white p-2 rounded-md shadow-md hover:bg-purple-600 transition"
        >
          ☰
        </button>
      </div>

      {/* Backdrop Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-40 z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed top-0 left-0 h-full w-64 bg-pink-100 dark:bg-gray-900 shadow-xl p-6 z-40 transform transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-bold text-purple-700 dark:text-purple-300">🌸 Sharon's Garden</h1>
          <button onClick={() => setSidebarOpen(false)} className="text-xl font-bold text-purple-700 dark:text-purple-300">
            ✕
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-4">
          <Link href="/" className={`${isActive('/') ? 'font-bold' : ''} hover:text-purple-800 text-purple-700 dark:text-purple-300`}>🏠 Home</Link>
          <Link href="/garden" className={`${isActive('/garden') ? 'font-bold' : ''} hover:text-purple-800 text-purple-700 dark:text-purple-300`}>🌱 My Garden</Link>
          <Link href="/garden/profile" className={`${isActive('/garden/profile') ? 'font-bold' : ''} hover:text-purple-800 text-purple-700 dark:text-purple-300`}>👤 Profile</Link>
          <Link href="/garden/achievements" className={`${isActive('/garden/achievements') ? 'font-bold' : ''} hover:text-purple-800 text-purple-700 dark:text-purple-300`}>🏆 Achievements</Link>
          <Link href="/garden/settings" className={`${isActive('/garden/settings') ? 'font-bold' : ''} hover:text-purple-800 text-purple-700 dark:text-purple-300`}>⚙️ Settings</Link>
        </nav>

        <hr className="my-6 border-purple-300 dark:border-purple-600" />

        {/* Theme Toggle */}
        <button
          onClick={toggleDarkMode}
          className="w-full mb-4 bg-yellow-400 text-black py-1 rounded hover:bg-yellow-500 text-sm"
        >
          {darkMode ? '☀️ Light Mode' : '🌙 Dark Mode'}
        </button>

        {/* User Info */}
        {user ? (
          <div className="flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-full bg-purple-200 text-white font-bold text-lg flex items-center justify-center mb-2 overflow-hidden">
              {user.photoURL ? (
                <img src={user.photoURL} alt="Profile" className="rounded-full w-full h-full object-cover" />
              ) : (
                user.displayName?.charAt(0) || 'U'
              )}
            </div>
            <span className="text-sm font-medium text-purple-700 dark:text-purple-300 mb-1 text-ellipsis overflow-hidden w-full">
              Hi, {user.displayName || user.email}
            </span>
            <button
              onClick={handleLogout}
              className="bg-purple-600 text-white px-4 py-1 rounded hover:bg-purple-700 mt-2 text-sm"
            >
              Logout
            </button>
          </div>
        ) : (
          <button
            onClick={handleLogin}
            className="w-full mt-4 bg-purple-600 text-white py-2 rounded hover:bg-purple-700"
          >
            Login with Google
          </button>
        )}
      </div>
    </>
  );
}
