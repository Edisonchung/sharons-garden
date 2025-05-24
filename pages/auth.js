import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup
} from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { FirebaseError } from 'firebase/app';
import { ensureUserDocument } from '../lib/ensureUserDocument'; // ✅

export default function AuthPage() {
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleAuth = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      let userCredential;
      if (isLogin) {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
      } else {
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
      }

      // ✅ Ensure user doc in Firestore
      await ensureUserDocument(userCredential.user);

      router.push('/');
    } catch (err) {
      if (err instanceof FirebaseError) {
        switch (err.code) {
          case 'auth/user-not-found':
            setError('No user found with this email.');
            break;
          case 'auth/wrong-password':
            setError('Incorrect password.');
            break;
          case 'auth/email-already-in-use':
            setError('This email is already registered.');
            break;
          case 'auth/weak-password':
            setError('Password should be at least 6 characters.');
            break;
          default:
            setError('Authentication failed. Please try again.');
        }
      } else {
        setError('Unexpected error. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);

      // ✅ Ensure user doc in Firestore
      await ensureUserDocument(result.user);

      router.push('/');
    } catch (err) {
      console.error(err);
      setError('Google login failed. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  if (!isClient) return <div className="min-h-screen bg-white dark:bg-black" />;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-100 to-pink-100">
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold text-center text-purple-700 mb-4">
          {isLogin ? 'Sign In' : 'Sign Up'} to Sharon's Garden
        </h2>

        {error && <p className="text-red-500 text-sm text-center mb-4">{error}</p>}

        <form onSubmit={handleAuth} className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="Email"
            aria-label="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border border-gray-300 rounded p-2"
            required
            autoFocus
            disabled={loading}
          />
          <input
            type="password"
            placeholder="Password"
            aria-label="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border border-gray-300 rounded p-2"
            required
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-purple-600 hover:bg-purple-700 text-white py-2 rounded"
          >
            {loading ? 'Processing...' : isLogin ? 'Sign In' : 'Sign Up'}
          </button>
        </form>

        <div className="border-t my-4" />

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full bg-red-500 hover:bg-red-600 text-white py-2 rounded flex items-center justify-center gap-2"
        >
          <img src="/google-icon.svg" alt="Google icon" className="w-5 h-5" />
          {loading ? 'Signing in...' : 'Continue with Google'}
        </button>

        <p className="text-center text-sm text-gray-500 mt-4">
          {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="text-purple-600 hover:underline"
            disabled={loading}
          >
            {isLogin ? 'Sign Up' : 'Sign In'}
          </button>
        </p>
      </div>
    </div>
  );
}
