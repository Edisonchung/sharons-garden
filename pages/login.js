// pages/login.js
import { useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { useRouter } from 'next/router';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      router.push('/'); // redirect after login
    } catch (err) {
      alert('Google login failed: ' + err.message);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-pink-100 to-purple-200">
      <div className="bg-white p-8 rounded-lg shadow-lg w-96">
        <h2 className="text-2xl font-bold mb-4 text-center text-purple-700">Sign In to Sharon's Garden</h2>
        <input
          type="email"
          placeholder="Email"
          className="w-full border rounded px-3 py-2 mb-3"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          placeholder="Password"
          className="w-full border rounded px-3 py-2 mb-4"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button className="w-full bg-purple-600 text-white py-2 rounded hover:bg-purple-700">
          Sign In
        </button>
        <p className="text-sm text-center mt-4">Don't have an account? <a href="#" className="text-purple-600 underline">Sign Up</a></p>

        <div className="border-t my-4" />
        <button
          onClick={handleGoogleLogin}
          className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600"
        >
          Login with Google
        </button>
      </div>
    </div>
  );
}
