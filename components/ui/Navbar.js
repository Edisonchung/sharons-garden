// components/Navbar.js
import React, { useEffect, useState } from 'react';
import { Button } from './ui/button';
import { auth, googleProvider } from '../../lib/firebase';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';

export default function Navbar() {
  const [user, setUser] = useState(null);

  // Track login state
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
    <nav className="bg-pink-100 p-4 shadow flex justify-between items-center">
      <h1 className="text-xl font-bold text-purple-700">🌸 Sharon's Garden</h1>
      <div className="flex gap-4 items-center">
        {user ? (
          <>
            <span className="text-sm text-gray-700">Hi, {user.displayName || user.email}</span>
            <Button onClick={handleLogout} variant="outline">
              Logout
            </Button>
          </>
        ) : (
          <Button onClick={handleLogin}>Login with Google</Button>
        )}
      </div>
    </nav>
  );
}
