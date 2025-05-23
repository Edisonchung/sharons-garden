import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from './button'; // ✅ fixed relative import
import { auth, googleProvider } from '../../lib/firebase'; // ✅ fixed relative import
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';

export default function Navbar() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error('Google Login Error:', err.message);
      alert('Login failed. Please check the console for details.');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Logout Error:', err.message);
    }
  };

  return (
    <motion.nav
      initial={{ x: '-100%' }}
      animate={{ x: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="fixed top-0 left-0 w-full bg-pink-100 p-4 shadow-md z-50 flex justify-between items-center"
    >
      <h1 className="text-xl font-bold text-purple-700">🌸 Sharon's Garden</h1>
      <div className="flex items-center gap-4">
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
    </motion.nav>
  );
}
