import { useState } from 'react';
import { useRouter } from 'next/router';
import {
  signInWithEmailAndPassword,
  signInWithPopup
} from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleEmailLogin = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push('/');
    } catch (err) {
      setError('Email login failed: ' + err.message);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      router.push('/');
    } catch (err) {
      setError('Google login failed: ' + err.message);
    }
  };

  const goToSignup = () => router.push('/auth');

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-pink-100 to-purple-200">
      <div className="bg-white p-8 rounded-lg shadow-lg w-96">
        <h2 className="text-2xl font-bold mb-4 text-center text-purple-700">
          Sign In to Sharon's Garden
        </h2>

        {error && (
          <p className="text-red-500 text-sm mb-3 text-center">{error}</p>
        )}

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

        <button
          onClick={handleEmailLogin}
          className="w-full bg-purple-600 text-white py-2 rounded hover:bg-purple-700"
        >
          Sign In
        </button>

        <p className="text-sm text-center mt-4">
          Don&apos;t have an account?{' '}
          <button
            onClick={goToSignup}
            className="text-purple-600 underline"
          >
            Sign Up
          </button>
        </p>

        <div className="border-t my-4" />

        <button
          onClick={handleGoogleLogin}
          className="w-full bg-red-500 text-white py-2 rounded hover:bg-red-600 flex items-center justify-center gap-2"
        >
          <img
            src="/google-icon.svg"
            alt="Google"
            className="w-5 h-5"
          />
          Sign in with Google
        </button>
      </div>
    </div>
  );
}
