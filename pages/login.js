// pages/login.js
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '../lib/firebase';

export default function Login() {
  const router = useRouter();

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      console.log('✅ User signed in:', result.user);
      router.push('/garden/my'); // Redirect to user profile
    } catch (error) {
      console.error('❌ Google login failed:', error.message);
    }
  };

  return (
    <div className="flex flex-col justify-center items-center min-h-screen bg-gradient-to-b from-yellow-50 to-pink-100 text-center p-4">
      <img src="/welcome.png" alt="Welcome" className="w-96 mb-6 rounded-2xl shadow-xl" />
      <h1 className="text-3xl font-bold mb-4">欢迎来到Sharon的心愿花园 🌸</h1>
      <p className="text-md mb-6">一起种下你想被顾顾的情绪吧</p>

      <button
        onClick={handleGoogleLogin}
        className="bg-white text-black px-6 py-3 rounded-full shadow-md hover:bg-gray-100 flex items-center gap-2"
      >
        <img src="/google.svg" alt="Google" className="w-5 h-5" />
        Sign in with Google
      </button>

      {/* Instagram login button (for later) */}
      {/* <button
        onClick={handleInstagramLogin}
        className="mt-4 bg-pink-500 text-white px-6 py-3 rounded-full hover:bg-pink-600"
      >
        Sign in with Instagram
      </button> */}
    </div>
  );
}
